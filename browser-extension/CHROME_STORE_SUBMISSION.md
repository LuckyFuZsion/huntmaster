# Chrome Web Store Submission Guide

Complete guide for submitting HuntMaster Game Detector to the Chrome Web Store.

## Prerequisites

1. **Google Account** - Sign up for a Google account if you don't have one
2. **Chrome Web Store Developer Account** - Register at [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
   - One-time $5 USD registration fee
   - Payment via credit card or Google Wallet
3. **Privacy Policy URL** - Required for submission
   - Host privacy policy on your website (e.g., `https://huntmaster.vercel.app/privacy`)
   - Or use a free hosting service like GitHub Pages

## Step 1: Prepare the Extension Package

### Option A: Windows
```bash
cd browser-extension
package-chrome-store.bat
```

### Option B: Mac/Linux
```bash
cd browser-extension
chmod +x package-chrome-store.sh
./package-chrome-store.sh
```

This creates `huntmaster-chrome-store.zip` - **this is what you'll upload to the store**.

## Step 2: Prepare Store Assets

### Required Images

1. **Screenshot** (1280x800 or 640x400 pixels)
   - At least 1 screenshot showing the extension in use
   - Recommended: Show the popup interface with game detection

2. **Small Promotional Tile** (440x280 pixels)
   - Optional but recommended for featured placement
   - Shows your extension's main value proposition

3. **Marquee Promotional Tile** (1400x560 pixels)
   - Optional, for featured homepage placement
   - Large promotional image

**Note**: You already have icons (16x16, 48x48, 128x128) which are included in the ZIP.

### Creating Screenshots

1. Open the extension popup
2. Take a screenshot showing:
   - Game detection in action
   - The extension interface
   - User configuration options
3. Crop/resize to required dimensions
4. Save as PNG or JPEG

## Step 3: Write Store Listing Copy

### App Name
```
HuntMaster Game Detector
```

### Short Description (132 characters max)
```
Automatically detects casino games and syncs to your HuntMaster Now Playing widget
```

### Detailed Description (132 characters min, 16,000 characters max)
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

### Category
```
Productivity
```
(Or "Social" if you prefer - choose based on your primary use case)

### Language
```
English
```

### Promotional Text (Optional, 132 characters max)
```
Track your casino gaming sessions and automatically update your HuntMaster status!
```

## Step 4: Upload to Chrome Web Store

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Click **"New Item"** button
3. Click **"Upload"** and select `huntmaster-chrome-store.zip`
4. Fill in the store listing form with the information from Step 3

### Store Listing Form Fields

**1. Store Listing**
- App name: `HuntMaster Game Detector`
- Short description: [Use text from Step 3]
- Detailed description: [Use text from Step 3]
- Category: `Productivity`
- Language: `English`
- Privacy policy URL: `https://huntmaster.vercel.app/privacy` (or your hosted URL)

**2. Graphics**
- Small promotional tile (440x280): [Upload if you have one]
- Marquee promotional tile (1400x560): [Upload if you have one]
- Screenshot 1 (1280x800): [Required - upload screenshot]
- Additional screenshots: [Optional]

**3. Distribution**
- Countries/regions: Select "All countries/regions" or specific ones
- Visibility: 
  - **Unlisted** (recommended for testing) - Users need direct link
  - **Public** - Visible in Chrome Web Store search

**4. Privacy**
- Single purpose: Yes (the extension has one clear purpose)
- User data: Answer questions about data collection
  - User data collected: Yes (session token, game data)
  - How data is used: Authentication and service functionality
  - Data shared: No (except with user's HuntMaster account)
  - Encryption: Yes (HTTPS)

**5. Permissions**
Chrome will auto-detect permissions from manifest.json. Review and add justification:

- **activeTab**: "Needed to detect game information from the current page when user clicks extension icon"
- **storage**: "Stores user's session token and API configuration locally on device"
- **scripting**: "Injects content scripts to detect game names and providers from casino sites"
- **host_permissions**: "Communicates with HuntMaster API to sync game data to user's account"

## Step 5: Review and Submit

1. Review all information for accuracy
2. Check privacy policy URL is accessible
3. Ensure all required fields are filled
4. Click **"Submit for Review"**

## Step 6: Review Process

- **Initial Review**: Usually 1-3 business days
- **Status Updates**: Check developer dashboard for status
- **Common Issues**:
  - Privacy policy not accessible (fix URL)
  - Permissions not justified (add clearer descriptions)
  - Screenshots missing (add required screenshot)
  - Content policy violations (review Chrome Web Store policies)

## Step 7: After Approval

Once approved:
- Extension is live in Chrome Web Store
- Users can install with one click
- Updates are automatic when you publish new versions

### Publishing Updates

1. Update `version` in `manifest.json` (e.g., "1.0.1")
2. Run `package-chrome-store.bat` or `package-chrome-store.sh` again
3. Go to Chrome Web Store Developer Dashboard
4. Select your extension
5. Click "Upload Updated Package"
6. Upload new ZIP file
7. Submit for review (updates usually review faster, ~1 day)

## Tips for Approval

✅ **DO:**
- Clearly explain all permissions
- Provide a working privacy policy URL
- Use high-quality screenshots
- Test the extension thoroughly before submission
- Ensure the extension works without errors

❌ **DON'T:**
- Use copyrighted images without permission
- Violate Chrome Web Store content policies
- Collect unnecessary data
- Hide what your extension does
- Submit a broken or incomplete extension

## Troubleshooting

### Extension Rejected?

Common reasons:
1. **Privacy Policy Issues**: Ensure URL is accessible and policy matches what extension does
2. **Permission Justification**: Add clear explanations for each permission
3. **Content Policy**: Review [Chrome Web Store Content Policies](https://developer.chrome.com/docs/webstore/program-policies/)
4. **Functionality**: Extension must work as described

### Need to Make Changes?

- Go to Developer Dashboard
- Select your extension
- Edit store listing or upload new package
- Resubmit for review

## Support Resources

- [Chrome Web Store Developer Documentation](https://developer.chrome.com/docs/webstore/)
- [Chrome Web Store Developer Support](https://support.google.com/chrome_webstore/)
- [Content Policy Guidelines](https://developer.chrome.com/docs/webstore/program-policies/)

## Checklist Before Submission

- [ ] Extension package created (`huntmaster-chrome-store.zip`)
- [ ] Privacy policy hosted and URL verified
- [ ] Screenshot created (1280x800 or 640x400)
- [ ] Store listing copy written
- [ ] All permissions justified
- [ ] Extension tested and working
- [ ] Manifest version number is correct
- [ ] Icons are included (16, 48, 128px)
- [ ] No dev files in ZIP package
- [ ] Chrome Web Store Developer account created ($5 fee paid)

---

**Good luck with your submission!** 🚀







