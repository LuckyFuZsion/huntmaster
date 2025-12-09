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
      sendResponse({ success: true });
      return true; // Indicate we'll send async response
    }
    // Return false if we don't handle the message to avoid async response warning
    return false;
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
  
  // Auto-fill stake and win amounts if detected, but only if user hasn't manually edited them
  if (gameInfo.stake !== null && gameInfo.stake !== undefined && !userEditedStakeAmount) {
    const stakeInput = document.getElementById('stake-amount');
    // Only auto-fill if field is empty or matches the previous detected value
    if (!stakeInput.value || stakeInput.value === '') {
      stakeInput.value = gameInfo.stake;
      updateXWin();
    }
  }
  if (gameInfo.winAmount !== null && gameInfo.winAmount !== undefined && !userEditedWinAmount) {
    const winInput = document.getElementById('win-amount');
    // Only auto-fill if field is empty or matches the previous detected value
    if (!winInput.value || winInput.value === '') {
      winInput.value = gameInfo.winAmount;
      updateXWin();
    }
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

// Add current game to bonus hunt list
async function addToHunt() {
  const { apiBaseUrl, sessionToken } = await loadConfig();
  
  if (!sessionToken) {
    showStatus('Please configure your session token first', 'error', 'hunt-status');
    return;
  }

  const gameTitle = document.getElementById('detected-game').textContent.trim();
  const stakeInput = document.getElementById('hunt-stake');
  const stake = parseFloat(stakeInput.value);
  
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

  const addBtn = document.getElementById('add-to-hunt-btn');
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
    
    // Step 2: Check if game already exists in the list
    const gameExists = currentSlots.some(slot => 
      slot.name.toLowerCase().trim() === gameTitle.toLowerCase().trim() && 
      Number(slot.bet) === stake
    );
    
    if (gameExists) {
      showStatus(`Game "${gameTitle}" with stake ${stake} already in hunt list`, 'error', 'hunt-status');
      addBtn.disabled = false;
      addBtn.innerHTML = '<span>🎯 Add to Hunt</span>';
      return;
    }

    // Step 3: Add new slot to the list
    const newSlot = {
      name: gameTitle,
      bet: stake,
      win: null // No win yet
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
    console.log('Save response:', saveData);

    if (saveData.success) {
      // Format stake to 2 decimal places
      const formattedStake = stake.toFixed(2);
      const successMessage = `✓ "${gameTitle}" added to hunt at ${formattedStake} stake`;
      console.log('Showing success message:', successMessage);
      showStatus(successMessage, 'success', 'hunt-status'); // Show in hunt-status element
      stakeInput.value = ''; // Clear the stake input
    } else {
      throw new Error(saveData.error || 'Failed to add game to hunt list');
    }
  } catch (error) {
    showStatus(`Error: ${error.message}`, 'error', 'hunt-status'); // Show errors in hunt-status too
  } finally {
    addBtn.disabled = false;
    addBtn.innerHTML = '<span>🎯 Add to Hunt</span>';
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
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.id) {
        await chrome.storage.local.set({ lockedTabId: tab.id });
        lockBtn.innerHTML = '<span>🔓 Unlock Tab</span>';
        lockStatus.textContent = `🔒 Locked to tab: ${tab.url || 'Current tab'}`;
        lockStatus.className = 'status info';
        lockStatus.style.display = 'block';
        showStatus('Tab locked - extension will only work on this tab', 'success');
      } else {
        showStatus('Could not get current tab', 'error');
      }
    }
  } catch (error) {
    console.error('Error toggling tab lock:', error);
    showStatus(`Error: ${error.message}`, 'error');
  }
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
  await loadConfig();
  await detectGame();

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

  // Auto-detect when popup opens (polling for content script messages)
  setInterval(() => {
    detectGame();
  }, 2000);

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

  // Update user info when session token field changes
  document.getElementById('session-token').addEventListener('input', (e) => {
    const sessionToken = e.target.value.trim();
    updateUserInfo(sessionToken);
  });

  // Check lock status on load
  updateLockStatus();
});


