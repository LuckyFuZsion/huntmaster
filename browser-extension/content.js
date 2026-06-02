// Content script to detect game names from casino sites
// This runs only on whitelisted casino domains

(function() {
  'use strict';

  // Early exit if not on a whitelisted casino domain
  const hostname = window.location.hostname.toLowerCase();
  const url = window.location.href.toLowerCase();
  
  const isWhitelisted = 
    hostname.includes('bc.game') || url.includes('bc.game/game') ||
    hostname.includes('videoslots') || url.includes('videoslots.com/play') ||
    hostname.includes('vave') || url.includes('vave.com/casino/game') || url.includes('vave.com/live-casino/game') ||
    hostname.includes('gamba') || url.includes('gamba') ||
    hostname.includes('cryptocasino') || url.includes('cryptocasino') ||
    hostname.includes('casinodupuerto') || url.includes('casinodupuerto.com/casino/game');
  
  if (!isWhitelisted) {
    return; // Not a whitelisted casino, exit early
  }

  // Format provider names properly (handle common cases)
  function formatProviderName(provider) {
    if (!provider) return provider;
    
    // Common provider name patterns that need special handling
    const specialCases = {
      'nlc': 'NoLimit City', // NLC is abbreviation for NoLimit City
      'nolimit': 'NoLimit City', // Full name variant
      'nolimit city': 'NoLimit City',
      'nolimit-city': 'NoLimit City', // URL format
      'pragmatic play': 'Pragmatic Play', // Full name
      'pragmatic-play': 'Pragmatic Play', // URL format
      'pragmatic': 'Pragmatic Play', // Short name maps to full name
      'playngo': 'Play\'n GO',
      'play\'n go': 'Play\'n GO',
      'play-n-go': 'Play\'n GO', // Videoslots URL format
      'netent': 'NetEnt',
      'net entertainment': 'NetEnt',
      'microgaming': 'Microgaming',
      'evolution': 'Evolution',
      'red tiger': 'Red Tiger',
      'red-tiger': 'Red Tiger', // URL format
      'push gaming': 'Push Gaming',
      'push-gaming': 'Push Gaming', // URL format
      'yggdrasil': 'Yggdrasil',
      'big time gaming': 'Big Time Gaming',
      'big-time-gaming': 'Big Time Gaming', // URL format
      'relax gaming': 'Relax Gaming',
      'relax-gaming': 'Relax Gaming', // URL format
      'net entertainment': 'NetEnt',
      'net-entertainment': 'NetEnt', // URL format
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
  // Also handles version numbers at the end (e.g., "phoenixduelreels94" -> "Phoenix Duelreels")
  function slugToTitle(slug) {
    if (!slug) return null;
    
    // Strip trailing 2-3 digit version numbers (common pattern like "94", "100", "202")
    // But keep single digits (could be "Game 2") and longer numbers (could be "2024", "1000")
    let cleanedSlug = slug;
    const versionNumberMatch = cleanedSlug.match(/^(.+?)(\d{2,3})$/);
    if (versionNumberMatch) {
      const baseName = versionNumberMatch[1];
      const versionDigits = versionNumberMatch[2];
      
      // Only strip if the base name is at least 3 characters (reasonable game name)
      // and the version is 2-3 digits (common version pattern)
      if (baseName.length >= 3 && versionDigits.length >= 2 && versionDigits.length <= 3) {
        cleanedSlug = baseName;
      }
    }
    
    return cleanedSlug
      .split('-')
      .filter(Boolean)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      .trim();
  }

  // Known provider slugs (with dashes) - ordered by length (longest first) to match multi-word providers first
  // This is used across all casino parsers to correctly identify multi-word providers
  const KNOWN_PROVIDER_SLUGS = [
    'play-n-go',          // Play'n GO
    'pragmatic-play',     // Pragmatic Play
    'nolimit-city',       // NoLimit City
    'red-tiger',          // Red Tiger
    'push-gaming',        // Push Gaming
    'big-time-gaming',    // Big Time Gaming
    'relax-gaming',       // Relax Gaming
    'net-entertainment',  // NetEnt
    'nolimit',            // NoLimit City (short)
    'pragmatic',          // Pragmatic Play (short)
    'playngo',            // Play'n GO (no dashes)
    'netent',             // NetEnt (no dashes)
    'microgaming',        // Microgaming
    'evolution',          // Evolution
    'yggdrasil',          // Yggdrasil
  ];

  // Extract provider slug from a combined slug string (e.g., "game-name-play-n-go")
  // Returns { gameSlug, providerSlug } or null if extraction fails
  function extractProviderFromSlug(slugPart) {
    if (!slugPart) return null;

    // Try to match known provider slugs from the end of the URL
    for (const providerPattern of KNOWN_PROVIDER_SLUGS) {
      // Check if the slug ends with this provider pattern
      if (slugPart.endsWith(providerPattern)) {
        // Extract the provider and game parts
        const providerStartIndex = slugPart.length - providerPattern.length;
        // Make sure there's a dash before the provider (or it's at the start)
        if (providerStartIndex === 0 || slugPart[providerStartIndex - 1] === '-') {
          const gameSlug = slugPart.substring(0, providerStartIndex > 0 ? providerStartIndex - 1 : 0);
          const providerSlug = providerPattern;
          return { gameSlug, providerSlug };
        }
      }
    }
    
    // If no known provider matched, fall back to splitting on the last dash
    const lastDashIndex = slugPart.lastIndexOf('-');
    if (lastDashIndex === -1) {
      // No dash found, treat entire slug as game name
      return { gameSlug: slugPart, providerSlug: null };
    }
    
    const gameSlug = slugPart.substring(0, lastDashIndex);
    const providerSlug = slugPart.substring(lastDashIndex + 1);
    return { gameSlug, providerSlug };
  }

  // Parse bc.game URLs of the form https://bc.game/game/{game-slug}-by-{provider-slug}
  function parseBcGameFromUrl(url) {
    if (!url) return null;
    const match = url.toLowerCase().match(/bc\.game\/game\/([^/?#]+)/);
    if (!match || !match[1]) return null;

    const slugPart = match[1];
    const parts = slugPart.split('-by-');
    if (parts.length < 2 || !parts[0]) return null;

    const gameSlug = parts[0];
    // Everything after "-by-" is the provider slug (may contain multiple dashes for multi-word providers)
    const providerSlug = parts.slice(1).join('-by-');

    const title = slugToTitle(gameSlug);
    // formatProviderName already handles multi-word providers like "play-n-go" correctly
    const provider = providerSlug ? formatProviderName(providerSlug.replace(/-/g, ' ')) : null;

    if (!title) return null;
    return { title, provider };
  }

  // Parse Videoslots URLs of the form https://www.videoslots.com/play/{game-slug}-{provider-slug}/
  function parseVideoslotsFromUrl(url) {
    if (!url) return null;
    const match = url.toLowerCase().match(/videoslots\.com\/play\/([^/?#]+)/);
    if (!match || !match[1]) return null;

    const slugPart = match[1];
    
    // Use shared function to extract provider from slug
    const extracted = extractProviderFromSlug(slugPart);
    if (!extracted) {
      // No valid extraction, treat entire slug as game name
      const title = slugToTitle(slugPart);
      if (!title) return null;
      return { title, provider: null };
    }

    const { gameSlug, providerSlug } = extracted;
    const title = slugToTitle(gameSlug);
    const provider = providerSlug ? formatProviderName(providerSlug.replace(/-/g, ' ')) : null;

    if (!title) return null;
    return { title, provider };
  }

  // Parse Vave URLs of the form:
  // https://vave.com/casino/game/{provider-slug}/{game-slug}
  // https://vave.com/live-casino/game/{provider-slug}/{game-slug}
  function parseVaveFromUrl(url) {
    if (!url) return null;
    // Match both /casino/game/ and /live-casino/game/ patterns
    const match = url.toLowerCase().match(/vave\.com\/(?:casino|live-casino)\/game\/([^/?#]+)\/([^/?#]+)/);
    if (!match || !match[1] || !match[2]) return null;

    const providerSlug = match[1];
    const gameSlug = match[2];

    const title = slugToTitle(gameSlug);
    const provider = providerSlug ? formatProviderName(providerSlug.replace(/-/g, ' ')) : null;

    if (!title) return null;
    return { title, provider };
  }

  // Parse Casino Du Puerto URLs: https://casinodupuerto.com/casino/game/{game-slug}
  function parseCasinoDuPuertoFromUrl(url) {
    if (!url) return null;
    const match = url.toLowerCase().match(/casinodupuerto\.com\/casino\/game\/([^/?#]+)/);
    if (!match || !match[1]) return null;

    const gameSlug = match[1];
    const title = slugToTitle(gameSlug);

    if (!title) return null;
    return { title, provider: null };
  }

  // Casino-specific detection logic
  function detectCasino() {
    const hostname = window.location.hostname.toLowerCase();
    const url = window.location.href.toLowerCase();
    
    if (hostname.includes('bc.game') || url.includes('bc.game/game')) {
      return 'bcgame';
    }
    if (hostname.includes('videoslots') || url.includes('videoslots.com/play')) {
      return 'videoslots';
    }
    if (hostname.includes('vave') || url.includes('vave.com/casino/game') || url.includes('vave.com/live-casino/game')) {
      return 'vave';
    }
    if (hostname.includes('gamba') || url.includes('gamba')) {
      return 'gamba';
    }
    if (hostname.includes('cryptocasino') || url.includes('cryptocasino')) {
      return 'cryptocasino';
    }
    if (hostname.includes('casinodupuerto') || url.includes('casinodupuerto.com/casino/game')) {
      return 'casinodupuerto';
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

    // For Videoslots, parse directly from URL before trying titles/DOM
    if (casino === 'videoslots') {
      const videoslotsInfo = parseVideoslotsFromUrl(window.location.href);
      if (videoslotsInfo && videoslotsInfo.title && isValidGameTitle(videoslotsInfo.title)) {
        gameInfo.title = videoslotsInfo.title;
        gameInfo.provider = videoslotsInfo.provider || null;
        gameInfo.source = 'videoslots-url';
        // Still fall through to allow additional data (stake/win) detection
      }
    }

    // For Vave, extract provider from URL but prefer page title for game name
    if (casino === 'vave') {
      const vaveInfo = parseVaveFromUrl(window.location.href);
      if (vaveInfo && vaveInfo.provider) {
        // Always use provider from URL for Vave
        gameInfo.provider = vaveInfo.provider;
        gameInfo.source = 'vave-url';
      }
      // Title will be set from page title/metadata below if available
    }

    // For Casino Du Puerto, parse game name directly from URL slug
    if (casino === 'casinodupuerto') {
      const duPuertoInfo = parseCasinoDuPuertoFromUrl(window.location.href);
      if (duPuertoInfo && duPuertoInfo.title && isValidGameTitle(duPuertoInfo.title)) {
        gameInfo.title = duPuertoInfo.title;
        gameInfo.provider = duPuertoInfo.provider || null;
        gameInfo.source = 'casinodupuerto-url';
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
          // Only set provider if not already set from URL (for Vave, provider comes from URL)
          if (!gameInfo.provider) {
            gameInfo.provider = casinoSpecific.provider || null;
          }
          gameInfo.source = gameInfo.source || `page-title-${casino}`;
        }
      }
      
      // If casino-specific parser didn't find a valid game, fall back to generic patterns
      if (!gameInfo.title) {
        // First check for "Game Name by Provider" format (common on many casinos)
        const byPattern = /^(.+?)\s+by\s+(.+?)(?:\s*-\s*|\s*\||$)/i;
        const byMatch = pageTitle.match(byPattern);
        if (byMatch) {
          const extractedTitle = byMatch[1].trim();
          if (isValidGameTitle(extractedTitle)) {
            gameInfo.title = extractedTitle;
            // Only set provider if not already set from URL (for Vave, provider comes from URL)
            if (!gameInfo.provider && byMatch[2]) {
              gameInfo.provider = formatProviderName(byMatch[2].trim());
            }
            gameInfo.source = gameInfo.source || 'page-title';
          }
        }
        
        // Fall back to other generic patterns if "by" pattern didn't match
        if (!gameInfo.title) {
          for (const pattern of detectionPatterns[0].patterns) {
            const match = pageTitle.match(pattern);
            if (match) {
              const extractedTitle = match[1].trim();
              // Validate the extracted title before using it
              if (isValidGameTitle(extractedTitle)) {
                gameInfo.title = extractedTitle;
                if (match[2]) {
                  // Try to extract provider (but don't override if already set from URL for Vave)
                  const providerMatch = match[2].match(/^(.+?)(?:\s*\||\s*-\s*|$)/);
                  if (providerMatch && !gameInfo.provider) {
                    gameInfo.provider = formatProviderName(providerMatch[1].trim());
                  }
                }
                gameInfo.source = gameInfo.source || 'page-title';
                break;
              }
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
      console.log('[HuntMaster Extension] Current URL:', window.location.href);
      console.log('[HuntMaster Extension] Sending GAME_DETECTED message to background script');
      
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
  
  // Log that content script is loaded
  console.log('[HuntMaster Extension] Content script loaded on:', window.location.href);

  // Track URL changes for SPA navigation (event-driven, no polling)
  let lastUrl = window.location.href;
  let urlChangeTimeout = null;
  
  // Function to handle URL changes with immediate detection
  function handleUrlChange(newUrl) {
    if (newUrl !== lastUrl) {
      lastUrl = newUrl;
      console.log('[HuntMaster Extension] URL changed, detecting game immediately:', newUrl);
      console.log('[HuntMaster Extension] Sending GAME_DETECTED message to background script');
      
      // Clear any pending timeout
      if (urlChangeTimeout) {
        clearTimeout(urlChangeTimeout);
      }
      
      // Send immediately, then again after a short delay to catch late-loading content
      sendGameInfo();
      urlChangeTimeout = setTimeout(() => {
        console.log('[HuntMaster Extension] Follow-up detection after URL change');
        sendGameInfo();
      }, 300);
    }
  }
  
  // Intercept History API calls for SPA navigation (pushState/replaceState)
  // Store original functions to prevent multiple wrapping
  if (!history._huntmasterWrapped) {
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
      const result = originalPushState.apply(history, args);
      // Use setTimeout to ensure URL has updated
      setTimeout(() => {
        const newUrl = window.location.href;
        if (newUrl !== lastUrl) {
          handleUrlChange(newUrl);
        }
      }, 0);
      return result;
    };
    
    history.replaceState = function(...args) {
      const result = originalReplaceState.apply(history, args);
      // Use setTimeout to ensure URL has updated
      setTimeout(() => {
        const newUrl = window.location.href;
        if (newUrl !== lastUrl) {
          handleUrlChange(newUrl);
        }
      }, 0);
      return result;
    };
    
    history._huntmasterWrapped = true;
    console.log('[HuntMaster Extension] History API interceptors installed');
  }
  
  // Listen for popstate events (back/forward navigation)
  window.addEventListener('popstate', () => {
    setTimeout(() => {
      const newUrl = window.location.href;
      if (newUrl !== lastUrl) {
        handleUrlChange(newUrl);
      }
    }, 0);
  }, true); // Use capture phase to catch early
  
  // Listen for hash changes (some sites use hash-based routing)
  window.addEventListener('hashchange', () => {
    handleUrlChange(window.location.href);
  }, true);

  // Watch for title changes (some casino sites load games dynamically)
  // This was the primary detection method in v2.0.3 and works well for SPA navigation
  let lastTitle = document.title;
  let titleChangeTimeout = null;
  const titleObserver = new MutationObserver(() => {
    if (document.title !== lastTitle) {
      lastTitle = document.title;
      console.log('[HuntMaster Extension] Title changed, detecting game:', document.title);
      console.log('[HuntMaster Extension] Current URL:', window.location.href);
      
      // Clear any pending timeout
      if (titleChangeTimeout) {
        clearTimeout(titleChangeTimeout);
      }
      
      // Send immediately, then again after delay to catch late-loading content
      sendGameInfo();
      titleChangeTimeout = setTimeout(() => {
        console.log('[HuntMaster Extension] Follow-up detection after title change');
        sendGameInfo();
      }, 500);
    }
  });

  titleObserver.observe(document.querySelector('title') || document.head, {
    childList: true,
    subtree: true,
    characterData: true
  });

  // Watch for DOM changes that might indicate game loaded
  // This helps catch games that load dynamically without title/URL changes
  let domChangeTimeout = null;
  const domObserver = new MutationObserver(() => {
    // Clear any pending timeout
    if (domChangeTimeout) {
      clearTimeout(domChangeTimeout);
    }
    // Debounce DOM changes
    domChangeTimeout = setTimeout(() => {
      console.log('[HuntMaster Extension] DOM changed, detecting game');
      sendGameInfo();
    }, 1000);
  });

  domObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['data-game-name', 'data-game-title', 'class']
  });
  
  console.log('[HuntMaster Extension] All observers set up - URL, Title, and DOM monitoring active');

  // Listen for requests from extension
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'HUNTMASTER_PING') {
      // Simple ping to check if content script is running
      sendResponse({ status: 'ok' });
      return true;
    }
    
    if (message.type === 'HUNTMASTER_GET_GAME_INFO') {
      try {
        // Force fresh extraction of game info from the current page
        console.log('[HuntMaster Extension Content] Fresh game info requested, extracting from page');
        console.log('[HuntMaster Extension Content] Current URL:', window.location.href);
        console.log('[HuntMaster Extension Content] Current title:', document.title);
        
        // Extract fresh game info from current DOM state
        const gameInfo = extractGameInfo();
        console.log('[HuntMaster Extension Content] Extracted game info:', gameInfo);
        
        // Also send it to background script for storage (so it's available for other parts of extension)
        if (gameInfo && gameInfo.title && gameInfo.title !== 'Not detected') {
          chrome.runtime.sendMessage({
            type: 'GAME_DETECTED',
            data: gameInfo
          }, (response) => {
            if (chrome.runtime.lastError) {
              console.log('[HuntMaster Extension Content] Error sending to background:', chrome.runtime.lastError.message);
            }
          });
        }
        
        sendResponse({ gameInfo });
      } catch (error) {
        console.error('[HuntMaster Extension Content] Error extracting game info:', error);
        sendResponse({ error: error.message });
      }
      return true; // Keep channel open for async response
    }
    // Return false if we don't handle the message to avoid async response warning
    return false;
  });
})();

