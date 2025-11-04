# Upload to Production - Google Play Console Step-by-Step Guide

## Complete Guide: From Build to Production Upload

---

## PART 1: Build Your App with EAS

Before uploading to Play Console, you need to build the .aab file.

### Step 1: Login to Expo

```bash
cd /app/frontend
npx expo login
```

**Enter your Expo credentials when prompted.**

### Step 2: Start Production Build

```bash
eas build --platform android --profile production
```

**What happens:**
- EAS starts building in the cloud (15-20 minutes)
- You'll see a link to track build progress
- When complete, you get a download link for the .aab file

**Example output:**
```
✔ Build complete!
📦 Download: https://expo.dev/accounts/[your-account]/projects/[project]/builds/[build-id]
```

### Step 3: Download the .aab File

1. Click the download link from EAS
2. Or go to: https://expo.dev → Your Projects → Divine Cakery → Builds
3. Download the `.aab` file to your computer
4. Note the file location (e.g., `Downloads/build-xxxxx.aab`)

---

## PART 2: Upload to Google Play Console - Production Track

### Step 1: Access Play Console

1. Go to: https://play.google.com/console/
2. Login with your Google Play developer account
3. Click on your app: **"Divine Cakery"**

### Step 2: Navigate to Production

**Option A: From Dashboard**
```
Dashboard → Production → Releases → Create new release
```

**Option B: From Sidebar**
```
Left Sidebar → Release → Production → Create new release
```

**What you'll see:**
```
Production
├── Countries/regions: [Your selected countries]
├── Track: Production
└── [Create new release] button
```

### Step 3: Create New Release

1. Click **"Create new release"** button
2. You'll see the release creation page

---

## PART 3: Fill in Release Details

### Section 1: App Bundles

**Upload your .aab file:**

1. Look for **"App bundles"** section at the top
2. Click **"Upload"** button
3. Select your downloaded `.aab` file
4. Wait for upload to complete (shows progress bar)
5. File size will be displayed (usually 20-50 MB)

**Google automatically:**
- Validates the bundle
- Extracts version information
- Checks signing key
- Shows app version (e.g., 1.0.0)

### Section 2: Release Name

**Format:** Version number + description

**Example:**
```
1.0.0 - Initial Release
```

Or simply:
```
1.0.0
```

### Section 3: Release Notes

**What's new in this release:**

For first release, write:

```
Initial release of Divine Cakery - Wholesale Bakery App

✨ Features:
• Browse premium bakery products with detailed information
• FSSAI-compliant food labeling (veg/non-veg indicators)
• Easy ordering with shopping cart
• Multiple delivery options
• Secure digital wallet with UPI payments
• Order tracking and history
• Favorites list for quick reordering
• WhatsApp customer support

Perfect for hotels, restaurants, and catering businesses in Thiruvananthapuram.

We appreciate your feedback! Contact us at:
📧 contact@divinecakery.in
📱 +91 9544183334
```

**Character limit:** 500 characters per language

**For future updates, write what changed:**
```
Version 1.1.0 - Bug Fixes and Improvements

• Fixed login issues
• Improved cart performance
• Added new products
• Enhanced UI/UX
• Bug fixes and stability improvements
```

### Section 4: Review Release

Before submitting, verify:

- [ ] Correct .aab file uploaded
- [ ] Version number is correct (1.0.0)
- [ ] Release notes are complete
- [ ] No error messages shown

---

## PART 4: Complete Store Listing (If Not Done)

Before you can submit to production, ensure these sections are complete:

### 1. Main Store Listing

**Navigate:** Left Sidebar → Store presence → Main store listing

**Required fields:**
- [x] App name: Divine Cakery
- [x] Short description (80 chars max)
- [x] Full description (4000 chars max)
- [x] App icon (512×512 px)
- [x] Feature graphic (1024×500 px)
- [x] Screenshots (minimum 2, recommend 4-8)
- [x] App category: Business
- [x] Contact email: contact@divinecakery.in
- [x] Contact phone: +919544183334

### 2. App Content

**Navigate:** Left Sidebar → App content

**Complete these sections:**

**a) Privacy Policy**
- URL: `https://divinecakery.github.io/divine-cakery-privacy/`

**b) App Access**
- Select: "All functionality is available without special access"
- Or provide test credentials if login required

**c) Ads**
- Select: "No, my app does not contain ads"

**d) Content Rating**
- Complete questionnaire
- Should get "Everyone" rating

**e) Target Audience**
- Select: "18 & over"

**f) Data Safety**
- Declare what data you collect
- For your app: Name, Email, Phone, Address, Payment info
- Purpose: Order processing, Customer support
- Security: Encrypted in transit, Can request deletion

**g) Government Apps**
- Select: "No"

### 3. Pricing & Distribution

**Navigate:** Left Sidebar → Store presence → Pricing & distribution

**Required:**
- [x] Free or paid: Free
- [x] Countries: India (at minimum)
- [x] Contains ads: No
- [x] Primarily child-directed: No

---

## PART 5: Submit Release to Production

### Step 1: Review Release

After uploading .aab and filling details:

1. Scroll to bottom of release page
2. Click **"Review release"** button
3. You'll see a summary page

### Step 2: Check for Issues

**Green checkmarks = Good:**
- ✅ App bundle uploaded
- ✅ Release notes added
- ✅ All required sections complete

**Red warnings = Need to fix:**
- ⚠️ Complete store listing
- ⚠️ Add content rating
- ⚠️ Fix data safety section

**Fix any issues before proceeding.**

### Step 3: Start Rollout

Once everything is green:

1. Click **"Start rollout to Production"** button
2. A confirmation dialog appears:

```
Start rollout to production?

Your app will be available to 100% of users in the 
countries/regions you selected.

This action cannot be undone.

[Cancel] [Start rollout]
```

3. Click **"Start rollout"** (or "Confirm" or "Start")

### Step 4: Submission Confirmation

You'll see:
```
✅ Your release is being reviewed by Google Play

We'll review your app and let you know when it's 
approved, typically within 3-7 days.

You can track the status on the Production page.
```

---

## PART 6: Track Review Status

### Where to Check Status

**Navigate:** Dashboard → Production → Releases

**Review Stages:**

1. **Pending publication** → Just submitted
2. **Being reviewed** → Google is reviewing (1-3 days)
3. **Approved** → Passed review
4. **Published** → Live on Play Store! 🎉

### Email Notifications

You'll receive emails at:
- When review starts
- If changes are requested
- When approved
- When published

**Check your email regularly!**

---

## PART 7: What Happens During Review

### Google Reviews (3-7 days):

**Automated checks:**
- App crashes/stability
- Malware/virus scan
- API level compatibility
- Security vulnerabilities

**Manual review:**
- Privacy policy compliance
- Content rating accuracy
- Description matches functionality
- No policy violations
- App actually works

### Common Rejection Reasons (And Your Status):

❌ **No privacy policy** → ✅ You have one
❌ **Broken app/crashes** → ✅ Tested and working
❌ **Misleading description** → ✅ Accurate description
❌ **Missing permissions declaration** → ✅ Properly configured
❌ **Inappropriate content** → ✅ Business app, clean content

**You should pass review on first try!**

---

## PART 8: After Approval

### Your App Goes Live

**Congratulations! Your app is now available on Google Play Store!**

**Play Store Link:**
```
https://play.google.com/store/apps/details?id=com.divinecakery.app
```

### What to Do Next:

1. **Test the live version**
   - Download from Play Store
   - Test all functionality
   - Verify everything works

2. **Share with customers**
   - Send Play Store link via WhatsApp
   - Post on social media
   - Email to existing customers
   - Add to website

3. **Monitor reviews**
   - Check user reviews daily
   - Respond to feedback
   - Address issues quickly

4. **Track metrics**
   - Monitor installs
   - Check crash reports
   - View user retention

---

## Quick Reference Commands

### Build App:
```bash
cd /app/frontend
npx expo login
eas build --platform android --profile production
```

### Play Console URLs:
- Console: https://play.google.com/console/
- Production: https://play.google.com/console/u/0/developers/[ID]/app/[APP_ID]/tracks/production
- Store Listing: https://play.google.com/console/u/0/developers/[ID]/app/[APP_ID]/store-presence/main

---

## Troubleshooting

### Issue: Can't Find "Production" Section

**Solution:**
- Look in left sidebar under "Release"
- Or use search box in Play Console
- Click "Release" → "Production"

### Issue: "Create release" Button Disabled

**Reason:** Store listing incomplete

**Solution:**
- Check all sections have green checkmarks
- Complete any red warning sections
- Common missing: Privacy policy, Content rating, Data safety

### Issue: Upload Fails

**Reasons:**
- .aab file corrupted
- Wrong file format (should be .aab not .apk)
- Network issue

**Solution:**
- Try uploading again
- Use Chrome browser
- Check internet connection
- Rebuild if necessary

### Issue: "Version already exists"

**Reason:** You uploaded this version before

**Solution:**
- Increment version in app.json
- Change: `"version": "1.0.1"` and `"versionCode": 2`
- Rebuild with new version

---

## Need Help?

**If you get stuck:**
1. Check the help icon (?) next to each field in Play Console
2. Visit: https://support.google.com/googleplay/android-developer/
3. Let me know the exact error message you see
4. I'll guide you through the specific issue

---

## Summary Checklist

**Before Upload:**
- [ ] Built .aab file with EAS
- [ ] Downloaded .aab to computer
- [ ] All store listing sections complete
- [ ] Privacy policy URL added
- [ ] Screenshots uploaded
- [ ] Feature graphic uploaded

**During Upload:**
- [ ] Logged into Play Console
- [ ] Navigated to Production → Create release
- [ ] Uploaded .aab file
- [ ] Added release name (1.0.0)
- [ ] Added release notes
- [ ] Clicked "Review release"
- [ ] Fixed any warnings
- [ ] Clicked "Start rollout to Production"

**After Upload:**
- [ ] Confirmation message received
- [ ] Email notification received
- [ ] Monitoring review status
- [ ] Waiting 3-7 days for approval

---

**Ready to start? The first step is building the app with EAS!**

Let me know if you need help with any specific step!
