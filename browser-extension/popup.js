// Popup script for the extension

const API_BASE_URL_KEY = 'huntmaster_api_base_url';
const SESSION_TOKEN_KEY = 'huntmaster_session_token';

let currentGameInfo = null;
let userEditedWinAmount = false; // Track if user manually edited win amount
let userEditedStakeAmount = false; // Track if user manually edited stake amount
let userEditedGameName = false; // Track if user manually edited game name
let userEditedProvider = false; // Track if user manually edited provider

// Decrypt session token to extract username
function decryptSession(sessionToken) {
  if (!sessionToken) return null;
  try {
    // Session token is base64 encoded JSON
    const decoded = atob(sessionToken);
    const sessionData = JSON.parse(decoded);
    return sessionData;
  } catch (e) {
    console.error('Error decrypting session:', e);
    return null;
  }
}

// Extract username from session token
function getUsernameFromSession(sessionToken) {
  const sessionData = decryptSession(sessionToken);
  return sessionData?.username || null;
}

// Update user info display
function updateUserInfo(sessionToken) {
  const userInfoEl = document.getElementById('user-info');
  const loggedInTextEl = document.getElementById('logged-in-text');
  
  if (!sessionToken) {
    userInfoEl.style.display = 'none';
    return;
  }
  
  const username = getUsernameFromSession(sessionToken);
  if (username) {
    userInfoEl.style.display = 'block';
    loggedInTextEl.textContent = `Logged in as: ${username}`;
    loggedInTextEl.style.color = '#9ad97a'; // Green color for logged in
  } else {
    userInfoEl.style.display = 'block';
    loggedInTextEl.textContent = 'Invalid session token';
    loggedInTextEl.style.color = '#ef4444'; // Red color for error
  }
}

// Get widget URL based on current username and API base URL
function getWidgetUrl() {
  const apiBaseUrl = document.getElementById('api-base-url').value.trim() || 'https://huntmaster.vercel.app';
  const sessionToken = document.getElementById('session-token').value;
  const username = getUsernameFromSession(sessionToken);
  
  if (username && apiBaseUrl) {
    const baseUrl = apiBaseUrl.replace(/\/$/, ''); // Remove trailing slash
    return `${baseUrl}/widgets/now-playing?user=${encodeURIComponent(username)}&source=extension`;
  }
  
  return null;
}

// Copy widget URL to clipboard
async function copyWidgetUrl() {
  const widgetUrl = getWidgetUrl();
  
  if (!widgetUrl) {
    showStatus('Please login first to get your widget URL', 'error');
    return;
  }
  
  try {
    await navigator.clipboard.writeText(widgetUrl);
    showStatus('Widget URL copied to clipboard!', 'success');
  } catch (err) {
    // Fallback for older browsers - create temporary input
    const tempInput = document.createElement('input');
    tempInput.value = widgetUrl;
    tempInput.style.position = 'fixed';
    tempInput.style.opacity = '0';
    document.body.appendChild(tempInput);
    tempInput.select();
    tempInput.setSelectionRange(0, 99999); // For mobile devices
    try {
      document.execCommand('copy');
      document.body.removeChild(tempInput);
      showStatus('Widget URL copied to clipboard!', 'success');
    } catch (fallbackErr) {
      document.body.removeChild(tempInput);
      showStatus('Failed to copy URL. Please copy manually.', 'error');
    }
  }
}

// Read saved configuration from storage (does not modify the UI)
async function getConfig() {
  const result = await chrome.storage.local.get([API_BASE_URL_KEY, SESSION_TOKEN_KEY]);
  return {
    apiBaseUrl: result[API_BASE_URL_KEY] || 'https://huntmaster.vercel.app',
    sessionToken: result[SESSION_TOKEN_KEY] || ''
  };
}

// Apply stored configuration to form fields (initial load, after save, after logout)
async function applyStoredConfigToUI() {
  const { apiBaseUrl, sessionToken } = await getConfig();
  document.getElementById('api-base-url').value = apiBaseUrl;
  document.getElementById('session-token').value = sessionToken;
  updateUserInfo(sessionToken);
  await updateLogoutButton();
}

// Load saved configuration (read-only — safe to call during API requests)
async function loadConfig() {
  return getConfig();
}

// Save configuration
async function saveConfig() {
  const apiBaseUrl = document.getElementById('api-base-url').value.trim() || 'https://huntmaster.vercel.app';
  const sessionToken = document.getElementById('session-token').value.trim();
  
  await chrome.storage.local.set({
    [API_BASE_URL_KEY]: apiBaseUrl,
    [SESSION_TOKEN_KEY]: sessionToken
  });
  
  // Update user info display after saving
  updateUserInfo(sessionToken);
  await updateLogoutButton();
  
  const username = getUsernameFromSession(sessionToken);
  if (username) {
    showStatus(`Configuration saved! Logged in as: ${username}`, 'success');
  } else if (sessionToken) {
    showStatus('Configuration saved, but session token appears invalid', 'error');
  } else {
    showStatus('Configuration saved!', 'success');
  }
}

// Handle Discord login
async function handleDiscordLogin() {
  try {
    const { apiBaseUrl } = await loadConfig();
    const baseUrl = apiBaseUrl || 'https://huntmaster.vercel.app';
    
    // Open Discord OAuth in a popup window using Chrome Extension API
    // This is more reliable than window.open() from extension popups
    const authUrl = `${baseUrl}/api/auth/discord?extension=true`;
    
    showStatus('Opening Discord login...', 'info');
    console.log('[Discord Login] Creating popup window...');
    
    let popupWindow = null;
    let popupTabId = null;
    
    try {
      // Use Chrome Extension API to create popup window
      popupWindow = await chrome.windows.create({
        url: authUrl,
        type: 'popup',
        width: 600,
        height: 700,
        focused: true
      });
      
      // Get the tab ID from the created window
      if (popupWindow && popupWindow.tabs && popupWindow.tabs.length > 0) {
        popupTabId = popupWindow.tabs[0].id;
      }
      
      console.log('[Discord Login] Popup window created:', popupWindow.id, 'Tab ID:', popupTabId);
    } catch (error) {
      console.error('[Discord Login] Error creating popup window:', error);
      // Fallback to window.open if Chrome API fails
      const fallbackPopup = window.open(
        authUrl,
        'Discord Login',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );
      
      if (!fallbackPopup) {
        showStatus('Please allow popups for this site to login with Discord', 'error');
        return;
      }
      
      popupWindow = { closed: false };
      // Monitor fallback popup
      const checkFallback = setInterval(() => {
        if (fallbackPopup.closed) {
          popupWindow.closed = true;
          clearInterval(checkFallback);
        }
      }, 500);
    }
    
    if (!popupWindow) {
      showStatus('Failed to open Discord login window', 'error');
      return;
    }
    
    // Cleanup function
    let checkPopupClosedInterval = null;
    let timeoutId = null;
    let tabUpdateListener = null;
    let tabRemovedListener = null;
    let sessionPollInterval = null;
    
    const cleanup = () => {
      if (checkPopupClosedInterval) {
        clearInterval(checkPopupClosedInterval);
        checkPopupClosedInterval = null;
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (tabUpdateListener) {
        chrome.tabs.onUpdated.removeListener(tabUpdateListener);
        tabUpdateListener = null;
      }
      if (tabRemovedListener) {
        chrome.tabs.onRemoved.removeListener(tabRemovedListener);
        tabRemovedListener = null;
      }
      if (sessionPollInterval) {
        clearInterval(sessionPollInterval);
        sessionPollInterval = null;
      }
    };
    
    // Listen for postMessage from the callback page
    const messageListener = (event) => {
      console.log('[Discord Login] Message received:', event.origin, event.data);
      
      // Verify origin for security - check against full URLs
      const allowedOrigins = [
        baseUrl,
        'https://huntmaster.vercel.app',
        'http://localhost:3000',
        'http://localhost:3002'
      ];
      
      // Normalize origins for comparison (remove trailing slashes)
      const normalizedEventOrigin = event.origin.replace(/\/$/, '');
      const isAllowed = allowedOrigins.some(origin => {
        const normalizedOrigin = origin.replace(/\/$/, '');
        return normalizedEventOrigin === normalizedOrigin || 
               normalizedEventOrigin.startsWith(normalizedOrigin);
      });
      
      if (!isAllowed) {
        console.log('[Discord Login] Rejected message from untrusted origin:', event.origin);
        return; // Ignore messages from untrusted origins
      }
      
      if (event.data && event.data.type === 'DISCORD_LOGIN_SUCCESS') {
        console.log('[Discord Login] Success message received, saving session...');
        const sessionToken = event.data.session;
        
        if (!sessionToken) {
          console.error('[Discord Login] No session token in message');
          showStatus('Login failed: No session token received', 'error');
          cleanup();
          return;
        }
        
        // Save session token
        chrome.storage.local.set({
          [SESSION_TOKEN_KEY]: sessionToken
        }, () => {
          console.log('[Discord Login] Session saved to chrome.storage.local');
          
          // Update UI
          document.getElementById('session-token').value = sessionToken;
          updateUserInfo(sessionToken);
          updateLogoutButton();
          
          const username = getUsernameFromSession(sessionToken);
          if (username) {
            showStatus(`Successfully logged in as: ${username}`, 'success');
            console.log('[Discord Login] Login successful for user:', username);
            
            // Force fresh game detection from the page after login
            console.log('[Discord Login] Triggering fresh game detection after login');
            detectGame(); // Don't await - let it run in background
            
            // Automatically update widget with current detected game after login
            setTimeout(async () => {
              const gameTitle = document.getElementById('detected-game')?.textContent?.trim();
              const provider = document.getElementById('detected-provider')?.textContent?.trim();
              if (gameTitle && gameTitle !== 'Detecting...' && gameTitle !== 'Not detected' && isValidGame({ title: gameTitle })) {
                console.log('[Discord Login] Auto-updating widget with detected game after login:', gameTitle);
                await updateCurrentGame(gameTitle, provider === '-' ? undefined : provider);
              }
            }, 2000); // Wait 2 seconds for game detection to complete
          } else {
            showStatus('Login successful, but could not extract username', 'error');
            console.error('[Discord Login] Could not extract username from session');
          }
        });
        
        // Clean up
        cleanup();
        window.removeEventListener('message', messageListener);
        
        // Close popup window using Chrome API if available
        if (popupWindow && popupWindow.id) {
          setTimeout(() => {
            chrome.windows.remove(popupWindow.id).catch(() => {
              // Ignore errors if window already closed
            });
          }, 500);
        } else if (popupWindow && !popupWindow.closed) {
          // Fallback: try to close if it's a regular window object
          setTimeout(() => {
            if (popupWindow && !popupWindow.closed && popupWindow.close) {
              popupWindow.close();
            }
          }, 500);
        }
      }
    };
    
    window.addEventListener('message', messageListener);
    
    // Function to extract and process session from callback page
    const extractSessionFromCallback = async () => {
      if (!popupTabId) return null;
      
      try {
        // Get current tab info first
        const tab = await chrome.tabs.get(popupTabId);
        if (!tab || !tab.url) return null;
        
        // Check if we're on a HuntMaster page (callback or any page after redirect)
        if (!tab.url.includes('huntmaster.vercel.app') && 
            !tab.url.includes('localhost:3000')) {
          return null;
        }
        
        // Read from page's localStorage using executeScript
        // This works even if the page redirected to /dashboard
        const results = await chrome.scripting.executeScript({
          target: { tabId: popupTabId },
          func: () => {
            // Try localStorage first
            let session = localStorage.getItem('huntmaster_session');
            if (session) return session;
            
            // Try sessionStorage as backup
            session = sessionStorage.getItem('huntmaster_session');
            if (session) return session;
            
            // Try URL hash as last resort
            if (window.location.hash) {
              const hashMatch = window.location.hash.match(/[#&]session=([^&]+)/);
              if (hashMatch) {
                return decodeURIComponent(hashMatch[1]);
              }
            }
            
            return null;
          }
        });
        
        if (results && results[0] && results[0].result) {
          return results[0].result;
        }
      } catch (e) {
        // Tab might not be ready yet, inaccessible, or cross-origin
        // This is expected during navigation, just return null and keep polling
        return null;
      }
      
      return null;
    };
    
    // Function to process session once found
    const processSession = (sessionToken) => {
      // Save session token
      chrome.storage.local.set({
        [SESSION_TOKEN_KEY]: sessionToken
      }, () => {
        // Update UI
        document.getElementById('session-token').value = sessionToken;
        updateUserInfo(sessionToken);
        updateLogoutButton();
        
        const username = getUsernameFromSession(sessionToken);
        if (username) {
          showStatus(`Successfully logged in as: ${username}`, 'success');
        } else {
          showStatus('Login successful, but could not extract username', 'error');
        }
        
        // Close popup window
        cleanup();
        window.removeEventListener('message', messageListener);
        if (popupWindow && popupWindow.id) {
          setTimeout(() => {
            chrome.windows.remove(popupWindow.id).catch(() => {});
          }, 500);
        }
      });
    };
    
    // Monitor popup window using Chrome API
    if (popupTabId) {
      let sessionFound = false;
      
      // Listen for tab updates - when callback page loads, extract session
      tabUpdateListener = (tabId, changeInfo, tab) => {
        if (tabId === popupTabId && !sessionFound) {
          // Check if URL changed to callback or any HuntMaster page
          if (changeInfo.url) {
            console.log('[Discord Login] Tab URL changed:', changeInfo.url);
            if (changeInfo.url.includes('/api/auth/callback/discord') || 
                changeInfo.url.includes('/api/auth/discord/callback') ||
                changeInfo.url.includes('huntmaster.vercel.app') ||
                changeInfo.url.includes('localhost:3000')) {
              // Wait for page to be ready, then extract
              setTimeout(async () => {
                if (!sessionFound) {
                  const sessionToken = await extractSessionFromCallback();
                  if (sessionToken) {
                    sessionFound = true;
                    processSession(sessionToken);
                  }
                }
              }, 1000);
            }
          }
          
          // Also check when page finishes loading
          if (changeInfo.status === 'complete' && !sessionFound) {
            setTimeout(async () => {
              if (!sessionFound) {
                const sessionToken = await extractSessionFromCallback();
                if (sessionToken) {
                  sessionFound = true;
                  processSession(sessionToken);
                }
              }
            }, 1000);
          }
        }
      };
      
      // Listen for tab removal (window closed)
      tabRemovedListener = (removedTabId) => {
        if (removedTabId === popupTabId) {
          cleanup();
          window.removeEventListener('message', messageListener);
          console.log('[Discord Login] Popup window was closed');
        }
      };
      
      chrome.tabs.onUpdated.addListener(tabUpdateListener);
      chrome.tabs.onRemoved.addListener(tabRemovedListener);
      
      // Poll for session as fallback (in case tab update doesn't fire reliably when loaded from zip)
      // This is critical when extension is loaded from zip file
      let pollCount = 0;
      const maxPolls = 60; // Poll for 30 seconds (60 * 500ms)
      sessionPollInterval = setInterval(async () => {
        if (sessionFound) {
          clearInterval(sessionPollInterval);
          sessionPollInterval = null;
          return;
        }
        
        pollCount++;
        
        // Try to extract session
        try {
          const sessionToken = await extractSessionFromCallback();
          if (sessionToken) {
            sessionFound = true;
            clearInterval(sessionPollInterval);
            sessionPollInterval = null;
            console.log('[Discord Login] Session found via polling (attempt', pollCount, ')');
            processSession(sessionToken);
            return;
          }
        } catch (e) {
          // Tab might not be ready yet, continue polling
          if (pollCount % 10 === 0) {
            console.log('[Discord Login] Polling... (attempt', pollCount, ')');
          }
        }
        
        if (pollCount >= maxPolls) {
          clearInterval(sessionPollInterval);
          sessionPollInterval = null;
          console.error('[Discord Login] Polling timeout - session not found after', maxPolls, 'attempts');
          showStatus('Login timeout: Could not extract session. Please try again.', 'error');
        }
      }, 500); // Poll every 500ms
    }
    
    // Timeout after 5 minutes
    timeoutId = setTimeout(() => {
      cleanup();
      if (popupWindow && !popupWindow.closed && popupWindow.id) {
        // Close using Chrome API if available
        chrome.windows.remove(popupWindow.id).catch(() => {
          // Ignore errors if window already closed
        });
      }
      window.removeEventListener('message', messageListener);
      showStatus('Login timeout. Please try again.', 'error');
      console.error('[Discord Login] Timeout - no response received');
    }, 5 * 60 * 1000);
    
  } catch (error) {
    console.error('Discord login error:', error);
    showStatus('Failed to start Discord login. Please try again.', 'error');
  }
}

// Handle logout
async function handleLogout() {
  await chrome.storage.local.remove(SESSION_TOKEN_KEY);
  document.getElementById('session-token').value = '';
  updateUserInfo('');
  showStatus('Logged out successfully', 'success');
  await updateLogoutButton();
}

// Update logout button visibility and hide/show auth fields (based on saved token in storage)
async function updateLogoutButton() {
  const { sessionToken } = await getConfig();
  const logoutBtn = document.getElementById('logout-btn');
  const manualAuthSection = document.getElementById('manual-auth-section');
  const discordLoginBtn = document.getElementById('discord-login-btn');
  const authOrDivider = document.getElementById('auth-or-divider');
  const isLoggedIn = !!sessionToken;
  
  if (logoutBtn) {
    logoutBtn.style.display = isLoggedIn ? 'block' : 'none';
  }
  
  if (discordLoginBtn) {
    discordLoginBtn.style.display = isLoggedIn ? 'none' : 'block';
  }
  
  if (authOrDivider) {
    authOrDivider.style.display = isLoggedIn ? 'none' : 'block';
  }
  
  if (manualAuthSection) {
    manualAuthSection.style.display = isLoggedIn ? 'none' : 'block';
  }
}

// Simple validator for a detected game
function isValidGame(game) {
  return (
    game &&
    game.title &&
    game.title !== 'Not detected' &&
    game.title !== 'Detecting...' &&
    game.title.trim() !== ''
  );
}


// Detect game from current tab (respects locked tab if set)
async function detectGame() {
  try {
    // Check if extension is locked to a specific tab
    const result = await chrome.storage.local.get(['lockedTabId']);
    const lockedTabId = result.lockedTabId;
    
    let targetTabId = null;
    
    if (lockedTabId) {
      // If locked, only detect from the locked tab
      try {
        const lockedTab = await chrome.tabs.get(lockedTabId);
        targetTabId = lockedTab.id;
        console.log('[HuntMaster Extension Popup] Tab is locked, detecting from locked tab:', targetTabId);
      } catch (error) {
        // Locked tab doesn't exist, clear the lock
        await chrome.storage.local.remove('lockedTabId');
        showStatus('Locked tab no longer exists, lock cleared', 'info');
        // Fall through to detect from current tab
      }
    }
    
    // If not locked or locked tab doesn't exist, detect from current tab
    if (!targetTabId) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        showStatus('Could not access current tab', 'error');
        return;
      }
      targetTabId = tab.id;
    }

    // Try to get game info from content script
    // First, try to inject the content script if it's not already running
    // This handles tabs that were loaded before the extension was installed/enabled
    chrome.tabs.sendMessage(targetTabId, { type: 'HUNTMASTER_GET_GAME_INFO' }, async (response) => {
      if (chrome.runtime.lastError) {
        // Content script might not be loaded - try to inject it
        try {
          await chrome.scripting.executeScript({
            target: { tabId: targetTabId },
            files: ['content.js']
          });
          // Wait a moment for script to initialize, then try again
          setTimeout(() => {
            chrome.tabs.sendMessage(targetTabId, { type: 'HUNTMASTER_GET_GAME_INFO' }, (response2) => {
              if (chrome.runtime.lastError) {
                // Still failed, use storage fallback
                chrome.storage.local.get(['lastDetectedGame'], (result) => {
                  const last = result.lastDetectedGame;
                  if (isValidGame(last)) {
                    displayGameInfo(last);
                  } else {
                    const currentTitle = document.getElementById('detected-game')?.textContent?.trim();
                    if (currentTitle === 'Detecting...') {
                      updateDetectedGame('Not detected', '-', '-');
                    }
                    showStatus('No game detected on this page', 'info');
                  }
                });
              } else if (response2 && response2.gameInfo) {
                if (isValidGame(response2.gameInfo)) {
                  displayGameInfo(response2.gameInfo);
                } else {
                  chrome.storage.local.get(['lastDetectedGame'], (result) => {
                    const last = result.lastDetectedGame;
                    if (isValidGame(last)) {
                      displayGameInfo(last);
                    } else {
                      const currentTitle = document.getElementById('detected-game')?.textContent?.trim();
                      if (currentTitle === 'Detecting...') {
                        updateDetectedGame('Not detected', '-', '-');
                      }
                      showStatus('No game detected on this page', 'info');
                    }
                  });
                }
              }
            });
          }, 300);
        } catch (injectError) {
          // Injection failed (e.g., chrome:// pages), use storage fallback
          chrome.storage.local.get(['lastDetectedGame'], (result) => {
            const last = result.lastDetectedGame;
            if (isValidGame(last)) {
              displayGameInfo(last);
            } else {
              const currentTitle = document.getElementById('detected-game')?.textContent?.trim();
              if (currentTitle === 'Detecting...') {
                updateDetectedGame('Not detected', '-', '-');
              }
              showStatus('No game detected on this page', 'info');
            }
          });
        }
      } else if (response && response.gameInfo) {
        // Only update if valid; otherwise keep last valid game
        if (isValidGame(response.gameInfo)) {
          displayGameInfo(response.gameInfo);
        } else {
          chrome.storage.local.get(['lastDetectedGame'], (result) => {
            const last = result.lastDetectedGame;
            if (isValidGame(last)) {
              console.log('[HuntMaster Extension Popup] Invalid detection, keeping last detected game:', last.title);
              displayGameInfo(last);
            } else {
              // Clear "Detecting..." if no game found
              const currentTitle = document.getElementById('detected-game')?.textContent?.trim();
              if (currentTitle === 'Detecting...') {
                updateDetectedGame('Not detected', '-', '-');
              }
              showStatus('No game detected on this page', 'info');
            }
          });
        }
      } else {
        // No response at all - clear "Detecting..." state
        chrome.storage.local.get(['lastDetectedGame'], (result) => {
          const last = result.lastDetectedGame;
          if (isValidGame(last)) {
            displayGameInfo(last);
          } else {
            const currentTitle = document.getElementById('detected-game')?.textContent?.trim();
            if (currentTitle === 'Detecting...') {
              updateDetectedGame('Not detected', '-', '-');
            }
            showStatus('No game detected on this page', 'info');
          }
        });
      }
    });
  } catch (e) {
    console.error('[HuntMaster Extension Popup] Error detecting game:', e);
    // Fallback to storage
    chrome.storage.local.get(['lastDetectedGame'], (result) => {
      const last = result.lastDetectedGame;
      if (isValidGame(last)) {
        displayGameInfo(last);
      } else {
        showStatus('No game detected on this page', 'info');
        // Keep previously shown game; do not clear
      }
    });
  }
}

// Display detected game info
function displayGameInfo(gameInfo) {
  currentGameInfo = gameInfo;
  updateDetectedGame(
    gameInfo.title || 'Not detected',
    gameInfo.provider || '-',
    gameInfo.source || '-'
  );
  
  // Disabled auto-fill of stake and win amounts to prevent random values from being detected
  // Users should manually enter these values
  
  // Refresh recent games list if a valid game was detected
  if (gameInfo.title && gameInfo.title !== 'Not detected' && gameInfo.title !== 'Detecting...') {
    loadRecentGames();
  }
}

function updateDetectedGame(title, provider, source) {
  const gameEl = document.getElementById('detected-game');
  const providerEl = document.getElementById('detected-provider');
  const sourceEl = document.getElementById('detected-source');
  
  // Only update if user hasn't manually edited and field is not currently focused
  if (!userEditedGameName && document.activeElement !== gameEl) {
    gameEl.textContent = title;
    gameEl.className = title === 'Not detected' || title === 'Detecting...' ? 'game-info-value editable empty' : 'game-info-value editable';
  }
  
  // Only update if user hasn't manually edited and field is not currently focused
  if (!userEditedProvider && document.activeElement !== providerEl) {
    providerEl.textContent = provider;
    providerEl.className = provider === '-' ? 'game-info-value editable empty' : 'game-info-value editable';
  }
  
  // Source can always be updated (it's not editable)
  sourceEl.textContent = source;
  sourceEl.className = source === '-' ? 'game-info-value empty' : 'game-info-value';
}

// Calculate and display X win
function updateXWin() {
  const stakeEl = document.getElementById('stake-amount');
  const winEl = document.getElementById('win-amount');
  const xWinEl = document.getElementById('calculated-xwin');
  
  const stake = parseFloat(stakeEl.value) || 0;
  const win = parseFloat(winEl.value) || 0;
  
  if (stake > 0 && win >= 0) {
    const xWin = (win / stake).toFixed(2);
    xWinEl.textContent = `${xWin}x`;
  } else {
    xWinEl.textContent = '-';
  }
}

  // Record win to API
async function recordWin() {
  const { apiBaseUrl, sessionToken } = await loadConfig();
  
  if (!sessionToken) {
    showStatus('Please configure your session token first', 'error');
    return;
  }

  const gameTitle = document.getElementById('detected-game').textContent.trim();
  const provider = document.getElementById('detected-provider').textContent.trim();
  const stake = parseFloat(document.getElementById('stake-amount').value);
  const winAmount = parseFloat(document.getElementById('win-amount').value);

  if (!gameTitle) {
    showStatus('Game title is required', 'error');
    return;
  }

  if (gameTitle === 'Detecting...' || gameTitle === 'Not detected') {
    showStatus('Please wait for game detection or edit the game title', 'error');
    return;
  }

  if (isNaN(stake) || stake < 0) {
    showStatus('Valid stake amount is required', 'error');
    return;
  }

  if (isNaN(winAmount) || winAmount < 0) {
    showStatus('Valid win amount is required', 'error');
    return;
  }

  const recordBtn = document.getElementById('record-win-btn');
  recordBtn.disabled = true;
  recordBtn.innerHTML = '<span>Recording...</span>';

  try {
    const response = await fetch(`${apiBaseUrl}/api/user-wins/record`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session: sessionToken,
        gameTitle: gameTitle,
        bet: stake,
        winAmount: winAmount,
        provider: provider || undefined,
      }),
    });

    // Check if response is ok before parsing JSON
    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      console.error('Failed to parse response JSON:', jsonError);
      showStatus(`Error: Server returned invalid response (${response.status})`, 'error');
      return;
    }

    // If response is not ok, show error even if data.success might be false
    if (!response.ok) {
      const errorMsg = data?.error || `HTTP ${response.status}: ${response.statusText}`;
      console.error('API returned error status:', response.status, data);
      showStatus(`Error: ${errorMsg}`, 'error');
      return;
    }

    if (data.success) {
      const xWin = stake > 0 ? (winAmount / stake).toFixed(2) : '0.00';
      showStatus(`✓ Win recorded! ${winAmount} (${xWin}x)`, 'success');
      console.log('✅ Win recorded successfully:', {
        id: data.data?.id,
        gameTitle: data.data?.gameTitle,
        winAmount: data.data?.winAmount,
        xWin: data.data?.xWin,
        bet: data.data?.bet
      });
      // Clear win amount (keep stake for next round)
      document.getElementById('win-amount').value = '';
      userEditedWinAmount = false; // Reset edit flag after successful save
      // Keep stake value - don't clear it
      updateXWin();
    } else {
      // Show detailed error message
      let errorMsg = data.error || 'Failed to record win';
      if (data.details) {
        errorMsg += ` (${JSON.stringify(data.details)})`;
      }
      console.error('Win recording failed:', data);
      showStatus(`Error: ${errorMsg}`, 'error');
    }
  } catch (error) {
    console.error('Win recording exception:', error);
    showStatus(`Error: ${error.message || 'Network error or server unavailable'}`, 'error');
  } finally {
    recordBtn.disabled = false;
    recordBtn.innerHTML = '<span>💰 Record Win</span>';
  }
}

// Update current game via API
async function updateCurrentGame(gameTitle, provider) {
  const { apiBaseUrl, sessionToken } = await loadConfig();
  
  if (!sessionToken) {
    showStatus('Please configure your session token first', 'error');
    return;
  }

  if (!gameTitle || !gameTitle.trim()) {
    showStatus('Game title is required', 'error');
    return;
  }

  const updateBtn = document.getElementById('update-btn');
  updateBtn.disabled = true;
  updateBtn.innerHTML = '<span>Updating...</span>';

  try {
    const response = await fetch(`${apiBaseUrl}/api/current-game/set`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session: sessionToken,
        gameTitle: gameTitle.trim(),
        provider: provider?.trim() || undefined,
      }),
    });

    const data = await response.json();

    if (data.success) {
      showStatus(`✓ Game updated: ${data.data.gameTitle}`, 'success');
    } else {
      showStatus(`Error: ${data.error || 'Failed to update game'}`, 'error');
    }
  } catch (error) {
    showStatus(`Error: ${error.message}`, 'error');
  } finally {
    updateBtn.disabled = false;
    updateBtn.innerHTML = '<span>Update Current Game</span>';
  }
}

// Load and display recent games
function loadRecentGames() {
  const recentGamesList = document.getElementById('recent-games-list');
  if (!recentGamesList) {
    console.log('[HuntMaster Extension] Recent games list element not found, retrying...');
    // Retry after a short delay in case DOM isn't ready yet
    setTimeout(loadRecentGames, 100);
    return;
  }
  
  // Try to get from background script first
  chrome.runtime.sendMessage({ type: 'GET_RECENT_GAMES' }, (response) => {
    if (chrome.runtime.lastError) {
      console.log('[HuntMaster Extension] Message failed, loading from storage directly:', chrome.runtime.lastError);
      // Fallback: load directly from storage
      chrome.storage.local.get(['recentGames'], (result) => {
        displayRecentGames(result.recentGames || []);
      });
      return;
    }
    
    if (!response) {
      console.log('[HuntMaster Extension] No response, loading from storage directly');
      // Fallback: load directly from storage
      chrome.storage.local.get(['recentGames'], (result) => {
        displayRecentGames(result.recentGames || []);
      });
      return;
    }
    
    displayRecentGames(response.recentGames || []);
  });
}

// Display recent games in the list
function displayRecentGames(games) {
  const recentGamesList = document.getElementById('recent-games-list');
  if (!recentGamesList) return;
  
  if (games.length === 0) {
    recentGamesList.innerHTML = '<p class="recent-games-empty">No recent games yet. Play some games to see them here!</p>';
    return;
  }
  
  // Filter out known invalid titles (only the specific problematic ones)
  const invalidTitles = ['loading...', 'loading', 'bonus hunt tracker', 'discord'];
  const validGames = games.filter(game => {
    if (!game || !game.title) return false;
    const normalizedTitle = (game.title || '').toLowerCase().trim();
    return !invalidTitles.includes(normalizedTitle);
  });
  
  if (validGames.length === 0) {
    recentGamesList.innerHTML = '<p class="recent-games-empty">No recent games yet. Play some games to see them here!</p>';
    return;
  }
  
  // Deduplicate games before displaying (case-insensitive, trimmed, and/& normalized)
  // This is a safeguard in case duplicates somehow get into storage
  const normalizeKey = (title, provider) => {
    let normalizedTitle = (title || '').toLowerCase().trim();
    let normalizedProvider = (provider || '').toLowerCase().trim();
    // Normalize "and" and "&" to be equivalent
    normalizedTitle = normalizedTitle.replace(/&/g, ' and ').replace(/\band\b/g, ' and ').replace(/\s+/g, ' ').trim();
    normalizedProvider = normalizedProvider.replace(/&/g, ' and ').replace(/\band\b/g, ' and ').replace(/\s+/g, ' ').trim();
    return `${normalizedTitle}|${normalizedProvider}`;
  };
  
  const seen = new Set();
  const uniqueGames = [];
  
  for (const game of validGames) {
    const key = normalizeKey(game.title, game.provider);
    if (!seen.has(key)) {
      seen.add(key);
      uniqueGames.push(game);
    }
  }
  
  // Store uniqueGames in a variable accessible to the click handler
  const gamesToDisplay = uniqueGames;
  
  recentGamesList.innerHTML = gamesToDisplay.map((game, index) => {
    const timeAgo = getTimeAgo(game.detectedAt || Date.now());
    return `
      <div class="recent-game-item" data-index="${index}">
        <div class="recent-game-title">${escapeHtml(game.title || 'Unknown Game')}</div>
        <div class="recent-game-time">${timeAgo}</div>
      </div>
    `;
  }).join('');
  
  // Add click handlers (use gamesToDisplay instead of games)
  recentGamesList.querySelectorAll('.recent-game-item').forEach(item => {
    item.addEventListener('click', () => {
      const index = parseInt(item.getAttribute('data-index'));
      if (index >= 0 && index < gamesToDisplay.length) {
        showAddToHuntModal(gamesToDisplay[index]);
      }
    });
  });
}

// Helper function to format time ago
function getTimeAgo(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'Just now';
}

// Helper function to escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Show add to hunt modal for a selected game
function showAddToHuntModal(game) {
  if (!game || !game.title) return;
  
  selectedGameForModal = game;
  const modal = document.getElementById('add-to-hunt-modal');
  const gameNameEl = document.getElementById('modal-game-name');
  const stakeInput = document.getElementById('modal-stake');
  
  gameNameEl.textContent = game.title;
  stakeInput.value = '';
  modal.classList.add('show');
  stakeInput.focus();
}

// Setup add to hunt modal event handlers
function setupAddToHuntModal() {
  const modal = document.getElementById('add-to-hunt-modal');
  const cancelBtn = document.getElementById('modal-cancel-btn');
  const confirmBtn = document.getElementById('modal-confirm-btn');
  const stakeInput = document.getElementById('modal-stake');
  let selectedGame = null;
  
  // Store selected game when modal is shown
  const originalShowModal = showAddToHuntModal;
  window.showAddToHuntModal = function(game) {
    selectedGame = game;
    originalShowModal(game);
  };
  
  // Cancel button
  cancelBtn.addEventListener('click', () => {
    modal.classList.remove('show');
    selectedGame = null;
  });
  
  // Click outside modal to close
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('show');
      selectedGame = null;
    }
  });
  
  // Confirm button
  confirmBtn.addEventListener('click', async () => {
    if (!selectedGame) return;
    
    const stake = parseFloat(stakeInput.value);
    if (isNaN(stake) || stake <= 0) {
      alert('Please enter a valid stake amount');
      return;
    }
    
    // Add to hunt using the selected game
    await addGameToHunt(selectedGame.title, selectedGame.provider || null, stake);
    modal.classList.remove('show');
    selectedGame = null;
  });
  
  // Enter key to confirm
  stakeInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      confirmBtn.click();
    }
  });
}

// Add a game to hunt (extracted from addToHunt for reuse)
async function addGameToHunt(gameTitle, provider, stake) {
  const { apiBaseUrl, sessionToken } = await loadConfig();
  
  if (!sessionToken) {
    showStatus('Please configure your session token first', 'error', 'hunt-status');
    return;
  }
  
  if (!gameTitle || gameTitle.trim() === '') {
    showStatus('Game title is required', 'error', 'hunt-status');
    return;
  }
  
  if (isNaN(stake) || stake <= 0) {
    showStatus('Please enter a valid stake amount', 'error', 'hunt-status');
    return;
  }
  
  const addBtn = document.getElementById('add-to-hunt-btn');
  const originalText = addBtn.innerHTML;
  addBtn.disabled = true;
  addBtn.innerHTML = '<span>Adding...</span>';
  
  try {
    // Step 1: Get current slots
    const getResponse = await fetch(`${apiBaseUrl}/api/slots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session: sessionToken,
        action: 'get'
      })
    });
    
    const getData = await getResponse.json();
    
    if (!getData.success) {
      throw new Error(getData.error || 'Failed to get current slots');
    }
    
    const currentSlots = Array.isArray(getData.slots) ? getData.slots : [];
    
    // Ensure slots are sorted by creation order (maintain sequential order)
    currentSlots.sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeA - timeB;
    });
    
    // Step 2: Check if game already exists in the list
    // Normalize "and" and "&" for comparison
    const normalizeForComparison = (str) => {
      return (str || '').toLowerCase().trim().replace(/&/g, ' and ').replace(/\band\b/g, ' and ').replace(/\s+/g, ' ').trim();
    };
    const gameExists = currentSlots.some(slot => 
      normalizeForComparison(slot.name) === normalizeForComparison(gameTitle) && 
      Number(slot.bet) === stake
    );
    
    if (gameExists) {
      showStatus(`Game "${gameTitle}" with stake ${stake} already in hunt list`, 'error', 'hunt-status');
      addBtn.disabled = false;
      addBtn.innerHTML = originalText;
      return;
    }
    
    // Step 3: Add new slot to the list (preserve existing createdAt timestamps)
    // New slot gets a timestamp after the last slot to maintain sequential order
    const baseTime = currentSlots.length > 0 
      ? new Date(currentSlots[currentSlots.length - 1].createdAt || Date.now()).getTime() + 1
      : Date.now();
    
    const newSlot = {
      name: gameTitle,
      bet: stake,
      win: null, // No win yet
      createdAt: new Date(baseTime).toISOString() // Sequential timestamp
    };
    
    const updatedSlots = [...currentSlots, newSlot];
    
    // Step 4: Save all slots
    const saveResponse = await fetch(`${apiBaseUrl}/api/slots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session: sessionToken,
        action: 'save',
        slots: updatedSlots
      })
    });
    
    const saveData = await saveResponse.json();
    
    if (saveData.success) {
      const formattedStake = stake.toFixed(2);
      const successMessage = `✓ "${gameTitle}" added to hunt at ${formattedStake} stake`;
      showStatus(successMessage, 'success', 'hunt-status');
    } else {
      throw new Error(saveData.error || 'Failed to add game to hunt list');
    }
  } catch (error) {
    showStatus(`Error: ${error.message}`, 'error', 'hunt-status');
  } finally {
    addBtn.disabled = false;
    addBtn.innerHTML = originalText;
  }
}

// Add current game to bonus hunt list
async function addToHunt() {
  const gameTitle = document.getElementById('detected-game').textContent.trim();
  const stakeInput = document.getElementById('hunt-stake');
  const stake = parseFloat(stakeInput.value);
  const provider = document.getElementById('detected-provider').textContent.trim();
  
  // Validate inputs
  if (!gameTitle || gameTitle === 'Detecting...' || gameTitle === 'Not detected' || gameTitle === '') {
    showStatus('Please wait for game detection or edit the game title', 'error', 'hunt-status');
    return;
  }
  
  if (isNaN(stake) || stake <= 0) {
    showStatus('Please enter a valid stake amount', 'error', 'hunt-status');
    stakeInput.focus();
    return;
  }
  
  await addGameToHunt(gameTitle, provider === '-' ? null : provider, stake);
}

// Clear current game
async function clearCurrentGame() {
  const { apiBaseUrl, sessionToken } = await loadConfig();
  
  if (!sessionToken) {
    showStatus('Please configure your session token first', 'error');
    return;
  }

  const clearBtn = document.getElementById('clear-btn');
  clearBtn.disabled = true;
  clearBtn.innerHTML = '<span>Clearing...</span>';

  try {
    const response = await fetch(`${apiBaseUrl}/api/current-game/set`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session: sessionToken,
        gameTitle: '',
      }),
    });

    const data = await response.json();

    if (data.success) {
      showStatus('✓ Current game cleared', 'success');
      // Reset detected game display
      updateDetectedGame('Not detected', '-', '-');
      // Clear the last auto-updated game so next detection will auto-update
      chrome.storage.local.remove('lastAutoUpdatedGame');
    } else {
      showStatus(`Error: ${data.error || 'Failed to clear game'}`, 'error');
    }
  } catch (error) {
    showStatus(`Error: ${error.message}`, 'error');
  } finally {
    clearBtn.disabled = false;
    clearBtn.innerHTML = '<span>Clear Current Game</span>';
  }
}

// Lock/unlock tab functionality
async function toggleTabLock() {
  const lockBtn = document.getElementById('lock-tab-btn');
  const lockStatus = document.getElementById('lock-status');
  
  try {
    const result = await chrome.storage.local.get(['lockedTabId']);
    const currentLockedTabId = result.lockedTabId;
    
    if (currentLockedTabId) {
      // Unlock: clear the locked tab ID
      await chrome.storage.local.remove('lockedTabId');
      lockBtn.innerHTML = '<span>🔒 Lock to This Tab</span>';
      lockStatus.style.display = 'none';
      showStatus('Tab lock removed', 'info');
    } else {
      // Lock: get current tab and store its ID
      // Only one tab can be locked at a time - this will replace any previous lock
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.id) {
        // Clear any existing lock first (ensures only one tab is locked)
        await chrome.storage.local.remove('lockedTabId');
        // Set new lock
        await chrome.storage.local.set({ lockedTabId: tab.id });
        lockBtn.innerHTML = '<span>🔓 Unlock Tab</span>';
        lockStatus.textContent = `🔒 Locked to tab: ${tab.url || 'Current tab'}`;
        lockStatus.className = 'status info';
        lockStatus.style.display = 'block';
        showStatus('Tab locked - extension will only work on this tab', 'success');
        
        // Automatically update widget with current detected game when locking tab
        setTimeout(async () => {
          // Get game info from the locked tab
          try {
            const response = await chrome.tabs.sendMessage(tab.id, { type: 'HUNTMASTER_GET_GAME_INFO' });
            if (response && response.gameInfo && response.gameInfo.title) {
              const gameInfo = response.gameInfo;
              if (isValidGame(gameInfo)) {
                console.log('[Tab Lock] Auto-updating widget with detected game from locked tab:', gameInfo.title);
                await updateCurrentGame(gameInfo.title, gameInfo.provider);
              }
            } else {
              // Fallback: use currently displayed game
              const gameTitle = document.getElementById('detected-game')?.textContent?.trim();
              const provider = document.getElementById('detected-provider')?.textContent?.trim();
              if (gameTitle && gameTitle !== 'Detecting...' && gameTitle !== 'Not detected' && isValidGame({ title: gameTitle })) {
                console.log('[Tab Lock] Auto-updating widget with displayed game:', gameTitle);
                await updateCurrentGame(gameTitle, provider === '-' ? undefined : provider);
              }
            }
          } catch (error) {
            // Content script might not be ready, try using displayed game
            const gameTitle = document.getElementById('detected-game')?.textContent?.trim();
            const provider = document.getElementById('detected-provider')?.textContent?.trim();
            if (gameTitle && gameTitle !== 'Detecting...' && gameTitle !== 'Not detected' && isValidGame({ title: gameTitle })) {
              console.log('[Tab Lock] Auto-updating widget with displayed game (fallback):', gameTitle);
              await updateCurrentGame(gameTitle, provider === '-' ? undefined : provider);
            }
          }
        }, 500); // Wait 500ms for content script to be ready
      } else {
        showStatus('Could not get current tab', 'error');
      }
    }
  } catch (error) {
    console.error('Error toggling tab lock:', error);
    showStatus(`Error: ${error.message}`, 'error');
  }
}

// Collect Bonuses View Management
let currentCollectSlot = null;
let allSlots = [];
let currentCollectIndex = -1; // Track current position in slots array
let isCollectViewActive = false; // Track if collect view is active

// Save extension state to chrome.storage
async function saveExtensionState() {
  const state = {
    isCollectViewActive: isCollectViewActive,
    currentCollectIndex: currentCollectIndex,
    currentCollectSlot: currentCollectSlot ? {
      id: currentCollectSlot.id,
      name: currentCollectSlot.name,
      bet: currentCollectSlot.bet,
      win: currentCollectSlot.win
    } : null,
    // Save timestamp so we can validate state freshness
    savedAt: Date.now()
  };
  
  await chrome.storage.local.set({ extensionState: state });
  console.log('[HuntMaster Extension] State saved:', state);
}

// Restore extension state from chrome.storage
async function restoreExtensionState() {
  try {
    const result = await chrome.storage.local.get(['extensionState']);
    const state = result.extensionState;
    
    if (!state) {
      console.log('[HuntMaster Extension] No saved state found');
      return false;
    }
    
    // Check if state is too old (older than 24 hours, don't restore)
    const stateAge = Date.now() - (state.savedAt || 0);
    const MAX_STATE_AGE = 24 * 60 * 60 * 1000; // 24 hours
    
    if (stateAge > MAX_STATE_AGE) {
      console.log('[HuntMaster Extension] Saved state is too old, not restoring');
      await chrome.storage.local.remove('extensionState');
      return false;
    }
    
    console.log('[HuntMaster Extension] Restoring state:', state);
    
    // Restore collect view state
    if (state.isCollectViewActive) {
      isCollectViewActive = true;
      currentCollectIndex = state.currentCollectIndex || -1;
      
      // Show collect view
      document.querySelectorAll('.section').forEach(section => {
        if (section.id !== 'collect-bonuses-section') {
          section.style.display = 'none';
        }
      });
      document.getElementById('collect-bonuses-section').style.display = 'block';
      document.getElementById('collect-bonuses-btn').style.display = 'none';
      document.getElementById('back-to-main-btn').style.display = 'block';
      
      // Load slots first, then restore position
      const { apiBaseUrl, sessionToken } = await loadConfig();
      
      if (sessionToken) {
        try {
          // Fetch current slots
          const response = await fetch(`${apiBaseUrl}/api/slots`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session: sessionToken, action: 'get' })
          });

          const data = await response.json();
          
          if (data.success) {
            allSlots = data.slots || [];
            
            // Sort slots by creation order
            allSlots.sort((a, b) => {
              const timeA = new Date(a.createdAt || 0).getTime();
              const timeB = new Date(b.createdAt || 0).getTime();
              return timeA - timeB;
            });
            
            // Find slots without wins
            const slotsWithoutWin = allSlots.filter(slot => 
              slot.win === null || slot.win === undefined || slot.win === 0
            );
            
            if (slotsWithoutWin.length > 0) {
              // Try to restore to saved position, or use saved slot name
              let targetIndex = state.currentCollectIndex >= 0 ? state.currentCollectIndex : 0;
              
              // If we have a saved slot, try to find it by name
              if (state.currentCollectSlot && state.currentCollectSlot.name) {
                // Normalize "and" and "&" for comparison
                const normalizeForComparison = (str) => {
                  return (str || '').toLowerCase().trim().replace(/&/g, ' and ').replace(/\band\b/g, ' and ').replace(/\s+/g, ' ').trim();
                };
                const savedSlotIndex = slotsWithoutWin.findIndex(slot => 
                  normalizeForComparison(slot.name) === normalizeForComparison(state.currentCollectSlot.name)
                );
                if (savedSlotIndex >= 0) {
                  targetIndex = savedSlotIndex;
                }
              }
              
              // Ensure index is valid
              if (targetIndex >= slotsWithoutWin.length) {
                targetIndex = slotsWithoutWin.length - 1;
              }
              if (targetIndex < 0) {
                targetIndex = 0;
              }
              
              currentCollectIndex = targetIndex;
              currentCollectSlot = slotsWithoutWin[currentCollectIndex];
              
              if (currentCollectSlot) {
                // Display slot info
                document.getElementById('collect-game-name').textContent = currentCollectSlot.name;
                document.getElementById('collect-game-stake').textContent = currentCollectSlot.bet ? currentCollectSlot.bet.toFixed(2) : '0.00';
                document.getElementById('collect-win-amount').value = '';
                
                // Fetch game thumbnail
                await loadGameThumbnail(currentCollectSlot.name);
                
                // Show game info
                document.getElementById('collect-game-info').style.display = 'block';
                document.getElementById('collect-loading').style.display = 'none';
                document.getElementById('collect-complete').style.display = 'none';
                
                // Save state after restore
                await saveExtensionState();
              }
            } else {
              // No slots without wins - show complete message
              document.getElementById('collect-loading').style.display = 'none';
              document.getElementById('collect-complete').style.display = 'block';
              document.getElementById('collect-game-info').style.display = 'none';
              currentCollectIndex = -1;
              currentCollectSlot = null;
            }
          }
        } catch (error) {
          console.error('[HuntMaster Extension] Error loading slots for restore:', error);
          // Fall back to normal load
          await loadNextCollectSlot();
        }
      } else {
        // No session token, just load normally
        await loadNextCollectSlot();
      }
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('[HuntMaster Extension] Error restoring state:', error);
    return false;
  }
}

async function showCollectBonusesView() {
  // Hide main sections
  document.querySelectorAll('.section').forEach(section => {
    if (section.id !== 'collect-bonuses-section') {
      section.style.display = 'none';
    }
  });
  
  // Show collect bonuses section and back button
  document.getElementById('collect-bonuses-section').style.display = 'block';
  document.getElementById('collect-bonuses-btn').style.display = 'none';
  document.getElementById('back-to-main-btn').style.display = 'block';
  
  isCollectViewActive = true;
  await saveExtensionState();
  
  // Load first slot without win
  await loadNextCollectSlot();
}

async function showMainView() {
  // Show all main sections
  document.querySelectorAll('.section').forEach(section => {
    if (section.id !== 'collect-bonuses-section') {
      section.style.display = 'block';
    }
  });
  
  // Hide collect bonuses section
  document.getElementById('collect-bonuses-section').style.display = 'none';
  document.getElementById('collect-bonuses-btn').style.display = 'block';
  document.getElementById('back-to-main-btn').style.display = 'none';
  
  // Reset state
  isCollectViewActive = false;
  currentCollectIndex = -1;
  currentCollectSlot = null;
  allSlots = [];
  
  // Clear saved state
  await chrome.storage.local.remove('extensionState');
}

// Load the next slot that needs a win
async function loadNextCollectSlot() {
  const { apiBaseUrl, sessionToken } = await loadConfig();
  
  if (!sessionToken) {
    showStatus('Please configure your session token first', 'error', 'collect-status');
    return;
  }

  const loadingEl = document.getElementById('collect-loading');
  const completeEl = document.getElementById('collect-complete');
  const gameInfoEl = document.getElementById('collect-game-info');
  const statusEl = document.getElementById('collect-status');
  
  loadingEl.style.display = 'block';
  completeEl.style.display = 'none';
  gameInfoEl.style.display = 'none';
  statusEl.textContent = '';

  try {
    // Fetch all slots
    const response = await fetch(`${apiBaseUrl}/api/slots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session: sessionToken, action: 'get' })
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to load slots');
    }

    allSlots = data.slots || [];
    
    // Ensure slots are sorted by creation order (createdAt ascending)
    // This maintains the sequential order they were added
    allSlots.sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeA - timeB;
    });
    
    // Find slots without wins (maintains order from allSlots)
    const slotsWithoutWin = allSlots.filter(slot => 
      slot.win === null || slot.win === undefined || slot.win === 0
    );

    if (slotsWithoutWin.length === 0) {
      // All bonuses collected
      loadingEl.style.display = 'none';
      completeEl.style.display = 'block';
      gameInfoEl.style.display = 'none';
      currentCollectIndex = -1;
      currentCollectSlot = null;
      return;
    }

    // If we're going forward (or first load), move to next index
    // If going back, we'll handle that separately in goBackCollectBonus
    if (currentCollectIndex < 0) {
      currentCollectIndex = 0; // Start at first slot without win
    } else if (currentCollectIndex < slotsWithoutWin.length - 1) {
      currentCollectIndex++; // Move forward to next slot
    } else {
      // Already at last slot, stay there
      currentCollectIndex = slotsWithoutWin.length - 1;
    }

    currentCollectSlot = slotsWithoutWin[currentCollectIndex];
    
    // Display slot info
    document.getElementById('collect-game-name').textContent = currentCollectSlot.name;
    document.getElementById('collect-game-stake').textContent = currentCollectSlot.bet ? currentCollectSlot.bet.toFixed(2) : '0.00';
    
    // Clear win input
    document.getElementById('collect-win-amount').value = '';
    
    // Fetch game thumbnail
    await loadGameThumbnail(currentCollectSlot.name);
    
    loadingEl.style.display = 'none';
    gameInfoEl.style.display = 'block';
    
    // Save state after loading slot
    await saveExtensionState();
    
  } catch (error) {
    console.error('Error loading slots:', error);
    loadingEl.style.display = 'none';
    showStatus(`Error: ${error.message}`, 'error', 'collect-status');
  }
}

// Load game thumbnail
async function loadGameThumbnail(gameName) {
  const { apiBaseUrl, sessionToken } = await loadConfig();
  const thumbnailEl = document.getElementById('collect-game-thumbnail');
  
  try {
    // Search for game to get thumbnail
    const searchUrl = new URL(`${apiBaseUrl}/api/slots-suggest`);
    searchUrl.searchParams.set('q', gameName);
    searchUrl.searchParams.set('limit', '1');
    if (sessionToken) {
      searchUrl.searchParams.set('session', sessionToken);
    }
    
    const response = await fetch(searchUrl.toString());
    const data = await response.json();
    
    if (data.success && data.data && data.data.length > 0) {
      const game = data.data[0];
      if (game.thumbnail) {
        // Use image proxy to avoid CORS issues
        thumbnailEl.src = `${apiBaseUrl}/api/image-proxy?url=${encodeURIComponent(game.thumbnail)}`;
        thumbnailEl.style.display = 'block';
        thumbnailEl.onerror = () => {
          thumbnailEl.style.display = 'none';
        };
      } else {
        thumbnailEl.style.display = 'none';
      }
    } else {
      thumbnailEl.style.display = 'none';
    }
  } catch (error) {
    console.error('Error loading thumbnail:', error);
    thumbnailEl.style.display = 'none';
  }
}

// Save win for current slot
async function saveCollectWin() {
  const { apiBaseUrl, sessionToken } = await loadConfig();
  
  if (!sessionToken) {
    showStatus('Please configure your session token first', 'error', 'collect-status');
    return;
  }

  if (!currentCollectSlot) {
    showStatus('No slot selected', 'error', 'collect-status');
    return;
  }

  const winAmount = parseFloat(document.getElementById('collect-win-amount').value);
  
  if (isNaN(winAmount) || winAmount < 0) {
    showStatus('Please enter a valid win amount', 'error', 'collect-status');
    return;
  }

  const saveBtn = document.getElementById('save-collect-win-btn');
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<span>Saving...</span>';

  try {
    // Update the slot with the win amount
    const updatedSlot = {
      id: currentCollectSlot.id,
      name: currentCollectSlot.name,
      bet: currentCollectSlot.bet,
      win: winAmount
    };

    const response = await fetch(`${apiBaseUrl}/api/slots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session: sessionToken,
        action: 'update-single',
        slot: updatedSlot
      })
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to save win');
    }

    // Calculate X win
    const xWin = currentCollectSlot.bet > 0 ? (winAmount / currentCollectSlot.bet).toFixed(2) : '0.00';
    showStatus(`✓ Win saved! ${winAmount.toFixed(2)} (${xWin}x)`, 'success', 'collect-status');
    
    // Wait a moment then load next slot
    setTimeout(async () => {
      await loadNextCollectSlot();
    }, 1000);
    
  } catch (error) {
    console.error('Error saving win:', error);
    showStatus(`Error: ${error.message}`, 'error', 'collect-status');
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<span>💾 Save Win</span>';
  }
}

// Go back to previous bonus
async function goBackCollectBonus() {
  // Ensure allSlots is sorted by creation order (sequential)
  allSlots.sort((a, b) => {
    const timeA = new Date(a.createdAt || 0).getTime();
    const timeB = new Date(b.createdAt || 0).getTime();
    return timeA - timeB;
  });
  
  const slotsWithoutWin = allSlots.filter(slot => 
    slot.win === null || slot.win === undefined || slot.win === 0
  );
  
  if (currentCollectIndex > 0) {
    currentCollectIndex--; // Move back one position
    
    if (currentCollectIndex >= 0 && currentCollectIndex < slotsWithoutWin.length) {
      currentCollectSlot = slotsWithoutWin[currentCollectIndex];
      
      // Display slot info
      document.getElementById('collect-game-name').textContent = currentCollectSlot.name;
      document.getElementById('collect-game-stake').textContent = currentCollectSlot.bet ? currentCollectSlot.bet.toFixed(2) : '0.00';
      
      // Clear win input
      document.getElementById('collect-win-amount').value = '';
      
      // Fetch game thumbnail
      await loadGameThumbnail(currentCollectSlot.name);
      
      // Show game info
      document.getElementById('collect-game-info').style.display = 'block';
      document.getElementById('collect-loading').style.display = 'none';
      document.getElementById('collect-complete').style.display = 'none';
      document.getElementById('collect-status').textContent = '';
      
      // Save state after navigation
      await saveExtensionState();
    }
  } else {
    showStatus('Already at first bonus', 'info', 'collect-status');
  }
}

// Go forward to next bonus
async function forwardCollectBonus() {
  // Ensure allSlots is sorted by creation order (sequential)
  allSlots.sort((a, b) => {
    const timeA = new Date(a.createdAt || 0).getTime();
    const timeB = new Date(b.createdAt || 0).getTime();
    return timeA - timeB;
  });
  
  const slotsWithoutWin = allSlots.filter(slot => 
    slot.win === null || slot.win === undefined || slot.win === 0
  );
  
  if (currentCollectIndex < slotsWithoutWin.length - 1) {
    currentCollectIndex++; // Move forward one position
    
    if (currentCollectIndex >= 0 && currentCollectIndex < slotsWithoutWin.length) {
      currentCollectSlot = slotsWithoutWin[currentCollectIndex];
      
      // Display slot info
      document.getElementById('collect-game-name').textContent = currentCollectSlot.name;
      document.getElementById('collect-game-stake').textContent = currentCollectSlot.bet ? currentCollectSlot.bet.toFixed(2) : '0.00';
      
      // Clear win input
      document.getElementById('collect-win-amount').value = '';
      
      // Fetch game thumbnail
      await loadGameThumbnail(currentCollectSlot.name);
      
      // Show game info
      document.getElementById('collect-game-info').style.display = 'block';
      document.getElementById('collect-loading').style.display = 'none';
      document.getElementById('collect-complete').style.display = 'none';
      document.getElementById('collect-status').textContent = '';
      
      // Save state after navigation
      await saveExtensionState();
    }
  } else {
    showStatus('Already at last bonus', 'info', 'collect-status');
  }
}

// Skip current bonus
async function skipCollectBonus() {
  // Just move to next slot
  loadNextCollectSlot();
}

// Update lock status display
async function updateLockStatus() {
  const lockBtn = document.getElementById('lock-tab-btn');
  const lockStatus = document.getElementById('lock-status');
  
  try {
    const result = await chrome.storage.local.get(['lockedTabId']);
    const lockedTabId = result.lockedTabId;
    
    if (lockedTabId) {
      // Check if the locked tab still exists
      try {
        const tab = await chrome.tabs.get(lockedTabId);
        lockBtn.innerHTML = '<span>🔓 Unlock Tab</span>';
        lockStatus.textContent = `🔒 Locked to tab: ${tab.url || 'Tab ' + lockedTabId}`;
        lockStatus.className = 'status info';
        lockStatus.style.display = 'block';
      } catch (error) {
        // Tab was closed, clear the lock
        await chrome.storage.local.remove('lockedTabId');
        lockBtn.innerHTML = '<span>🔒 Lock to This Tab</span>';
        lockStatus.style.display = 'none';
      }
    } else {
      lockBtn.innerHTML = '<span>🔒 Lock to This Tab</span>';
      lockStatus.style.display = 'none';
    }
  } catch (error) {
    console.error('Error updating lock status:', error);
  }
}

// Show status message
function showStatus(message, type = 'info', targetElementId = 'status') {
  const statusEl = document.getElementById(targetElementId);
  console.log('showStatus called:', message, type, 'Element:', statusEl, 'Target:', targetElementId);
  if (message && statusEl) {
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
    
    if (type === 'success' || type === 'error') {
      setTimeout(() => {
        if (statusEl) {
          statusEl.textContent = '';
          statusEl.className = 'status';
        }
      }, 5000); // Increased from 3000 to 5000ms to ensure message is visible
    }
  } else {
    if (statusEl) {
      statusEl.textContent = '';
      statusEl.className = 'status';
    }
  }
}

// Open extension in a separate window that stays open
async function openInWindow() {
  try {
    const url = chrome.runtime.getURL('popup.html');
    await chrome.windows.create({
      url: url,
      type: 'normal',
      width: 420,
      height: 850,
      focused: true
    });
    // Close the current popup after opening the window
    window.close();
  } catch (error) {
    console.error('Error opening window:', error);
    showStatus('Failed to open window', 'error');
  }
}

// Event listeners
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize stake and win amount fields to empty on load to prevent random values
  const stakeInput = document.getElementById('stake-amount');
  const winInput = document.getElementById('win-amount');
  
  // Ensure fields start completely empty (no default values)
  stakeInput.value = '';
  winInput.value = '';
  
  await applyStoredConfigToUI();
  
  // Try to restore extension state first
  const stateRestored = await restoreExtensionState();
  
  // Always force fresh game detection when popup opens (pulls latest info from page)
  // Only skip if we restored to collect view
  if (!stateRestored) {
    // First, try to load from storage to show something immediately
    chrome.storage.local.get(['lastDetectedGame'], (result) => {
      const last = result.lastDetectedGame;
      if (isValidGame(last)) {
        console.log('[Popup Open] Loading cached game from storage:', last.title);
        displayGameInfo(last);
      }
    });
    
    // Then force fresh detection from the page (non-blocking)
    console.log('[Popup Open] Triggering fresh game detection from page');
    detectGame(); // Don't await - let it run in background
    
    // After game detection, automatically update widget if user is logged in and game is valid
    setTimeout(async () => {
      const { sessionToken } = await getConfig();
      if (sessionToken) {
        const gameTitle = document.getElementById('detected-game')?.textContent?.trim();
        const provider = document.getElementById('detected-provider')?.textContent?.trim();
        if (gameTitle && gameTitle !== 'Detecting...' && gameTitle !== 'Not detected' && isValidGame({ title: gameTitle })) {
          console.log('[Popup Open] Auto-updating widget with detected game:', gameTitle);
          await updateCurrentGame(gameTitle, provider === '-' ? undefined : provider);
        }
      }
    }, 2000); // Wait 2 seconds for game detection to complete
  }
  
  loadRecentGames(); // Load recent games on popup open
  
  // Setup add to hunt modal
  setupAddToHuntModal();

  // Set up event-driven message listener for game detection (no polling)
  chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.type === 'GAME_DETECTED') {
      // Check if extension is locked to a specific tab
      const result = await chrome.storage.local.get(['lockedTabId']);
      const lockedTabId = result.lockedTabId;
      
      // If locked, only process messages from the locked tab
      // Messages from background script (no sender.tab) are always allowed
      if (lockedTabId && sender.tab && sender.tab.id !== lockedTabId) {
        console.log('[HuntMaster Extension Popup] Ignoring GAME_DETECTED from non-locked tab:', sender.tab.id, 'Locked to:', lockedTabId);
        sendResponse({ success: true });
        return true; // Don't process, but send response
      }
      
      // Process message only if from locked tab (or no lock active)
      if (message.data && isValidGame(message.data)) {
        console.log('[HuntMaster Extension Popup] Processing GAME_DETECTED from tab:', sender.tab?.id, 'Locked to:', lockedTabId);
        displayGameInfo(message.data);
      }
      sendResponse({ success: true });
      return true; // Indicate we'll send async response
    }
    // Return false if we don't handle the message to avoid async response warning
    return false;
  });

  // Open in window button
  document.getElementById('open-window-btn').addEventListener('click', openInWindow);

  // Refresh detection
  document.getElementById('refresh-btn').addEventListener('click', () => {
    updateDetectedGame('Detecting...', '-', '-');
    detectGame();
  });

  // Update game - use detected game info
  document.getElementById('update-btn').addEventListener('click', () => {
    const gameTitle = document.getElementById('detected-game').textContent.trim();
    const provider = document.getElementById('detected-provider').textContent.trim();
    
    // Don't update if game title is empty or placeholder
    if (!gameTitle || gameTitle === 'Detecting...' || gameTitle === 'Not detected' || gameTitle === '') {
      showStatus('Please wait for game detection or edit the game title', 'error');
      return;
    }
    
    updateCurrentGame(gameTitle, provider === '-' ? undefined : provider);
  });

  // Clear game
  document.getElementById('clear-btn').addEventListener('click', () => {
    if (confirm('Clear the current game?')) {
      clearCurrentGame();
    }
  });

  // Save configuration
  document.getElementById('save-config-btn').addEventListener('click', saveConfig);
  
  // Discord login button
  const discordLoginBtn = document.getElementById('discord-login-btn');
  if (discordLoginBtn) {
    discordLoginBtn.addEventListener('click', handleDiscordLogin);
  }
  
  // Logout button
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
  
  // Copy widget URL button
  const copyWidgetUrlBtn = document.getElementById('copy-widget-url-btn');
  if (copyWidgetUrlBtn) {
    copyWidgetUrlBtn.addEventListener('click', copyWidgetUrl);
  }
  
  // Update logout button visibility on load (also done in applyStoredConfigToUI)
  
  // Preview username while typing token (before save) — do not hide the save form
  document.getElementById('session-token').addEventListener('input', (e) => {
    updateUserInfo(e.target.value.trim());
  });

  // Game detection is event-driven via chrome.runtime.onMessage listener
  // No polling - updates come from content script when game changes are detected

  // Update X win calculation when stake or win amount changes
  // Also track manual edits to prevent auto-fill from overwriting user input
  document.getElementById('stake-amount').addEventListener('input', (e) => {
    const value = e.target.value.trim();
    if (value === '') {
      // User manually cleared the field - allow auto-fill again
      userEditedStakeAmount = false;
    } else {
      // User entered a value - don't auto-fill anymore
      userEditedStakeAmount = true;
    }
    updateXWin();
  });
  document.getElementById('win-amount').addEventListener('input', (e) => {
    const value = e.target.value.trim();
    if (value === '') {
      // User manually cleared the field - allow auto-fill again
      userEditedWinAmount = false;
    } else {
      // User entered a value - don't auto-fill anymore
      userEditedWinAmount = true;
    }
    updateXWin();
  });

  // Handle editable game title and provider fields
  const gameEl = document.getElementById('detected-game');
  const providerEl = document.getElementById('detected-provider');
  
  // Track when user manually edits game name
  gameEl.addEventListener('input', () => {
    userEditedGameName = true;
  });
  
  // Track when user manually edits provider
  providerEl.addEventListener('input', () => {
    userEditedProvider = true;
  });
  
  // Prevent empty contenteditable elements
  gameEl.addEventListener('blur', () => {
    const wasEmpty = !gameEl.textContent.trim() || gameEl.textContent.trim() === '';
    if (wasEmpty) {
      gameEl.textContent = gameEl.getAttribute('data-placeholder') || 'Not detected';
      // If user cleared the field, allow auto-fill again
      userEditedGameName = false;
    }
  });
  
  providerEl.addEventListener('blur', () => {
    const wasEmpty = !providerEl.textContent.trim() || providerEl.textContent.trim() === '';
    if (wasEmpty) {
      providerEl.textContent = providerEl.getAttribute('data-placeholder') || '-';
      // If user cleared the field, allow auto-fill again
      userEditedProvider = false;
    }
  });

  // Record win button
  document.getElementById('record-win-btn').addEventListener('click', recordWin);

  // Add to hunt button
  document.getElementById('add-to-hunt-btn').addEventListener('click', addToHunt);

  // Lock/unlock tab button
  document.getElementById('lock-tab-btn').addEventListener('click', toggleTabLock);

  // Check lock status on load
  updateLockStatus();

  // Collect Bonuses functionality
  document.getElementById('collect-bonuses-btn').addEventListener('click', showCollectBonusesView);
  document.getElementById('back-to-main-btn').addEventListener('click', showMainView);
  document.getElementById('save-collect-win-btn').addEventListener('click', saveCollectWin);
  document.getElementById('skip-collect-btn').addEventListener('click', skipCollectBonus);
  document.getElementById('back-collect-btn').addEventListener('click', goBackCollectBonus);
  document.getElementById('forward-collect-btn').addEventListener('click', forwardCollectBonus);
  document.getElementById('dashboard-collect-btn').addEventListener('click', showMainView);
});


