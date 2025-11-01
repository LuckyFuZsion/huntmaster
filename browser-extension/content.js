// Content script to detect game names from casino sites
// This runs on all pages to detect game titles

(function() {
  'use strict';

  // Format provider names properly (handle common cases)
  function formatProviderName(provider) {
    if (!provider) return provider;
    
    // Common provider name patterns that need special handling
    const specialCases = {
      'nolimit': 'NoLimit',
      'pragmatic': 'Pragmatic',
      'playngo': 'Play\'n GO',
      'netent': 'NetEnt',
      'microgaming': 'Microgaming',
      'evolution': 'Evolution',
      'red tiger': 'Red Tiger',
      'push gaming': 'Push Gaming',
      'yggdrasil': 'Yggdrasil',
      'big time gaming': 'Big Time Gaming',
      'relax gaming': 'Relax Gaming',
    };
    
    let formatted = provider.toLowerCase();
    
    // Check for special cases (partial matches)
    for (const [key, value] of Object.entries(specialCases)) {
      if (formatted.includes(key)) {
        // Replace the matching part
        formatted = formatted.replace(key, value);
      }
    }
    
    // For words not in special cases, capitalize first letter of each word
    formatted = formatted.split(/\s+/).map(word => {
      // If word doesn't start with capital (not already formatted), format it
      if (word && word[0] === word[0].toLowerCase()) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      return word;
    }).join(' ');
    
    return formatted;
  }

  // Casino-specific detection logic
  function detectCasino() {
    const hostname = window.location.hostname.toLowerCase();
    const url = window.location.href.toLowerCase();
    
    if (hostname.includes('gamba') || url.includes('gamba')) {
      return 'gamba';
    }
    // Add more casinos here as needed
    // if (hostname.includes('casino2') || url.includes('casino2')) {
    //   return 'casino2';
    // }
    
    return 'generic';
  }

  // Casino-specific title parsers
  function parseTitleForCasino(title, casino) {
    if (casino === 'gamba') {
      // Gamba format: "Game Name by Provider Name - Play Online at Gamba"
      // Example: "Bangkok Hilton by Nolimit City - Play Online at Gamba"
      const gambaPattern = /^(.+?)\s+by\s+(.+?)(?:\s*-\s*Play\s+Online|\s*\|\s*Play\s+Online)/i;
      const match = title.match(gambaPattern);
      if (match) {
        const gameTitle = match[1].trim();
        let provider = match[2].trim();
        // Clean up any trailing separators or text
        provider = provider.replace(/\s*[-|].*$/i, '').trim();
        provider = formatProviderName(provider);
        
        return { title: gameTitle, provider: provider };
      }
      // Fallback: try to match even if format is slightly different
      const fallbackPattern = /^(.+?)\s+by\s+(.+?)(?:\s*-\s*|\s*\|\s*|$)/i;
      const fallbackMatch = title.match(fallbackPattern);
      if (fallbackMatch) {
        const gameTitle = fallbackMatch[1].trim();
        let provider = fallbackMatch[2].trim();
        // Remove trailing parts: " - Play Online at Gamba", " | Play Online At Gamba", etc.
        provider = provider.replace(/\s*[-|]\s*Play\s+Online.*$/i, '').trim();
        provider = provider.replace(/\s*[-|]\s*At\s+.*$/i, '').trim();
        // Remove any remaining pipe or dash separators and text after them
        provider = provider.split(/[-|]/)[0].trim();
        provider = formatProviderName(provider);
        
        return { title: gameTitle, provider: provider };
      }
    }
    
    return null;
  }

  // Helper function to extract number from text (handles currency symbols, commas, etc.)
  function extractNumber(text) {
    if (!text) return null;
    // Remove currency symbols and commas, keep digits and decimal points
    const cleaned = text.replace(/[^\d.,]/g, '').replace(/,/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }

  // Game detection patterns for common casino sites (generic fallback)
  const detectionPatterns = [
    // Page title patterns
    {
      type: 'title',
      patterns: [
        // Format: "Game Name - Provider | Casino"
        /^(.+?)\s*-\s*([^|]+)/,
        // Format: "Game Name | Provider"
        /^(.+?)\s*\|\s*(.+)$/,
        // Format: "Play Game Name - Provider"
        /^Play\s+(.+?)\s*-\s*(.+)$/i,
        // Format: "Game Name Demo"
        /^(.+?)\s+Demo/i,
        // Format: "Game Name Free Play"
        /^(.+?)\s+Free\s+Play/i,
      ]
    },
    // DOM selector patterns
    {
      type: 'dom',
      selectors: [
        '[data-game-name]',
        '[data-game-title]',
        '.game-name',
        '.game-title',
        '.slot-title',
        'h1.game-title',
        'h2.game-title',
        '[class*="game-name"]',
        '[class*="game-title"]',
        '[id*="game-name"]',
        '[id*="game-title"]',
      ]
    },
    // Meta tags
    {
      type: 'meta',
      selectors: [
        'meta[property="og:title"]',
        'meta[name="game-title"]',
        'meta[name="slot-name"]',
      ]
    }
  ];

  function extractGameInfo() {
    const gameInfo = {
      title: null,
      provider: null,
      source: null,
      stake: null,
      winAmount: null
    };

    // Detect which casino site we're on
    const casino = detectCasino();
    
    // Try title-based detection first
    const pageTitle = document.title.trim();
    if (pageTitle) {
      // Try casino-specific parser first
      const casinoSpecific = parseTitleForCasino(pageTitle, casino);
      if (casinoSpecific && casinoSpecific.title) {
        gameInfo.title = casinoSpecific.title;
        gameInfo.provider = casinoSpecific.provider || null;
        gameInfo.source = `page-title-${casino}`;
      } else {
        // Fall back to generic patterns
        for (const pattern of detectionPatterns[0].patterns) {
          const match = pageTitle.match(pattern);
          if (match) {
            gameInfo.title = match[1].trim();
            if (match[2]) {
              // Try to extract provider
              const providerMatch = match[2].match(/^(.+?)(?:\s*\||\s*-\s*|$)/);
              if (providerMatch) {
                gameInfo.provider = providerMatch[1].trim();
              }
            }
            gameInfo.source = 'page-title';
            break;
          }
        }
      }
      
      // If no pattern matched but title exists and looks like a game, use it
      if (!gameInfo.title && pageTitle.length < 100 && !pageTitle.includes('Casino') && !pageTitle.includes('Home')) {
        // Simple heuristic: if title doesn't contain common non-game words, assume it's a game
        const commonWords = ['login', 'register', 'deposit', 'withdraw', 'account', 'help', 'support'];
        const lowerTitle = pageTitle.toLowerCase();
        if (!commonWords.some(word => lowerTitle.includes(word))) {
          gameInfo.title = pageTitle;
          gameInfo.source = 'page-title-fallback';
        }
      }
    }

    // Try DOM selectors
    if (!gameInfo.title) {
      for (const selector of detectionPatterns[1].selectors) {
        try {
          const element = document.querySelector(selector);
          if (element) {
            const text = element.textContent?.trim() || element.getAttribute('data-game-name') || element.getAttribute('data-game-title');
            if (text && text.length < 100) {
              gameInfo.title = text;
              gameInfo.source = 'dom-selector';
              break;
            }
          }
        } catch (e) {
          // Ignore selector errors
        }
      }
    }

    // Try meta tags
    if (!gameInfo.title) {
      for (const selector of detectionPatterns[2].selectors) {
        try {
          const element = document.querySelector(selector);
          if (element) {
            const content = element.getAttribute('content') || element.getAttribute('value');
            if (content && content.length < 100) {
              gameInfo.title = content;
              gameInfo.source = 'meta-tag';
              break;
            }
          }
        } catch (e) {
          // Ignore selector errors
        }
      }
    }

    // Try to find provider in page if not found
    if (gameInfo.title && !gameInfo.provider) {
      const providerSelectors = [
        '[data-provider]',
        '[data-game-provider]',
        '.provider',
        '.game-provider',
        '[class*="provider"]',
        'meta[name="game-provider"]',
        'meta[name="provider"]',
      ];

      for (const selector of providerSelectors) {
        try {
          const element = document.querySelector(selector);
          if (element) {
            const provider = element.textContent?.trim() || 
                           element.getAttribute('data-provider') || 
                           element.getAttribute('data-game-provider') ||
                           element.getAttribute('content');
            if (provider && provider.length < 50) {
              gameInfo.provider = provider;
              break;
            }
          }
        } catch (e) {
          // Ignore selector errors
        }
      }
    }

    // Try to detect stake and win amounts from the page
    // Common patterns for stake/bet: "Bet:", "Stake:", "Total Bet:", etc.
    const stakeSelectors = [
      '[data-bet]',
      '[data-stake]',
      '[data-amount]',
      '.bet-amount',
      '.stake-amount',
      '.total-bet',
      '[class*="bet"]',
      '[class*="stake"]',
      '[id*="bet"]',
      '[id*="stake"]',
    ];

    // Also search for text patterns like "Bet: £10.00" or "Stake: $5"
    const textPatterns = [
      { pattern: /bet[:\s]+([£$€]?[\d,]+\.?\d*)/i, type: 'stake' },
      { pattern: /stake[:\s]+([£$€]?[\d,]+\.?\d*)/i, type: 'stake' },
      { pattern: /total\s+bet[:\s]+([£$€]?[\d,]+\.?\d*)/i, type: 'stake' },
      { pattern: /win[:\s]+([£$€]?[\d,]+\.?\d*)/i, type: 'win' },
      { pattern: /payout[:\s]+([£$€]?[\d,]+\.?\d*)/i, type: 'win' },
      { pattern: /total\s+win[:\s]+([£$€]?[\d,]+\.?\d*)/i, type: 'win' },
      { pattern: /winnings[:\s]+([£$€]?[\d,]+\.?\d*)/i, type: 'win' },
    ];

    // First try selectors
    for (const selector of stakeSelectors) {
      try {
        const element = document.querySelector(selector);
        if (element) {
          const text = element.textContent?.trim() || element.getAttribute('data-bet') || element.getAttribute('data-stake');
          if (text) {
            const num = extractNumber(text);
            if (num !== null && num > 0) {
              gameInfo.stake = num;
              break;
            }
          }
        }
      } catch (e) {
        // Ignore selector errors
      }
    }

    // Then try text patterns in the document
    if (!gameInfo.stake || !gameInfo.winAmount) {
      const bodyText = document.body.textContent || '';
      for (const { pattern, type } of textPatterns) {
        const matches = bodyText.match(pattern);
        if (matches && matches[1]) {
          const num = extractNumber(matches[1]);
          if (num !== null && num > 0) {
            if (type === 'stake' && !gameInfo.stake) {
              gameInfo.stake = num;
            } else if (type === 'win' && !gameInfo.winAmount) {
              gameInfo.winAmount = num;
            }
          }
        }
      }
    }

    // Common patterns for win amount: "Win:", "Total Win:", "Payout:", etc.
    const winSelectors = [
      '[data-win]',
      '[data-payout]',
      '[data-win-amount]',
      '.win-amount',
      '.payout-amount',
      '.total-win',
      '[class*="win"]',
      '[class*="payout"]',
      '[id*="win"]',
      '[id*="payout"]',
    ];

    for (const selector of winSelectors) {
      try {
        const element = document.querySelector(selector);
        if (element) {
          const text = element.textContent?.trim() || element.getAttribute('data-win') || element.getAttribute('data-payout');
          if (text) {
            const num = extractNumber(text);
            if (num !== null && num >= 0) {
              gameInfo.winAmount = num;
              break;
            }
          }
        }
      } catch (e) {
        // Ignore selector errors
      }
    }

    return gameInfo;
  }

    // Send game info to background script
  function sendGameInfo() {
    const gameInfo = extractGameInfo();
    // Store in background for popup access
    chrome.runtime.sendMessage({
      type: 'GAME_DETECTED',
      data: gameInfo
    }).catch(() => {
      // Ignore errors if background script not ready
    });
  }

  // Detect on page load (with slight delay to let page load)
  setTimeout(sendGameInfo, 500);

  // Watch for title changes (some casino sites load games dynamically)
  let lastTitle = document.title;
  const titleObserver = new MutationObserver(() => {
    if (document.title !== lastTitle) {
      lastTitle = document.title;
      setTimeout(sendGameInfo, 500); // Debounce
    }
  });

  titleObserver.observe(document.querySelector('title') || document.head, {
    childList: true,
    subtree: true,
    characterData: true
  });

  // Watch for DOM changes that might indicate game loaded
  const domObserver = new MutationObserver(() => {
    setTimeout(sendGameInfo, 1000); // Debounce DOM changes
  });

  domObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['data-game-name', 'data-game-title', 'class']
  });

  // Listen for requests from extension
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'HUNTMASTER_GET_GAME_INFO') {
      const gameInfo = extractGameInfo();
      sendResponse({ gameInfo });
      return true; // Keep channel open for async response
    }
  });
})();

