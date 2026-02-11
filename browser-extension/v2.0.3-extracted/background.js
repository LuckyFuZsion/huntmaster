// Background service worker for the extension
// Handles communication and storage

chrome.runtime.onInstalled.addListener(() => {
  console.log('HuntMaster Game Detector extension installed');
});

// Function to normalize game title for comparison (remove hyphens, extra spaces, etc.)
function normalizeGameTitle(title) {
  if (!title) return '';
  return title
    .toLowerCase()
    .trim()
    .replace(/[-–—]/g, ' ') // Replace hyphens, en-dashes, em-dashes with spaces
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();
}

// Cache for validated games (stored in extension storage for persistence)
const VALIDATION_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

// Function to check if a game exists in the database
async function checkGameExists(gameTitle, apiBaseUrl, sessionToken) {
  try {
    const normalizedTitle = normalizeGameTitle(gameTitle);
    const cacheKey = `validated_game:${normalizedTitle}`;
    
    console.log('[HuntMaster Extension] Checking game existence in database:', {
      original: gameTitle.trim(),
      normalized: normalizedTitle
    });
    
    // Step 1: Check local cache first (cheapest - no API call)
    const cacheData = await chrome.storage.local.get([cacheKey]);
    if (cacheData[cacheKey]) {
      const cached = cacheData[cacheKey];
      const age = Date.now() - cached.timestamp;
      if (age < VALIDATION_CACHE_TTL) {
        console.log('[HuntMaster Extension] ✓ Using cached validation result:', cached.exists);
        return cached.exists;
      } else {
        // Cache expired, remove it
        await chrome.storage.local.remove([cacheKey]);
      }
    }
    
    // Step 2: Check Supabase database ONLY - no external API fallback
    // This ensures widget only updates for recognized games in the database
    if (!sessionToken) {
      console.log('[HuntMaster Extension] No session token, cannot verify game in database');
      return false;
    }
    
    try {
      const checkUrl = new URL(`${apiBaseUrl}/api/games/check-exists`);
      checkUrl.searchParams.set('gameTitle', gameTitle.trim());
      checkUrl.searchParams.set('session', sessionToken);
      
      const checkResponse = await fetch(checkUrl.toString(), { cache: 'no-store' });
      
      if (!checkResponse.ok) {
        console.error('[HuntMaster Extension] Database check failed with status:', checkResponse.status);
        // Don't update widget if database check fails
        return false;
      }
      
      const checkData = await checkResponse.json();
      
      if (checkData.success && checkData.exists) {
        console.log('[HuntMaster Extension] ✓ Game found in database');
        // Cache the result
        await chrome.storage.local.set({
          [cacheKey]: {
            exists: true,
            timestamp: Date.now(),
            source: checkData.source || 'database'
          }
        });
        return true;
      }
      
      // If not found in database, return false (don't update widget)
      console.log('[HuntMaster Extension] Game not found in database, skipping auto-update');
      // Cache negative result
      await chrome.storage.local.set({
        [cacheKey]: {
          exists: false,
          timestamp: Date.now(),
          source: 'database_not_found'
        }
      });
      return false;
    } catch (error) {
      console.error('[HuntMaster Extension] Database check failed:', error);
      // Don't update widget if database check fails
      return false;
    }
  } catch (error) {
    console.error('[HuntMaster Extension] Error checking game existence:', error);
    // If check fails, don't update widget (fail closed - only update if game is confirmed in database)
    return false;
  }
}

// Function to automatically update current game via API
async function autoUpdateCurrentGame(gameInfo) {
  try {
    // Get configuration from storage
    const result = await chrome.storage.local.get([
      'huntmaster_api_base_url',
      'huntmaster_session_token',
      'lastAutoUpdatedGame'
    ]);
    
    const apiBaseUrl = result.huntmaster_api_base_url || 'https://huntmaster.vercel.app';
    const sessionToken = result.huntmaster_session_token;
    
    // Don't update if no session token
    if (!sessionToken) {
      console.log('[HuntMaster Extension] No session token, skipping auto-update');
      return;
    }
    
    // Don't update if game title is missing or invalid
    if (!gameInfo.title || gameInfo.title.trim() === '' || 
        gameInfo.title === 'Not detected' || gameInfo.title === 'Detecting...') {
      console.log('[HuntMaster Extension] Invalid game title, skipping auto-update');
      return;
    }
    
    // Additional validation: reject generic casino terms
    const invalidGameNames = [
      'casino', 'casinos', 'cryptocasino', 'gamba',
      'home', 'lobby', 'main', 'index', 'welcome',
      'login', 'register', 'sign in', 'sign up',
      'account', 'profile', 'settings', 'help', 'support',
      'deposit', 'withdraw', 'cashier', 'banking',
      'promotions', 'bonuses', 'vip', 'rewards',
      'terms', 'privacy', 'about', 'contact'
    ];
    
    const gameTitleLower = gameInfo.title.trim().toLowerCase();
    
    // Check exact match
    if (invalidGameNames.includes(gameTitleLower)) {
      console.log('[HuntMaster Extension] Generic casino term detected (exact match), skipping auto-update:', gameInfo.title);
      return;
    }
    
    // Check if title CONTAINS casino terms as whole words
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
    
    for (const term of casinoTerms) {
      // Use word boundary regex to match whole words only
      const regex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(gameTitleLower)) {
        console.log('[HuntMaster Extension] Generic casino term detected (contains term), skipping auto-update:', gameInfo.title, '(contains:', term, ')');
        return;
      }
    }
    
    // Reject if title looks like a page title (contains "|" or " - " with common page terms)
    if (gameTitleLower.includes('|') || gameTitleLower.includes(' - ')) {
      const pageTerms = ['home', 'lobby', 'casino', 'games', 'slots', 'live casino', 'sports'];
      const hasPageTerm = pageTerms.some(term => gameTitleLower.includes(term));
      if (hasPageTerm) {
        console.log('[HuntMaster Extension] Title looks like a page title, skipping auto-update:', gameInfo.title);
        return;
      }
    }
    
    // Reject if title is too short (likely not a game name)
    if (gameTitleLower.length < 3) {
      console.log('[HuntMaster Extension] Title too short, skipping auto-update:', gameInfo.title);
      return;
    }
    
    // Reject if title is just a domain name
    if (gameTitleLower.match(/^[a-z0-9-]+\.(com|net|org|io)$/)) {
      console.log('[HuntMaster Extension] Domain name detected, skipping auto-update:', gameInfo.title);
      return;
    }
    
    // Check if this is the same game as last update (avoid duplicate API calls)
    // Only check title (normalized), not provider - if title matches, skip update
    const lastUpdated = result.lastAutoUpdatedGame;
    if (lastUpdated) {
      const normalizedCurrent = normalizeGameTitle(gameInfo.title.trim());
      const normalizedLast = normalizeGameTitle(lastUpdated.title);
      if (normalizedCurrent === normalizedLast) {
        console.log('[HuntMaster Extension] Same game detected, skipping auto-update');
        return;
      }
    }
    
    // Check if game exists in database (for logging/info purposes, but don't block update)
    const gameTitleTrimmed = gameInfo.title.trim();
    console.log('[HuntMaster Extension] 🔍 Checking if game exists in database:', gameTitleTrimmed);
    const gameExists = await checkGameExists(gameTitleTrimmed, apiBaseUrl, sessionToken);
    
    if (gameExists) {
      console.log('[HuntMaster Extension] ✅ Game found in database - proceeding with auto-update');
    } else {
      console.log('[HuntMaster Extension] ⚠️ Game NOT found in database, but proceeding with auto-update anyway');
      console.log('[HuntMaster Extension] 💡 Tip: Game will be updated even if not in database');
    }
    
    // Update the current game via API (regardless of database check result)
    console.log('[HuntMaster Extension] Proceeding with auto-update:', gameTitleTrimmed);
    const response = await fetch(`${apiBaseUrl}/api/current-game/set`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session: sessionToken,
        gameTitle: gameTitleTrimmed,
        provider: gameInfo.provider?.trim() || undefined,
      }),
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Store the last updated game to avoid duplicate updates
      await chrome.storage.local.set({
        lastAutoUpdatedGame: {
          title: gameTitleTrimmed,
          provider: gameInfo.provider?.trim() || null,
          updatedAt: Date.now()
        }
      });
      console.log('[HuntMaster Extension] ✓ Auto-updated current game:', data.data.gameTitle);
    } else {
      console.error('[HuntMaster Extension] Auto-update failed:', data.error);
    }
  } catch (error) {
    console.error('[HuntMaster Extension] Auto-update error:', error);
  }
}

// Listen for messages from content script and HuntMaster pages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Check if extension is locked to a specific tab
  chrome.storage.local.get(['lockedTabId'], (result) => {
    const lockedTabId = result.lockedTabId;
    
    // If locked and this message is not from the locked tab, ignore it
    if (lockedTabId && sender.tab && sender.tab.id !== lockedTabId) {
      console.log('[HuntMaster Extension] Ignoring message from non-locked tab:', sender.tab.id, 'Locked to:', lockedTabId);
      return false; // Ignore message
    }
    
    // Process message normally
    handleMessage(message, sender, sendResponse, lockedTabId);
  });
  
  return true; // Keep channel open for async response
});

// Handle messages (extracted for cleaner code)
function handleMessage(message, sender, sendResponse, lockedTabId) {
  if (message.type === 'HUNTMASTER_SESSION_TOKEN' && message.token) {
    // Automatically save session token when detected on HuntMaster pages
    chrome.storage.local.set({
      huntmaster_session_token: message.token,
      huntmaster_session_url: message.url,
      huntmaster_session_detected: Date.now()
    }, () => {
      console.log('[HuntMaster Extension] Session token automatically detected and saved from:', message.url);
    });
    sendResponse({ success: true });
    return;
  }
  
  if (message.type === 'GAME_DETECTED') {
    console.log('[HuntMaster Extension Background] Received GAME_DETECTED:', message.data);
    // Store detected game info
    chrome.storage.local.set({
      lastDetectedGame: message.data,
      lastDetectedTime: Date.now()
    });
    
    // Automatically update the current game if a valid game is detected
    if (message.data && message.data.title && 
        message.data.title !== 'Not detected' && 
        message.data.title !== 'Detecting...') {
      console.log('[HuntMaster Extension Background] Calling autoUpdateCurrentGame for:', message.data.title);
      autoUpdateCurrentGame(message.data);
      
      // Add to recent games cache (last 5 games)
      chrome.storage.local.get(['recentGames'], (result) => {
        let recentGames = result.recentGames || [];
        
        // Check if this game is already in the list (by title and provider)
        const gameKey = `${message.data.title}|${message.data.provider || ''}`;
        const existingIndex = recentGames.findIndex(g => 
          `${g.title}|${g.provider || ''}` === gameKey
        );
        
        if (existingIndex !== -1) {
          // Remove existing entry to move it to the front
          recentGames.splice(existingIndex, 1);
        }
        
        // Add new game to the front with timestamp
        const gameWithTime = {
          title: message.data.title,
          provider: message.data.provider || null,
          detectedAt: Date.now()
        };
        recentGames.unshift(gameWithTime);
        
        // Keep only the last 5 games
        recentGames = recentGames.slice(0, 5);
        
        // Store updated list
        chrome.storage.local.set({ recentGames: recentGames });
      });
    } else {
      console.log('[HuntMaster Extension Background] Skipping auto-update - invalid game data');
    }
    
    sendResponse({ success: true });
    return;
  }
  
  if (message.type === 'GET_RECENT_GAMES') {
    chrome.storage.local.get(['recentGames'], (result) => {
      sendResponse({ recentGames: result.recentGames || [] });
    });
    return;
  }
  
  if (message.type === 'GET_LAST_GAME') {
    chrome.storage.local.get(['lastDetectedGame', 'lastDetectedTime'], (result) => {
      sendResponse(result);
    });
    return;
  }
  
  sendResponse({ success: false, error: 'Unknown message type' });
}

// Listen for tab close events to clear lock if locked tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.local.get(['lockedTabId'], (result) => {
    if (result.lockedTabId === tabId) {
      console.log('[HuntMaster Extension] Locked tab was closed, clearing lock');
      chrome.storage.local.remove('lockedTabId');
    }
  });
});


