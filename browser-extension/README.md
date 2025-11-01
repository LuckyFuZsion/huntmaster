# HuntMaster Game Detector Browser Extension

Automatically detects the game you're playing on casino sites and updates your HuntMaster Now Playing widget.

## Quick Start

**For Users:**
1. Download the `huntmaster-extension.zip` file
2. Extract it to a folder (e.g., `C:\Extensions\huntmaster-extension\`)
3. Follow the [Installation Guide](INSTALLATION.md)

**Note:** Extensions installed from ZIP files do NOT auto-update. When a new version is released, you'll need to download the new ZIP, extract it, and reload the extension in `chrome://extensions/`.

**For Developers:**
1. Clone/download this repository
2. Navigate to the `browser-extension` folder
3. Follow installation steps below

## Installation

### Chrome / Edge (Chromium-based)

1. Open Chrome/Edge and navigate to `chrome://extensions/` (or `edge://extensions/`)
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `browser-extension` folder from this project
5. The extension icon should appear in your toolbar

### Firefox

1. Open Firefox and navigate to `about:debugging`
2. Click "This Firefox" in the left sidebar
3. Click "Load Temporary Add-on"
4. Select the `manifest.json` file from the `browser-extension` folder

## Setup

### Step 1: Get Your Session Token

1. Log in to HuntMaster (https://huntmaster.vercel.app)
2. Click **"Copy ID for Browser Extension"** button in the dashboard
3. Your session token is automatically copied to clipboard

### Step 2: Configure the Extension

1. Click the extension icon in your browser toolbar
2. Scroll to "API Configuration"
3. Paste your session token into the "Session Token" field
4. Set the API Base URL (default: `https://huntmaster.vercel.app` or `http://localhost:3000` for local development)
5. Click "Save Configuration"
6. You should see "Logged in as: [Your Username]" appear at the top!

## Usage

### Automatic Detection

1. Navigate to a casino site and start playing a game
2. Click the extension icon
3. The extension will automatically detect the game name and provider from the page
4. Click "Update Current Game" to sync it to HuntMaster
5. Your Now Playing widget will update within 2 seconds!

### Manual Entry

1. Click the extension icon
2. Enter the game name manually
3. Optionally enter the provider
4. Click "Update Current Game"

### Clearing the Current Game

Click "Clear Current Game" when you're done playing.

## How Detection Works

The extension detects games using multiple methods:

1. **Page Title Parsing** - Extracts game name from page titles like "Gates of Olympus - Pragmatic Play"
2. **DOM Selectors** - Looks for common CSS classes/IDs that casinos use for game names
3. **Meta Tags** - Checks Open Graph and custom meta tags

## Troubleshooting

### Game Not Detected

- Click "🔄 Refresh Detection" to re-scan the page
- Try manually entering the game name
- Some casino sites load games dynamically - wait a few seconds and refresh

### "Please configure your session token" Error

- Make sure you've copied the session token from localStorage
- Ensure you're logged into HuntMaster when copying the token
- Try refreshing the token if it's expired

### API Errors

- Check that your API Base URL is correct
- For local development, use `http://localhost:3000`
- For production, use `https://huntmaster.vercel.app`
- Make sure you're connected to the internet

## Security Note

The session token is stored locally in your browser's extension storage. It's never sent anywhere except to your HuntMaster API. However, be careful not to share your session token publicly.

## Development

To modify the extension:

1. Edit files in the `browser-extension` folder
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card to reload changes

## Icon Files

The extension needs icon files (`icon16.png`, `icon48.png`, `icon128.png`). You can create simple placeholder icons or use your HuntMaster logo. The icons should be:
- 16x16 pixels (toolbar icon)
- 48x48 pixels (extension management)
- 128x128 pixels (Chrome Web Store)

## Support

If you encounter issues, check:
1. Browser console for errors (F12)
2. Extension popup console (right-click extension icon → Inspect popup)
3. Network tab to see API requests


