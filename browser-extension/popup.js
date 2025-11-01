// Popup script for the extension

const API_BASE_URL_KEY = 'huntmaster_api_base_url';
const SESSION_TOKEN_KEY = 'huntmaster_session_token';

let currentGameInfo = null;

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

// Load saved configuration
async function loadConfig() {
  const result = await chrome.storage.local.get([API_BASE_URL_KEY, SESSION_TOKEN_KEY]);
  const apiBaseUrl = result[API_BASE_URL_KEY] || 'https://huntmaster.vercel.app';
  const sessionToken = result[SESSION_TOKEN_KEY] || '';
  
  document.getElementById('api-base-url').value = apiBaseUrl;
  document.getElementById('session-token').value = sessionToken;
  
  // Update user info display
  updateUserInfo(sessionToken);
  
  return { apiBaseUrl, sessionToken };
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
  
  const username = getUsernameFromSession(sessionToken);
  if (username) {
    showStatus(`Configuration saved! Logged in as: ${username}`, 'success');
  } else if (sessionToken) {
    showStatus('Configuration saved, but session token appears invalid', 'error');
  } else {
    showStatus('Configuration saved!', 'success');
  }
}

// Detect game from current tab
async function detectGame() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab) {
    showStatus('Could not access current tab', 'error');
    return;
  }

  // Try to get game info from content script
  try {
    chrome.tabs.sendMessage(tab.id, { type: 'HUNTMASTER_GET_GAME_INFO' }, (response) => {
      if (chrome.runtime.lastError) {
        // Content script might not be loaded, try storage
        chrome.storage.local.get(['lastDetectedGame'], (result) => {
          if (result.lastDetectedGame) {
            displayGameInfo(result.lastDetectedGame);
          } else {
            showStatus('No game detected on this page', 'info');
            updateDetectedGame('No game detected', '-', '-');
          }
        });
      } else if (response && response.gameInfo) {
        displayGameInfo(response.gameInfo);
      }
    });
  } catch (e) {
    // Fallback to storage
    chrome.storage.local.get(['lastDetectedGame'], (result) => {
      if (result.lastDetectedGame) {
        displayGameInfo(result.lastDetectedGame);
      } else {
        showStatus('No game detected on this page', 'info');
        updateDetectedGame('No game detected', '-', '-');
      }
    });
  }

  // Also listen for messages from content script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'HUNTMASTER_GAME_DETECTED') {
      displayGameInfo(message.data);
    }
  });
}

// Display detected game info
function displayGameInfo(gameInfo) {
  currentGameInfo = gameInfo;
  updateDetectedGame(
    gameInfo.title || 'Not detected',
    gameInfo.provider || '-',
    gameInfo.source || '-'
  );
  
  // Auto-fill stake and win amounts if detected
  if (gameInfo.stake !== null && gameInfo.stake !== undefined) {
    document.getElementById('stake-amount').value = gameInfo.stake;
    updateXWin();
  }
  if (gameInfo.winAmount !== null && gameInfo.winAmount !== undefined) {
    document.getElementById('win-amount').value = gameInfo.winAmount;
    updateXWin();
  }
}

function updateDetectedGame(title, provider, source) {
  const gameEl = document.getElementById('detected-game');
  const providerEl = document.getElementById('detected-provider');
  const sourceEl = document.getElementById('detected-source');
  
  gameEl.textContent = title;
  gameEl.className = title === 'Not detected' || title === 'Detecting...' ? 'game-info-value empty' : 'game-info-value';
  
  providerEl.textContent = provider;
  providerEl.className = provider === '-' ? 'game-info-value empty' : 'game-info-value';
  
  sourceEl.textContent = source;
  sourceEl.className = source === '-' ? 'game-info-value empty' : 'game-info-value';

  // Auto-fill manual entry if detected
  if (title && title !== 'Not detected' && title !== 'Detecting...') {
    document.getElementById('game-title').value = title;
    if (provider && provider !== '-') {
      document.getElementById('game-provider').value = provider;
    }
  }
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

  const gameTitle = document.getElementById('game-title').value.trim();
  const provider = document.getElementById('game-provider').value.trim();
  const stake = parseFloat(document.getElementById('stake-amount').value);
  const winAmount = parseFloat(document.getElementById('win-amount').value);

  if (!gameTitle) {
    showStatus('Game title is required', 'error');
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
  recordBtn.textContent = 'Recording...';

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

    const data = await response.json();

    if (data.success) {
      const xWin = stake > 0 ? (winAmount / stake).toFixed(2) : '0.00';
      showStatus(`✓ Win recorded! ${winAmount} (${xWin}x)`, 'success');
      // Clear win amount (keep stake for next round)
      document.getElementById('win-amount').value = '';
      updateXWin();
    } else {
      showStatus(`Error: ${data.error || 'Failed to record win'}`, 'error');
    }
  } catch (error) {
    showStatus(`Error: ${error.message}`, 'error');
  } finally {
    recordBtn.disabled = false;
    recordBtn.textContent = '💰 Record Win';
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
  updateBtn.textContent = 'Updating...';

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
    updateBtn.textContent = 'Update Current Game';
  }
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
  clearBtn.textContent = 'Clearing...';

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
      document.getElementById('game-title').value = '';
      document.getElementById('game-provider').value = '';
    } else {
      showStatus(`Error: ${data.error || 'Failed to clear game'}`, 'error');
    }
  } catch (error) {
    showStatus(`Error: ${error.message}`, 'error');
  } finally {
    clearBtn.disabled = false;
    clearBtn.textContent = 'Clear Current Game';
  }
}

// Show status message
function showStatus(message, type = 'info') {
  const statusEl = document.getElementById('status');
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  
  if (type === 'success' || type === 'error') {
    setTimeout(() => {
      statusEl.textContent = '';
      statusEl.className = 'status';
    }, 3000);
  }
}

// Event listeners
document.addEventListener('DOMContentLoaded', async () => {
  await loadConfig();
  await detectGame();

  // Refresh detection
  document.getElementById('refresh-btn').addEventListener('click', () => {
    updateDetectedGame('Detecting...', '-', '-');
    detectGame();
  });

  // Update game
  document.getElementById('update-btn').addEventListener('click', () => {
    const gameTitle = document.getElementById('game-title').value;
    const provider = document.getElementById('game-provider').value;
    updateCurrentGame(gameTitle, provider);
  });

  // Use detected game
  document.addEventListener('click', (e) => {
    if (e.target.id === 'use-detected-btn' && currentGameInfo && currentGameInfo.title) {
      updateCurrentGame(currentGameInfo.title, currentGameInfo.provider);
    }
  });

  // Clear game
  document.getElementById('clear-btn').addEventListener('click', () => {
    if (confirm('Clear the current game?')) {
      clearCurrentGame();
    }
  });

  // Save configuration
  document.getElementById('save-config-btn').addEventListener('click', saveConfig);

  // Auto-detect when popup opens (polling for content script messages)
  setInterval(() => {
    detectGame();
  }, 2000);

  // Update X win calculation when stake or win amount changes
  document.getElementById('stake-amount').addEventListener('input', updateXWin);
  document.getElementById('win-amount').addEventListener('input', updateXWin);

  // Record win button
  document.getElementById('record-win-btn').addEventListener('click', recordWin);

  // Update user info when session token field changes
  document.getElementById('session-token').addEventListener('input', (e) => {
    const sessionToken = e.target.value.trim();
    updateUserInfo(sessionToken);
  });
});


