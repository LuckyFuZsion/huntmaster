// Content script that runs only on HuntMaster pages to extract session token
(function() {
  'use strict';

  // Check if we're on a HuntMaster page
  const isHuntMasterPage = window.location.hostname.includes('huntmaster') || 
                           window.location.hostname === 'localhost' ||
                           (window.location.hostname === '127.0.0.1' && window.location.port === '3000');

  if (!isHuntMasterPage) {
    return; // Not a HuntMaster page, do nothing
  }

  console.log('[HuntMaster Extension] Content script loaded on:', window.location.href);

  // Extract session token from localStorage
  function extractSessionToken() {
    try {
      const session = localStorage.getItem('huntmaster_session');
      if (session && session.length > 0) {
        console.log('[HuntMaster Extension] Session token found, length:', session.length);
        return session;
      } else {
        console.log('[HuntMaster Extension] No session token in localStorage');
      }
    } catch (e) {
      console.error('[HuntMaster Extension] Error reading session token:', e);
    }
    return null;
  }

  // Send session token to background script when found
  function sendSessionToken() {
    const token = extractSessionToken();
    if (token) {
      chrome.runtime.sendMessage({
        type: 'HUNTMASTER_SESSION_TOKEN',
        token: token,
        url: window.location.href
      }).catch(() => {
        // Ignore errors if background script not ready
      });
    }
  }

  // Extract on page load
  sendSessionToken();

  // Watch for localStorage changes (in case user logs in while page is open)
  const originalSetItem = localStorage.setItem;
  localStorage.setItem = function(key, value) {
    originalSetItem.apply(localStorage, arguments);
    if (key === 'huntmaster_session') {
      setTimeout(sendSessionToken, 100);
    }
  };

  // Listen for requests from popup to get current session token
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GET_SESSION_TOKEN') {
      const token = extractSessionToken();
      sendResponse({ token: token });
      return true;
    }
  });
})();

