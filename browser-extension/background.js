// Background service worker for the extension
// Handles communication and storage

chrome.runtime.onInstalled.addListener(() => {
  console.log('HuntMaster Game Detector extension installed');
});

// Listen for session token from HuntMaster pages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'HUNTMASTER_SESSION_TOKEN' && message.token) {
    // Automatically save session token when detected on HuntMaster pages
    chrome.storage.local.set({
      huntmaster_session_token: message.token,
      huntmaster_session_url: message.url,
      huntmaster_session_detected: Date.now()
    }, () => {
      console.log('Session token automatically detected and saved from:', message.url);
    });
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GAME_DETECTED') {
    // Store detected game info
    chrome.storage.local.set({
      lastDetectedGame: message.data,
      lastDetectedTime: Date.now()
    });
  }
  
  if (message.type === 'GET_LAST_GAME') {
    chrome.storage.local.get(['lastDetectedGame', 'lastDetectedTime'], (result) => {
      sendResponse(result);
    });
    return true; // Keep channel open for async response
  }
  
  return true;
});


