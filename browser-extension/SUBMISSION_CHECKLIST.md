# Chrome Web Store Submission Checklist

Quick reference checklist to ensure everything is ready before submission.

## Pre-Submission Checklist

### Account Setup
- [ ] Google account created/verified
- [ ] Chrome Web Store Developer account created
- [ ] $5 USD registration fee paid
- [ ] Can access [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)

### Extension Package
- [ ] Extension tested and working correctly
- [ ] No console errors or warnings
- [ ] All features functioning (detection, sync, win recording)
- [ ] Package created using `package-chrome-store.bat` or `package-chrome-store.sh`
- [ ] `huntmaster-chrome-store.zip` file created
- [ ] ZIP contains only production files (no dev files)
- [ ] Icons included (16, 48, 128px)
- [ ] Manifest version number is correct

### Privacy Policy
- [ ] Privacy policy written (see `PRIVACY_POLICY.md`)
- [ ] Privacy policy hosted at public URL
- [ ] URL accessible (test the link)
- [ ] Privacy policy matches extension functionality
- [ ] Date and contact email updated in privacy policy

### Store Assets
- [ ] Screenshot created (1280x800 or 640x400 pixels)
  - Shows extension popup interface
  - Displays game detection feature
- [ ] (Optional) Small promotional tile (440x280)
- [ ] (Optional) Marquee promotional tile (1400x560)

### Store Listing Copy
- [ ] App name ready (`HuntMaster Game Detector`)
- [ ] Short description written (see `STORE_LISTING_COPY.md`)
- [ ] Detailed description written
- [ ] Promotional text written (optional)
- [ ] Category selected (`Productivity` recommended)
- [ ] Permission justifications prepared (see `STORE_LISTING_COPY.md`)

### Permissions Review
- [ ] All permissions in manifest are necessary
- [ ] Justifications written for each permission
- [ ] User data disclosure answered
- [ ] Single purpose declaration completed

### Testing
- [ ] Extension works in Chrome
- [ ] Extension works in Edge (Chromium)
- [ ] Game detection works on test casino sites
- [ ] API sync functionality works
- [ ] Configuration saves correctly
- [ ] No JavaScript errors in console
- [ ] Popup displays correctly
- [ ] Icons display correctly

### Content Policy Compliance
- [ ] Extension doesn't violate Chrome Web Store content policies
- [ ] No copyrighted content used without permission
- [ ] Extension description is accurate
- [ ] No misleading information

## Submission Steps

### Step 1: Upload Package
- [ ] Go to Chrome Web Store Developer Dashboard
- [ ] Click "New Item"
- [ ] Upload `huntmaster-chrome-store.zip`

### Step 2: Fill Store Listing
- [ ] Enter app name
- [ ] Enter short description
- [ ] Enter detailed description
- [ ] Select category
- [ ] Add privacy policy URL
- [ ] Upload screenshot(s)
- [ ] Upload promotional tiles (optional)

### Step 3: Configure Distribution
- [ ] Select countries/regions
- [ ] Choose visibility (Unlisted for testing, Public for release)
- [ ] Review pricing (Free)

### Step 4: Complete Privacy Section
- [ ] Answer single purpose question: Yes
- [ ] Complete user data disclosure
- [ ] Add permission justifications

### Step 5: Submit
- [ ] Review all information
- [ ] Verify privacy policy URL works
- [ ] Double-check all required fields
- [ ] Click "Submit for Review"

## Post-Submission

- [ ] Check email for submission confirmation
- [ ] Monitor developer dashboard for status updates
- [ ] Respond to any review questions promptly
- [ ] Address any rejection reasons if needed
- [ ] Resubmit after fixing issues

## After Approval

- [ ] Test installation from Chrome Web Store
- [ ] Verify extension works after store installation
- [ ] Monitor user feedback
- [ ] Plan update schedule

---

**Need Help?**
- Review `CHROME_STORE_SUBMISSION.md` for detailed instructions
- Check `STORE_LISTING_COPY.md` for ready-to-use copy
- See `PRIVACY_POLICY.md` for privacy policy template

