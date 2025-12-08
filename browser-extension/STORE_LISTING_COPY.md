# Chrome Web Store Listing Copy

Ready-to-use copy for your Chrome Web Store listing. Copy and paste these directly into the submission form.

## App Name
```
HuntMaster Game Detector
```

## Short Description (132 characters max)
```
Automatically detects casino games and syncs to your HuntMaster Now Playing widget
```
*Character count: 82/132* ✅

## Detailed Description

Copy this into the "Detailed Description" field:

```
🎮 HuntMaster Game Detector - Your Casino Game Tracking Companion

Automatically detect and sync the games you're playing on casino sites directly to your HuntMaster dashboard. Never manually update your "Now Playing" status again!

✨ Features:

🔍 Automatic Game Detection
• Automatically detects game names and providers from casino websites
• Works with major casino platforms
• Smart detection using multiple methods (page titles, DOM selectors, meta tags)

⚡ One-Click Sync
• Instantly update your HuntMaster "Now Playing" widget
• Manual entry option if auto-detection doesn't work
• Clear game status when you're done playing

💰 Win Recording
• Record your stakes and win amounts
• Automatic multiplier (X Win) calculation
• Track your gaming sessions directly from the extension

🎯 Easy Setup
• Simple configuration with session token from HuntMaster dashboard
• Supports both production and local development APIs
• All data stored securely on your device

🔒 Privacy First
• All configuration stored locally in your browser
• No data sent unless you explicitly choose to sync
• Full control over your data

Perfect for casino game enthusiasts who want to track their playing sessions and share their current game status with friends or on their HuntMaster profile.

Get started:
1. Install the extension
2. Get your session token from HuntMaster dashboard
3. Configure the extension with your token
4. Visit a casino site and start playing!
5. Click the extension icon to sync your current game

Support: https://huntmaster.vercel.app
```

*Character count: ~1,400/16,000* ✅

## Promotional Text (Optional, 132 characters max)
```
Track your casino gaming sessions and automatically update your HuntMaster status!
```
*Character count: 75/132* ✅

## Category Selection
- Primary Category: **Productivity** (recommended)
- Alternative: **Social** (if you want to emphasize social sharing aspect)

## Language
```
English
```

## Privacy Policy URL
```
https://huntmaster.vercel.app/privacy
```
*Note: Make sure this URL is live before submitting. You can host the privacy policy from PRIVACY_POLICY.md*

## Permission Justifications

When Chrome Web Store asks you to justify permissions, use these explanations:

### activeTab
```
Needed to detect game information from the current page when the user clicks the extension icon. This permission allows the extension to access only the currently active tab, not all tabs or browsing history.
```

### storage
```
Stores the user's session token and API configuration locally on their device. This allows the extension to remember user settings between browser sessions. Data is stored using Chrome's secure storage API and never leaves the device unless explicitly sent by the user.
```

### scripting
```
Injects content scripts into casino websites to detect game names and providers from the page. This only runs on pages the user visits and is necessary for automatic game detection functionality.
```

### host_permissions (https://huntmaster.vercel.app/*)
```
Allows the extension to communicate with the HuntMaster API service to sync game data to the user's account. This is the core functionality that enables updating the user's "Now Playing" status.
```

### host_permissions (http://localhost:3000/*)
```
Allows local development and testing. This permission is only used for developers testing the HuntMaster service locally and does not affect production users.
```

## Promotional Images (Optional)

### Small Promotional Tile (440x280)
**If you create one, suggested content:**
- Extension icon/logo
- Text: "Auto-detect Casino Games"
- Text: "Sync to HuntMaster"

### Marquee Promotional Tile (1400x560)
**If you create one, suggested content:**
- Large extension icon
- Screenshot of extension popup
- Main value proposition: "Never manually update your game status again"

## Single Purpose Declaration

**Question:** Does your extension have a single purpose?

**Answer:** Yes

**Explanation:**
```
The extension has one clear purpose: to automatically detect casino games being played and sync that information to the user's HuntMaster dashboard. All features (game detection, status updates, win recording) support this single core purpose.
```

## User Data Disclosure

**Question:** Does your extension collect, transmit, use, or share user data?

**Answer:** Yes

**Details:**
- **What data:** Session token (for authentication), game names, provider names, win records (stake amounts, win amounts, multipliers)
- **How used:** Authentication with HuntMaster API, syncing game status, recording gaming sessions
- **Shared with:** HuntMaster API service only (user's own account)
- **Encryption:** Yes, all communication uses HTTPS
- **User control:** Users can clear data at any time, data stored locally until explicitly synced

---

**Ready to submit?** See `CHROME_STORE_SUBMISSION.md` for complete step-by-step instructions!






