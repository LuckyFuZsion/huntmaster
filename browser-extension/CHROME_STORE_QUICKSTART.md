# Chrome Web Store Submission - Quick Start

Get your extension published quickly with this step-by-step guide.

## 🚀 Quick Start (5 Steps)

### 1. Create Chrome Web Store Developer Account
- Visit: https://chrome.google.com/webstore/devconsole
- Sign in with Google account
- Pay $5 USD one-time registration fee
- ✅ Done!

### 2. Package Your Extension

**Windows:**
```bash
cd browser-extension
package-chrome-store.bat
```

**Mac/Linux:**
```bash
cd browser-extension
chmod +x package-chrome-store.sh
./package-chrome-store.sh
```

This creates `huntmaster-chrome-store.zip` - **upload this file**.

### 3. Host Privacy Policy

1. Copy content from `PRIVACY_POLICY.md`
2. Host it on your website (e.g., `https://huntmaster.vercel.app/privacy`)
   - Or use GitHub Pages, Netlify, Vercel, etc.
3. Update the date and email in the privacy policy
4. Verify the URL is accessible

### 4. Take a Screenshot

1. Open your extension popup
2. Take a screenshot (1280x800 or 640x400 pixels)
3. Save as PNG or JPEG

### 5. Submit to Chrome Web Store

1. Go to: https://chrome.google.com/webstore/devconsole
2. Click **"New Item"**
3. Upload `huntmaster-chrome-store.zip`
4. Fill in the form using copy from `STORE_LISTING_COPY.md`
5. Add your screenshot
6. Enter privacy policy URL
7. Justify permissions (see `STORE_LISTING_COPY.md`)
8. Click **"Submit for Review"**

## 📋 Detailed Guides

- **Complete submission process**: `CHROME_STORE_SUBMISSION.md`
- **Ready-to-use copy**: `STORE_LISTING_COPY.md`
- **Privacy policy template**: `PRIVACY_POLICY.md`
- **Quick checklist**: `SUBMISSION_CHECKLIST.md`

## ⚡ Key Information

### Package File
- **File**: `huntmaster-chrome-store.zip`
- **Created by**: `package-chrome-store.bat` or `package-chrome-store.sh`
- **Contains**: Only production files (no dev files)

### Required Assets
- ✅ Icons (16, 48, 128px) - Already included
- ✅ Screenshot (1280x800) - You need to create
- ⚠️ Privacy policy URL - You need to host

### Store Listing Info
- **Name**: HuntMaster Game Detector
- **Category**: Productivity (recommended)
- **Privacy URL**: `https://huntmaster.vercel.app/privacy` (or your URL)

### Permission Justifications
All prepared in `STORE_LISTING_COPY.md` - just copy and paste!

## 🎯 What Happens Next?

1. **Review Process**: 1-3 business days
2. **Status Updates**: Check developer dashboard
3. **If Approved**: Extension goes live! 🎉
4. **If Rejected**: Fix issues and resubmit

## ❓ Common Questions

**Q: How long does review take?**  
A: Usually 1-3 business days for initial submission, faster for updates.

**Q: What if my extension is rejected?**  
A: Common reasons: privacy policy issues, unclear permissions, content policy violations. Fix and resubmit.

**Q: Do I need screenshots?**  
A: Yes, at least 1 screenshot (1280x800 or 640x400) is required.

**Q: Can I update my extension later?**  
A: Yes! Just bump the version in `manifest.json`, repackage, and upload the new ZIP.

**Q: Will users get automatic updates?**  
A: Yes! Once published, updates are automatic when you publish new versions.

## 🔗 Important Links

- [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
- [Chrome Web Store Developer Documentation](https://developer.chrome.com/docs/webstore/)
- [Content Policy Guidelines](https://developer.chrome.com/docs/webstore/program-policies/)

---

**Ready to submit?** Start with Step 1 above! 🚀

For detailed instructions, see `CHROME_STORE_SUBMISSION.md`.

