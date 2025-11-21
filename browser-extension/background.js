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

// Function to check if a game exists in the database
async function checkGameExists(gameTitle, apiBaseUrl) {
  try {
    const normalizedTitle = normalizeGameTitle(gameTitle);
    console.log('[HuntMaster Extension] Checking game existence:', {
      original: gameTitle.trim(),
      normalized: normalizedTitle
    });
    
    // Try searching with the original title first
    const searchUrl = new URL(`${apiBaseUrl}/api/slots-suggest`);
    searchUrl.searchParams.set('q', gameTitle.trim());
    searchUrl.searchParams.set('limit', '20'); // Increase limit to get more results
    searchUrl.searchParams.set('exhaustive', '1');
    
    const response = await fetch(searchUrl.toString(), { cache: 'no-store' });
    const data = await response.json();
    
    if (data.success && Array.isArray(data.data)) {
      console.log('[HuntMaster Extension] Search returned', data.data.length, 'results');
      
      // Check if any game in results matches (ignoring hyphens/dashes and case)
      let gameExists = data.data.some((game) => {
        if (!game.title) return false;
        const normalizedGameTitle = normalizeGameTitle(game.title);
        const matches = normalizedGameTitle === normalizedTitle;
        if (matches) {
          console.log('[HuntMaster Extension] ✓ Found matching game:', {
            detected: gameTitle.trim(),
            database: game.title,
            normalized: normalizedGameTitle
          });
        }
        return matches;
      });
      
      // If not found, try searching again with title without dash (preserving capitalization)
      if (!gameExists) {
        // Remove dash but keep original capitalization: "Zeus vs Hades - Gods of War" -> "Zeus vs Hades Gods of War"
        const titleWithoutDash = gameTitle.trim().replace(/[-–—]/g, ' ').replace(/\s+/g, ' ').trim();
        if (titleWithoutDash !== gameTitle.trim()) {
          console.log('[HuntMaster Extension] Trying fallback search without dash:', titleWithoutDash);
          const fallbackUrl = new URL(`${apiBaseUrl}/api/slots-suggest`);
          fallbackUrl.searchParams.set('q', titleWithoutDash);
          fallbackUrl.searchParams.set('limit', '20');
          fallbackUrl.searchParams.set('exhaustive', '1');
          
          try {
            const fallbackResponse = await fetch(fallbackUrl.toString(), { cache: 'no-store' });
            const fallbackData = await fallbackResponse.json();
            
            if (fallbackData.success && Array.isArray(fallbackData.data)) {
              console.log('[HuntMaster Extension] Fallback search returned', fallbackData.data.length, 'results');
              gameExists = fallbackData.data.some((game) => {
                if (!game.title) return false;
                const normalizedGameTitle = normalizeGameTitle(game.title);
                const matches = normalizedGameTitle === normalizedTitle;
                if (matches) {
                  console.log('[HuntMaster Extension] ✓ Found matching game in fallback:', {
                    detected: gameTitle.trim(),
                    database: game.title,
                    normalized: normalizedGameTitle
                  });
                }
                return matches;
              });
            }
          } catch (fallbackError) {
            console.error('[HuntMaster Extension] Fallback search error:', fallbackError);
          }
        }
      }
      
      if (!gameExists && data.data.length > 0) {
        // Log what we found for debugging
        console.log('[HuntMaster Extension] No exact match found. Top results:', 
          data.data.slice(0, 5).map(g => ({
            title: g.title,
            normalized: normalizeGameTitle(g.title)
          }))
        );
      }
      
      return gameExists;
    }
    
    console.log('[HuntMaster Extension] Search failed or returned no results');
    return false;
  } catch (error) {
    console.error('[HuntMaster Extension] Error checking game existence:', error);
    // If check fails, don't block the update (fail open)
    return true;
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
    
    // Check if game exists in database before updating
    const gameTitleTrimmed = gameInfo.title.trim();
    console.log('[HuntMaster Extension] Checking if game exists in database:', gameTitleTrimmed);
    const gameExists = await checkGameExists(gameTitleTrimmed, apiBaseUrl);
    
    if (!gameExists) {
      console.log('[HuntMaster Extension] ⚠️ Game not found in database, skipping auto-update:', gameTitleTrimmed);
      return;
    }
    
    // Update the current game via API
    console.log('[HuntMaster Extension] Auto-updating current game:', gameTitleTrimmed);
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
  if (message.type === 'HUNTMASTER_SESSION_TOKEN' && message.token) {
    // Automatically save session token when detected on HuntMaster pages
    chrome.storage.local.set({
      huntmaster_session_token: message.token,
      huntmaster_session_url: message.url,
      huntmaster_session_detected: Date.now()
    }, () => {
      console.log('[HuntMaster Extension] Session token automatically detected and saved from:', message.url);
    });
    return false; // No async response needed
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
    } else {
      console.log('[HuntMaster Extension Background] Skipping auto-update - invalid game data');
    }
    
    sendResponse({ success: true });
    return true; // Keep channel open for async response
  }
  
  if (message.type === 'GET_LAST_GAME') {
    chrome.storage.local.get(['lastDetectedGame', 'lastDetectedTime'], (result) => {
      sendResponse(result);
    });
    return true; // Keep channel open for async response
  }
  
  // Return false if we don't handle the message to avoid async response warning
  return false;
});


