// Content script to detect game names from casino sites
// This runs on all pages to detect game titles

(function() {
  'use strict';

  // Format provider names properly (handle common cases)
  function formatProviderName(provider) {
    if (!provider) return provider;
    
    // Common provider name patterns that need special handling
    const specialCases = {
      'nlc': 'NoLimit City', // NLC is abbreviation for NoLimit City
      'nolimit': 'NoLimit City', // Full name variant
      'nolimit city': 'NoLimit City',
      'pragmatic play': 'Pragmatic Play', // Full name
      'pragmatic-play': 'Pragmatic Play', // URL format
      'pragmatic': 'Pragmatic Play', // Short name maps to full name
      'playngo': 'Play\'n GO',
      'play\'n go': 'Play\'n GO',
      'netent': 'NetEnt',
      'net entertainment': 'NetEnt',
      'microgaming': 'Microgaming',
      'evolution': 'Evolution',
      'red tiger': 'Red Tiger',
      'push gaming': 'Push Gaming',
      'yggdrasil': 'Yggdrasil',
      'big time gaming': 'Big Time Gaming',
      'relax gaming': 'Relax Gaming',
    };
    
    let formatted = provider.toLowerCase().trim();
    
    // Check for exact matches first (handles "NLC", "nlc", etc.)
    if (specialCases[formatted]) {
      return specialCases[formatted];
    }
    
    // Check for special cases (partial matches)
    // Sort by key length (longest first) to match "nolimit city" before "nolimit"
    const sortedCases = Object.entries(specialCases).sort((a, b) => b[0].length - a[0].length);
    for (const [key, value] of sortedCases) {
      if (formatted.includes(key)) {
        // Replace the matching part with the formatted value
        formatted = formatted.replace(key, value);
        // Return early with the formatted value
        return value;
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

  // Convert a slug like "pirates-plenty" into "Pirates Plenty"
  function slugToTitle(slug) {
    if (!slug) return null;
    return slug
      .split('-')
      .filter(Boolean)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      .trim();
  }

  // Parse bc.game URLs of the form https://bc.game/game/{game-slug}-by-{provider-slug}
  function parseBcGameFromUrl(url) {
    if (!url) return null;
    const match = url.toLowerCase().match(/bc\.game\/game\/([^/?#]+)/);
    if (!match || !match[1]) return null;

    const slugPart = match[1];
    const [gameSlug, providerSlug] = slugPart.split('-by-');
    if (!gameSlug) return null;

    const title = slugToTitle(gameSlug);
    const provider = providerSlug ? formatProviderName(providerSlug.replace(/-/g, ' ')) : null;

    if (!title) return null;
    return { title, provider };
  }

  // Casino-specific detection logic
  function detectCasino() {
    const hostname = window.location.hostname.toLowerCase();
    const url = window.location.href.toLowerCase();
    
    if (hostname.includes('bc.game') || url.includes('bc.game/game')) {
      return 'bcgame';
    }
    if (hostname.includes('gamba') || url.includes('gamba')) {
      return 'gamba';
    }
    if (hostname.includes('cryptocasino') || url.includes('cryptocasino')) {
      return 'cryptocasino';
    }
    // Add more casinos here as needed
    
    return 'generic';
  }

  // Casino-specific title parsers
  function parseTitleForCasino(title, casino) {
    if (casino === 'bcgame') {
      // Prefer parsing directly from URL structure
      const fromUrl = parseBcGameFromUrl(window.location.href);
      if (fromUrl) {
        return { title: fromUrl.title, provider: fromUrl.provider || null };
      }
    }

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
    
    if (casino === 'cryptocasino') {
      // CryptoCasino URL format: /casino/pragmatic-play/big-bass-halloween-2/demo
      // Extract provider from URL path (second segment after /casino/)
      const urlPath = window.location.pathname.toLowerCase();
      const urlMatch = urlPath.match(/\/casino\/([^\/]+)\//);
      let providerFromUrl = null;
      if (urlMatch && urlMatch[1]) {
        // Convert "pragmatic-play" to "Pragmatic Play"
        providerFromUrl = urlMatch[1]
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        providerFromUrl = formatProviderName(providerFromUrl);
      }
      
      // First, handle titles with "by | CryptoCasino.com" suffix - remove it
      // Pattern: "Game Name by | CryptoCasino.com" or "Game Name - Provider by | CryptoCasino.com"
      // Handles variations with different spacing: "by |", "by|", "by|", etc.
      const cryptocasinoSuffixPattern = /^(.+?)\s+by\s*\|\s*CryptoCasino(?:\.com)?.*$/i;
      const cryptocasinoSuffixMatch = title.match(cryptocasinoSuffixPattern);
      if (cryptocasinoSuffixMatch) {
        let cleanedTitle = cryptocasinoSuffixMatch[1].trim();
        
        // Reject if cleaned title is clearly just a domain name
        const titleLower = cleanedTitle.toLowerCase();
        if (titleLower.match(/^[a-z0-9-]+\.(com|net|org)$/) || 
            titleLower === 'cryptocasino' ||
            titleLower === 'casino') {
          // Not a valid game title, skip this pattern
          return null;
        }
        
        // If we have provider from URL, be very careful about splitting on dashes
        // Only split if the part after dash is clearly a known provider name
        // Otherwise, treat the entire title as the game name (e.g., "Zeus vs Hades - Gods of War" -> full title)
        if (providerFromUrl) {
          // Check if there's a dash in the title
          const providerSepPattern = /^(.+?)\s*-\s*(.+)$/;
          const providerSepMatch = cleanedTitle.match(providerSepPattern);
          if (providerSepMatch) {
            const potentialProvider = providerSepMatch[2].trim();
            const formattedProvider = formatProviderName(potentialProvider);
            
            // Known provider names (check against formatted version)
            const knownProviderNames = [
              'pragmatic play', 'nolimit city', 'play\'n go', 'netent', 'microgaming',
              'evolution', 'red tiger', 'push gaming', 'yggdrasil', 'big time gaming', 'relax gaming',
              'thunderkick', 'quickspin', 'blueprint', 'hacksaw', 'kalamba', 'nucleus'
            ];
            
            const potentialProviderLower = formattedProvider.toLowerCase();
            const isKnownProvider = knownProviderNames.some(known => 
              potentialProviderLower === known || 
              potentialProviderLower.includes(known) ||
              known.includes(potentialProviderLower)
            );
            
            // Also check if it's a very short single word (likely part of game name like "Day" in "D-Day")
            const isShortSingleWord = potentialProvider.length < 8 && !potentialProvider.includes(' ');
            
            if (isKnownProvider && !isShortSingleWord) {
              // It's a known provider, split on dash
              const gameTitle = providerSepMatch[1].trim();
              return { title: gameTitle, provider: formattedProvider };
            } else {
              // Not a known provider - treat entire title as game name (e.g., "Zeus vs Hades - Gods of War")
              return { title: cleanedTitle, provider: providerFromUrl };
            }
          } else {
            // No dash in title - use entire title as game name
            return { title: cleanedTitle, provider: providerFromUrl };
          }
        } else {
          // No provider from URL, try to extract from title
          const providerSepPattern = /^(.+?)\s*-\s*(.+)$/;
          const providerSepMatch = cleanedTitle.match(providerSepPattern);
          if (providerSepMatch) {
            // Title has provider separated by dash
            const gameTitle = providerSepMatch[1].trim();
            let provider = providerSepMatch[2].trim();
            provider = formatProviderName(provider);
            return { title: gameTitle, provider: provider };
          } else {
            // No provider in title
            return { title: cleanedTitle, provider: null };
          }
        }
      }
      
      // CryptoCasino format: "Play Game Name" or "Play Game Name for free." or "Play Game Name - Provider for free."
      // Handle titles starting with "Play" - remove the "Play" prefix
      if (title.match(/^Play\s+/i)) {
        // Pattern with provider: "Play Game Name - Provider" or "Play Game Name - Provider for free"
        const withProviderPattern = /^Play\s+(.+?)\s*-\s*(.+?)(?:\s+for\s+free.*?|$)/i;
        const withProviderMatch = title.match(withProviderPattern);
        if (withProviderMatch) {
          const gameTitle = withProviderMatch[1].trim();
          let provider = withProviderMatch[2].trim();
          // Remove "for free" or any trailing text
          provider = provider.replace(/\s+for\s+free.*$/i, '').trim();
          
          // If we have provider from URL and the extracted provider looks like a game name (short, single word),
          // use the provider from URL instead and keep the full title as game name
          if (providerFromUrl && provider.length < 15 && !provider.includes(' ')) {
            // Likely a game name with dash (e.g., "D-Day"), use provider from URL
            const fullTitle = `${gameTitle} - ${provider}`;
            return { title: fullTitle, provider: providerFromUrl };
          } else {
            // Normal case: provider in title
            provider = formatProviderName(provider);
            return { title: gameTitle, provider: provider };
          }
        }
        
        // Pattern without provider: "Play Game Name" or "Play Game Name for free."
        const withoutProviderPattern = /^Play\s+(.+?)(?:\s+for\s+free.*?|$)/i;
        const withoutProviderMatch = title.match(withoutProviderPattern);
        if (withoutProviderMatch) {
          let gameTitle = withoutProviderMatch[1].trim();
          // Remove trailing period and "for free"
          gameTitle = gameTitle.replace(/\.$/, '').replace(/\s+for\s+free$/i, '').trim();
          // Use provider from URL if available
          return { title: gameTitle, provider: providerFromUrl };
        }
        
        // Fallback: if nothing else matched, just remove "Play" prefix and return the rest
        const simplePlayPattern = /^Play\s+(.+)$/i;
        const simplePlayMatch = title.match(simplePlayPattern);
        if (simplePlayMatch) {
          const gameTitle = simplePlayMatch[1].trim();
          return { title: gameTitle, provider: providerFromUrl };
        }
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

  // List of invalid game names that should never be detected as games
  const INVALID_GAME_NAMES = [
    'casino', 'casinos', 'cryptocasino', 'gamba',
    'home', 'lobby', 'main', 'index', 'welcome',
    'login', 'register', 'sign in', 'sign up',
    'account', 'profile', 'settings', 'help', 'support',
    'deposit', 'withdraw', 'cashier', 'banking',
    'promotions', 'bonuses', 'vip', 'rewards',
    'terms', 'privacy', 'about', 'contact'
  ];

  // Check if a game title is invalid (generic casino terms, etc.)
  function isValidGameTitle(title) {
    if (!title || !title.trim()) return false;
    
    const titleLower = title.toLowerCase().trim();
    
    // Check against invalid names list (exact match)
    if (INVALID_GAME_NAMES.includes(titleLower)) {
      return false;
    }
    
    // Check if title CONTAINS invalid casino terms (not just exact match)
    const casinoTerms = [
      'casino', 'casinos', 'cryptocasino', 'gamba',
      'home', 'lobby', 'main', 'index', 'welcome',
      'login', 'register', 'sign in', 'sign up',
      'account', 'profile', 'settings', 'help', 'support',
      'deposit', 'withdraw', 'cashier', 'banking',
      'promotions', 'bonuses', 'vip', 'rewards',
      'terms', 'privacy', 'about', 'contact',
      'online casino', 'play online', 'free play', 'demo play'
    ];
    
    // If title contains any casino term as a whole word, reject it
    for (const term of casinoTerms) {
      // Use word boundary regex to match whole words only
      const regex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(titleLower)) {
        console.log('[HuntMaster Extension] Rejected title containing casino term:', term, 'in:', title);
        return false;
      }
    }
    
    // Check if title is just a domain name
    if (titleLower.match(/^[a-z0-9-]+\.(com|net|org|io)$/)) {
      return false;
    }
    
    // Check if title is too short (likely not a game name)
    if (titleLower.length < 3) {
      return false;
    }
    
    // Check if title is just common casino words
    const commonCasinoWords = ['play', 'game', 'slot', 'casino', 'online'];
    if (commonCasinoWords.includes(titleLower)) {
      return false;
    }
    
    // Reject if title looks like a page title (contains "|" or " - " with common page terms)
    if (titleLower.includes('|') || titleLower.includes(' - ')) {
      const pageTerms = ['home', 'lobby', 'casino', 'games', 'slots', 'live casino', 'sports'];
      const hasPageTerm = pageTerms.some(term => titleLower.includes(term));
      if (hasPageTerm) {
        console.log('[HuntMaster Extension] Rejected title that looks like a page title:', title);
        return false;
      }
    }
    
    return true;
  }

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

    // For bc.game, parse directly from URL before trying titles/DOM
    if (casino === 'bcgame') {
      const bcGameInfo = parseBcGameFromUrl(window.location.href);
      if (bcGameInfo && bcGameInfo.title && isValidGameTitle(bcGameInfo.title)) {
        gameInfo.title = bcGameInfo.title;
        gameInfo.provider = bcGameInfo.provider || null;
        gameInfo.source = 'bcgame-url';
        // Still fall through to allow additional data (stake/win) detection
      }
    }
    
    // Try title-based detection first
    const pageTitle = document.title.trim();
    if (pageTitle) {
      // Try casino-specific parser first
      const casinoSpecific = parseTitleForCasino(pageTitle, casino);
      if (casinoSpecific && casinoSpecific.title) {
        // Validate the extracted title using the comprehensive validation function
        if (isValidGameTitle(casinoSpecific.title)) {
          gameInfo.title = casinoSpecific.title;
          gameInfo.provider = casinoSpecific.provider || null;
          gameInfo.source = `page-title-${casino}`;
        }
      }
      
      // If casino-specific parser didn't find a valid game, fall back to generic patterns
      if (!gameInfo.title) {
        // Fall back to generic patterns
        for (const pattern of detectionPatterns[0].patterns) {
          const match = pageTitle.match(pattern);
          if (match) {
            const extractedTitle = match[1].trim();
            // Validate the extracted title before using it
            if (isValidGameTitle(extractedTitle)) {
              gameInfo.title = extractedTitle;
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
      }
      
      // If no pattern matched but title exists and looks like a game, use it
      if (!gameInfo.title && pageTitle.length < 100 && !pageTitle.includes('Casino') && !pageTitle.includes('Home')) {
        // Simple heuristic: if title doesn't contain common non-game words, assume it's a game
        const commonWords = ['login', 'register', 'deposit', 'withdraw', 'account', 'help', 'support'];
        const lowerTitle = pageTitle.toLowerCase();
        if (!commonWords.some(word => lowerTitle.includes(word)) && isValidGameTitle(pageTitle)) {
          gameInfo.title = pageTitle;
          gameInfo.source = 'page-title-fallback';
        }
      }
      
      // Final safety check: For CryptoCasino, remove "Play" prefix from any extracted title if present
      if (casino === 'cryptocasino' && gameInfo.title && gameInfo.title.match(/^Play\s+/i)) {
        gameInfo.title = gameInfo.title.replace(/^Play\s+/i, '').trim();
      }
    }

    // Try DOM selectors
    if (!gameInfo.title) {
      for (const selector of detectionPatterns[1].selectors) {
        try {
          const element = document.querySelector(selector);
          if (element) {
            let text = element.textContent?.trim() || element.getAttribute('data-game-name') || element.getAttribute('data-game-title');
            if (text && text.length < 100) {
              // For CryptoCasino, remove "Play" prefix if present
              if (casino === 'cryptocasino' && text.match(/^Play\s+/i)) {
                text = text.replace(/^Play\s+/i, '').trim();
              }
              // Validate the extracted title
              if (isValidGameTitle(text)) {
                gameInfo.title = text;
                gameInfo.source = 'dom-selector';
                break;
              }
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
            let content = element.getAttribute('content') || element.getAttribute('value');
            if (content && content.length < 100) {
              // For CryptoCasino, remove "Play" prefix if present
              if (casino === 'cryptocasino' && content.match(/^Play\s+/i)) {
                content = content.replace(/^Play\s+/i, '').trim();
              }
              // Validate the extracted title
              if (isValidGameTitle(content)) {
                gameInfo.title = content;
                gameInfo.source = 'meta-tag';
                break;
              }
            }
          }
        } catch (e) {
          // Ignore selector errors
        }
      }
    }

    // Try to find provider in page if not found
    if (gameInfo.title && !gameInfo.provider) {
      // Casino-specific provider detection
      if (casino === 'cryptocasino') {
        // First try to extract from URL path
        const urlPath = window.location.pathname.toLowerCase();
        const urlMatch = urlPath.match(/\/casino\/([^\/]+)\//);
        if (urlMatch && urlMatch[1]) {
          // Convert "pragmatic-play" to "Pragmatic Play"
          const providerFromUrl = urlMatch[1]
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          gameInfo.provider = formatProviderName(providerFromUrl);
        }
        
        // If still no provider, try DOM selectors
        if (!gameInfo.provider) {
          // CryptoCasino-specific selectors (add more as needed based on actual page structure)
          const cryptocasinoSelectors = [
            '[data-provider]',
            '[data-game-provider]',
            '.provider',
            '.game-provider',
            '.slot-provider',
            '[class*="provider"]',
            '[class*="Provider"]',
            '[id*="provider"]',
            '[id*="Provider"]',
            'meta[name="game-provider"]',
            'meta[name="provider"]',
            'meta[property="og:game:provider"]',
            // Look for text patterns like "Provider: Pragmatic Play" or "by Pragmatic Play"
            '[class*="info"]',
            '[class*="details"]',
            '[class*="meta"]',
          ];

          for (const selector of cryptocasinoSelectors) {
            try {
              const elements = document.querySelectorAll(selector);
              for (const element of elements) {
                const text = element.textContent?.trim() || 
                             element.getAttribute('data-provider') || 
                             element.getAttribute('data-game-provider') ||
                             element.getAttribute('content');
                if (text && text.length < 50 && text.length > 2) {
                  // Try to extract provider from text patterns like "Provider: Pragmatic Play"
                  const providerMatch = text.match(/(?:provider|by)[:\s]+(.+)/i);
                  if (providerMatch && providerMatch[1]) {
                    const extracted = providerMatch[1].trim().split(/[\n\r,]/)[0].trim();
                    if (extracted && extracted.length < 50) {
                      gameInfo.provider = formatProviderName(extracted);
                      break;
                    }
                  }
                  // If text looks like a provider name (doesn't contain common non-provider words)
                  const lowerText = text.toLowerCase();
                  if (!lowerText.includes('game') && 
                      !lowerText.includes('slot') && 
                      !lowerText.includes('play') &&
                      !lowerText.includes('free') &&
                      !lowerText.includes('demo')) {
                    gameInfo.provider = formatProviderName(text);
                    break;
                  }
                }
              }
              if (gameInfo.provider) break;
            } catch (e) {
              // Ignore selector errors
            }
          }

          // Also try searching page text for "by Provider" pattern near game title
          if (!gameInfo.provider) {
            const bodyText = document.body.textContent || '';
            // Look for patterns like "by Pragmatic Play" or "Provider: Pragmatic Play"
            const byPattern = /by\s+([A-Z][a-zA-Z\s]+?)(?:\s|$|,|\.)/g;
            const providerMatch = bodyText.match(byPattern);
            if (providerMatch && providerMatch[0]) {
              const provider = providerMatch[0].replace(/^by\s+/i, '').trim().split(/[\s,\.]/)[0];
              if (provider && provider.length > 2 && provider.length < 50) {
                gameInfo.provider = formatProviderName(provider);
              }
            }
          }
        }
      } else {
        // Generic provider detection for other casinos
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
                gameInfo.provider = formatProviderName(provider);
                break;
              }
            }
          } catch (e) {
            // Ignore selector errors
          }
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
    // Check if extension runtime is still valid
    try {
      // Safely check if chrome.runtime exists and is valid
      // Accessing chrome.runtime.id can throw if context is invalidated
      let runtimeValid = false;
      try {
        runtimeValid = !!(chrome.runtime && chrome.runtime.id);
      } catch (e) {
        // Extension context invalidated, stop trying to send messages
        return;
      }
      
      if (!runtimeValid) {
        // Extension context invalidated, stop trying to send messages
        return;
      }
      
      const gameInfo = extractGameInfo();
      console.log('[HuntMaster Extension] Detected game info:', gameInfo);
      console.log('[HuntMaster Extension] Page title:', document.title);
      console.log('[HuntMaster Extension] Casino detected:', detectCasino());
      // Store in background for popup access
      chrome.runtime.sendMessage({
        type: 'GAME_DETECTED',
        data: gameInfo
      }, (response) => {
        // Check for errors
        if (chrome.runtime.lastError) {
          // Extension context invalidated or other error
          // Silently fail - extension may have been reloaded
          console.log('[HuntMaster Extension] Error sending message:', chrome.runtime.lastError.message);
          return;
        }
        console.log('[HuntMaster Extension] Message sent successfully, response:', response);
      });
    } catch (error) {
      // Extension context invalidated - this happens when extension is reloaded
      console.error('[HuntMaster Extension] Error in sendGameInfo:', error);
      return;
    }
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
      try {
        const gameInfo = extractGameInfo();
        sendResponse({ gameInfo });
      } catch (error) {
        sendResponse({ error: error.message });
      }
      return true; // Keep channel open for async response
    }
    // Return false if we don't handle the message to avoid async response warning
    return false;
  });
})();

