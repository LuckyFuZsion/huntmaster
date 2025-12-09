# HuntMaster Game Detector - Privacy Policy

**Last Updated:** [DATE]

## Overview

HuntMaster Game Detector ("the Extension") is a browser extension that helps users track and manage their casino game playing sessions. This privacy policy explains how we handle your data.

## Data Collection and Usage

### What We Collect

1. **Session Token**: When you configure the extension, you provide a session token that authenticates you with the HuntMaster service. This token is stored locally in your browser's extension storage.

2. **Game Information**: The extension detects game names and providers from casino websites you visit. This information is:
   - Temporarily stored locally in your browser
   - Only sent to the HuntMaster API when you explicitly choose to update your current game
   - Never sent to third parties

3. **Win Records**: If you use the win recording feature, stake amounts, win amounts, and multiplier calculations are sent to the HuntMaster API to record your gaming session data.

### What We DON'T Collect

- Personal identification information (unless provided via session token)
- Payment or financial information
- Browsing history beyond the current page
- Any data from sites other than those you explicitly interact with through the extension
- Passwords or login credentials

## Data Storage

### Local Storage

All configuration data (session token, API URL) is stored locally in your browser's extension storage using Chrome's `chrome.storage` API. This data:
- Never leaves your device unless you explicitly use the extension to send data
- Can be cleared at any time by uninstalling the extension or clearing extension data
- Is not accessible to websites you visit

### Remote Storage

When you use the extension to update your game or record wins:
- Data is sent to the HuntMaster API at `https://huntmaster.vercel.app` (or your configured API URL)
- This data is subject to the HuntMaster website's privacy policy
- You can review that policy at: https://huntmaster.vercel.app/privacy

## Permissions Explained

The extension requests the following permissions:

- **`activeTab`**: Allows the extension to access the current tab's content only when you click the extension icon. We use this to detect game information from the page.

- **`storage`**: Allows the extension to save your configuration (session token, API URL) locally on your device.

- **`scripting`**: Allows the extension to inject content scripts into pages to detect game information. This only runs on pages you visit and interact with.

- **Host Permissions**: The extension is configured to communicate with:
  - `https://huntmaster.vercel.app/*` - To sync game data to your HuntMaster account
  - `http://localhost:3000/*` - For local development (not used in production)

## Data Sharing

We do NOT share, sell, or rent your data to third parties. Data is only sent to:
- The HuntMaster API service (when you explicitly choose to sync data)
- Your own configured API endpoint (if you're using a custom server)

## User Control

You have full control over your data:

- **Clear Configuration**: You can clear your session token and API configuration at any time through the extension popup
- **Uninstall**: Uninstalling the extension removes all locally stored data
- **Opt Out**: You can stop using the extension at any time, and no further data will be collected

## Security

- Your session token is stored using Chrome's secure storage APIs
- All API communication uses HTTPS encryption
- We follow browser security best practices for extension development

## Children's Privacy

This extension is not intended for users under the age of 18 (or the legal gambling age in your jurisdiction). We do not knowingly collect data from minors.

## Changes to This Policy

We may update this privacy policy from time to time. The "Last Updated" date at the top indicates when changes were made. Continued use of the extension after changes constitutes acceptance of the updated policy.

## Contact

For questions about this privacy policy or the extension:
- Website: https://huntmaster.vercel.app
- Email: [YOUR_EMAIL_HERE]

## Compliance

This extension complies with:
- Chrome Web Store Developer Program Policies
- General Data Protection Regulation (GDPR) principles
- Browser extension security best practices

---

**Note**: Replace `[DATE]` and `[YOUR_EMAIL_HERE]` with actual values before submitting to Chrome Web Store.







