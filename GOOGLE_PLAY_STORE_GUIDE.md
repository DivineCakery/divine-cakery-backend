# Google Play Store Deployment Guide - Divine Cakery

This guide will walk you through publishing The Divine Cakery app to Google Play Store.

## Prerequisites Checklist

Before starting, ensure you have:
- [ ] Google Play Console account ($25 one-time registration fee)
- [ ] Expo account (free - already configured in this project)
- [ ] App fully tested and ready for production
- [ ] Privacy Policy URL (required by Google)
- [ ] Marketing assets ready (screenshots, app icon, feature graphic)

## Step 1: Google Play Console Setup

### 1.1 Create Google Play Console Account
1. Go to https://play.google.com/console/signup
2. Pay the $25 one-time registration fee
3. Complete the account setup and verification
4. Accept the Developer Distribution Agreement

### 1.2 Create a New App
1. In Play Console, click **"Create app"**
2. Fill in the details:
   - **App name**: Divine Cakery
   - **Default language**: English (United States)
   - **App or game**: App
   - **Free or paid**: Free
3. Declare if app contains ads (No, unless you added ads)
4. Accept the declarations and create app

## Step 2: Build Production App Bundle

### 2.1 Login to Expo
```bash
cd /app/frontend
npx expo login
```
Enter your Expo credentials when prompted.

### 2.2 Build Android App Bundle (AAB)
```bash
cd /app/frontend
eas build --platform android --profile production
```

**What happens:**
- EAS (Expo Application Services) will build your app in the cloud
- It creates an `.aab` file (Android App Bundle) - required by Google Play
- The build takes 10-20 minutes
- You'll get a download link when complete

**Download the AAB file** when the build completes.

## Step 3: Prepare App Store Listing

### 3.1 Required Assets

#### App Icon (Already created)
- Location: `/app/frontend/assets/images/icon.png`
- Size: 512×512 px
- Format: PNG (32-bit)

#### Feature Graphic (Need to create)
- Size: 1024×500 px
- Format: PNG or JPEG
- Content: App logo + tagline (e.g., "Wholesale Bakery Orders Made Easy")

#### Screenshots (Take from your app)
You need at least 2 screenshots, recommend 4-8:
1. **Products Page** - Show product catalog with categories
2. **Product Detail** - Show detailed product info with FSSAI badges
3. **Cart Page** - Show cart with items
4. **Checkout Page** - Show order placement
5. **Orders Page** - Show order history
6. **Admin Dashboard** (optional) - Show admin features

**Screenshot Requirements:**
- Minimum: 2 screenshots
- Recommended: 4-8 screenshots
- Dimensions: 1080×1920 px (9:16 ratio) for phone
- Format: PNG or JPEG
- Max file size: 8 MB per screenshot

### 3.2 App Description

**Short description** (80 characters max):
```
Wholesale bakery ordering platform for hotels, restaurants & catering businesses
```

**Full description** (up to 4000 characters):
```
Divine Cakery - Wholesale Bakery Orders Made Simple

The Divine Cakery app is your complete solution for wholesale bakery orders, designed specifically for hotels, restaurants, and catering businesses in Thiruvananthapuram.

🍞 EXCLUSIVE PRODUCT RANGE
• Premium breads, buns, and Viennese pastries
• Made with pride and passion for the hospitality industry
• 3-5 day shelf life in ambient surroundings
• Products can be chilled or frozen for extended freshness

📱 KEY FEATURES FOR CUSTOMERS
• Browse our complete product catalog with detailed information
• FSSAI-compliant food labeling (veg/non-veg indicators)
• Detailed product info: ingredients, allergens, shelf life, storage
• Multi-category product filtering
• Save favorites for quick reordering
• Shopping cart with quantity management
• Multiple delivery date options
• Order tracking and history
• Secure wallet for fast payments
• WhatsApp support integration

🎯 BUSINESS BENEFITS
• Streamlined ordering process
• Real-time product availability
• Flexible delivery scheduling
• Digital wallet for easy payments
• Order history for record keeping
• Direct communication with Divine Cakery team

🚚 DELIVERY & SERVICE
• Free delivery within Thiruvananthapuram city limits
• Orders before 4 AM: Same-day delivery
• Orders after 4 AM: Next-day delivery
• On-site pickup option available

💼 ADMIN FEATURES (For Authorized Users)
• Complete inventory management
• Order fulfillment and tracking
• Customer management with approval workflow
• Discount and pricing management
• Comprehensive reporting and analytics
• Real-time dashboard with key metrics

🔒 SECURITY & PRIVACY
• Secure authentication
• Admin approval required for new customers
• Role-based access control
• Data encryption and privacy protection

📞 SUPPORT
Phone: 9544183334
Email: contact@divinecakery.in

Perfect for restaurants, hotels, cafes, catering services, and any business in the hospitality industry looking for reliable wholesale bakery supplies in Thiruvananthapuram.

Download Divine Cakery today and experience hassle-free wholesale bakery ordering!
```

### 3.3 Category
- **Primary Category**: Business
- **Secondary Category**: Food & Drink (if available)

### 3.4 Contact Details
- **Email**: contact@divinecakery.in
- **Phone**: +91 9544183334
- **Website**: (If you have one, otherwise leave blank)

## Step 4: Privacy Policy (REQUIRED)

Google requires a privacy policy for all apps. Create one at:
- https://www.privacypolicygenerator.info/
- https://app-privacy-policy-generator.firebaseapp.com/

**Key points to include:**
- What data is collected (user registration info, orders, etc.)
- How data is used (order processing, customer service)
- Data storage and security
- User rights (access, deletion)
- Contact information

**Upload your privacy policy** to a public URL (GitHub Pages, your website, etc.)

## Step 5: Upload to Google Play Console

### 5.1 Complete App Content Section
1. Go to **"App content"** in Play Console sidebar
2. Complete all required declarations:
   - **Privacy policy**: Enter URL
   - **App access**: Describe how to test (provide test account if needed)
   - **Ads**: Select "No" (unless you have ads)
   - **Content ratings**: Complete questionnaire
   - **Target audience**: Select appropriate age groups
   - **News apps**: Select "No"
   - **COVID-19 contact tracing**: Select "No"
   - **Data safety**: Fill in data collection information
   - **Government apps**: Select "No"

### 5.2 Upload App Bundle
1. Go to **"Production"** → **"Releases"**
2. Click **"Create new release"**
3. Upload the `.aab` file you downloaded from EAS
4. Fill in **"Release name"**: e.g., "1.0.0 - Initial Release"
5. Fill in **"Release notes"**:
```
Initial release of Divine Cakery - Wholesale Bakery App

Features:
• Complete product catalog with FSSAI compliance
• Easy ordering system with cart management
• Multiple delivery options
• Secure digital wallet
• Order tracking and history
• WhatsApp customer support
• Admin dashboard for business management

Perfect for hotels, restaurants, and catering businesses in Thiruvananthapuram.
```

### 5.3 Store Listing
1. Go to **"Store presence"** → **"Main store listing"**
2. Upload all assets:
   - App icon (512×512 px)
   - Feature graphic (1024×500 px)
   - Screenshots (at least 2)
3. Enter short and full descriptions
4. Select category and tags
5. Enter contact details

### 5.4 Pricing & Distribution
1. Go to **"Store presence"** → **"Pricing & distribution"**
2. Select **"Free"**
3. Select **countries**: At minimum, select **India**
4. Select if app is primarily for children: **No**
5. Check **"Contains ads"**: No (unless you have ads)
6. Complete the **Content guidelines** form
7. Submit government consent if required

## Step 6: Submit for Review

1. Go back to **"Production"** → **"Releases"**
2. Click **"Review release"**
3. Verify all information is correct
4. Click **"Start rollout to Production"**
5. Confirm submission

### Review Timeline
- **Initial review**: 3-7 days (first app)
- **Update reviews**: 1-2 days
- You'll receive email notifications about review status

## Step 7: Post-Submission

### Track Review Status
- Check Play Console regularly for review status
- Respond promptly to any requests from Google reviewers

### App Goes Live
Once approved:
1. App will be visible on Google Play Store
2. Users can search and download
3. Share the Play Store link with customers

### Play Store Link Format
```
https://play.google.com/store/apps/details?id=com.divinecakery.app
```

## Step 8: Future Updates

### Building Updates
```bash
# Increment version in app.json first
cd /app/frontend
# Edit app.json: "version": "1.0.1", "versionCode": 2

# Build new version
eas build --platform android --profile production

# Upload to Play Console → Production → Create new release
```

## Troubleshooting

### Common Issues

**1. Build fails on EAS**
- Check if all dependencies are properly installed
- Verify app.json and eas.json are correctly configured
- Check Expo CLI is up to date: `npm install -g @expo/cli`

**2. App rejected by Google**
- Usually due to incomplete privacy policy
- Or missing required content declarations
- Follow rejection email instructions carefully

**3. Keystore issues**
- EAS handles keystores automatically
- First build creates keystore, stored securely by Expo
- Never share or lose your Expo account credentials

## Testing Before Production

### Internal Testing Track
Before submitting to production, test with a limited audience:

```bash
# Build for internal testing
eas build --platform android --profile preview

# In Play Console:
# Go to "Internal testing" track
# Upload APK and share with test users
```

## Important Notes

1. **Version Management**
   - Always increment `version` and `versionCode` for updates
   - Keep app.json updated

2. **Backend URL**
   - Ensure production backend URL is properly configured
   - Update EXPO_PUBLIC_BACKEND_URL if needed

3. **API Keys**
   - Verify all API keys are production keys (not test)
   - Check Razorpay keys are live mode

4. **Testing**
   - Thoroughly test the built APK before submitting
   - Test on multiple Android devices if possible

5. **Store Presence**
   - Keep screenshots updated with latest UI
   - Update description for major feature additions
   - Respond to user reviews regularly

## Resources

- **Play Console**: https://play.google.com/console/
- **Expo EAS Build**: https://docs.expo.dev/build/introduction/
- **Play Console Help**: https://support.google.com/googleplay/android-developer/
- **Privacy Policy Generator**: https://www.privacypolicygenerator.info/

## Support

If you encounter issues:
1. Check Expo documentation: https://docs.expo.dev/
2. Check Play Console help center
3. Post in Expo forums: https://forums.expo.dev/
4. Contact Emergent support if deployment-related

---

**Good luck with your Google Play Store launch! 🚀**
