# Installing the HuntMaster Game Detector Extension

## Quick Installation Guide

### Option 1: Chrome/Edge (Easiest)

1. **Download the Extension:**
   - Download the entire `browser-extension` folder as a ZIP file
   - Extract it to a location you remember (e.g., `C:\Extensions\huntmaster-extension\`)

2. **Open Extensions Page:**
   - Open Chrome or Edge
   - Type `chrome://extensions/` in the address bar (or `edge://extensions/` for Edge)
   - Press Enter

3. **Enable Developer Mode:**
   - Look for "Developer mode" toggle in the top-right corner
   - Turn it ON

4. **Load the Extension:**
   - Click "Load unpacked" button
   - Navigate to and select the `browser-extension` folder
   - Click "Select Folder"

5. **Done!**
   - The extension icon should appear in your toolbar
   - Click it to configure

### Option 2: Firefox

1. **Download the Extension:**
   - Download the entire `browser-extension` folder as a ZIP file
   - Extract it to a location you remember

2. **Open Firefox Debugging:**
   - Type `about:debugging` in the address bar
   - Press Enter

3. **Load Temporary Add-on:**
   - Click "This Firefox" in the left sidebar
   - Click "Load Temporary Add-on..." button
   - Navigate to and select the `manifest.json` file inside the `browser-extension` folder

4. **Done!**
   - The extension should appear in your add-ons list
   - Note: Temporary add-ons are removed when Firefox closes (you'll need to reload it each time)

## Configuration

After installing:

1. **Get Your Session Token:**
   - Log in to HuntMaster at https://huntmaster.vercel.app (or localhost:3000)
   - Click "Copy ID for Browser Extension" button in the dashboard
   - Your session token is copied to clipboard

2. **Configure Extension:**
   - Click the extension icon in your browser toolbar
   - Scroll to "API Configuration"
   - Paste your session token in the "Session Token" field
   - Set API Base URL: `https://huntmaster.vercel.app` (or `http://localhost:3000` for local dev)
   - Click "Save Configuration"
   - You should see "Logged in as: [Your Username]"

3. **Start Using:**
   - Navigate to any casino site
   - Click the extension icon
   - It will automatically detect the game you're playing
   - Click "Update Current Game" to sync to HuntMaster!

## Troubleshooting

### Extension icon not showing?
- Make sure Developer mode is enabled
- Check that all files are in the `browser-extension` folder
- Try reloading the extension (click the refresh icon on the extension card)

### "Invalid session token" error?
- Make sure you copied the entire token (it's very long)
- Try copying it again from the HuntMaster dashboard
- Make sure you're logged in when copying the token

### Game not detected?
- Click "🔄 Refresh Detection" button in the extension
- Try manually entering the game name in "Manual Entry" section

## Important: Manual Installation Required

⚠️ **This extension does NOT auto-update automatically.** When you install from a ZIP file, it's loaded as an "unpacked extension" which requires manual updates.

### How Updates Work:

**Current Method (ZIP file distribution):**
- ❌ **Does NOT auto-update** - Users must manually update
- When a new version is released:
  1. Download the new `huntmaster-extension.zip`
  2. Extract it (replacing old files)
  3. Go to `chrome://extensions/`
  4. Click the refresh icon on the extension card
  5. Done!

**If you want auto-updates:**
You need to publish to Chrome Web Store or use an update server:

1. **Chrome Web Store (Recommended for auto-updates):**
   - Create a Chrome Web Store developer account ($5 one-time fee)
   - Package the extension (use the packaging scripts provided)
   - Submit for review
   - ✅ Users can install with one click!
   - ✅ Extension will auto-update when you publish new versions

2. **Custom Update Server:**
   - Host the extension on your server
   - Update `manifest.json` with update URL
   - ✅ Extension will auto-update for users
   - Requires maintaining update infrastructure

3. **Current Method: GitHub Releases:**
   - Create releases on GitHub with extension ZIP
   - Users download and install manually
   - ❌ Requires manual updates each time

## Need Help?

If you encounter issues:
1. Check the browser console (F12 → Console tab)
2. Check extension errors (chrome://extensions → Errors button)
3. Make sure all required files are present in the extension folder
