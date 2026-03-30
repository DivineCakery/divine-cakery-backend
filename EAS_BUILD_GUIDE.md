# 🚀 Divine Cakery - EAS Build & Play Store Setup Guide

## ✅ Configuration Complete!

Your app is now configured for EAS Build and Play Store submission.

---

## 📋 What's Been Configured:

### 1. **app.json** - Updated with:
- ✅ Android package: `com.divinecakery.app`
- ✅ iOS bundle identifier: `com.divinecakery.app`
- ✅ Version: 1.0.0
- ✅ Version code: 1
- ✅ Splash screen configuration
- ✅ App icons (icon.png, adaptive-icon.png)
- ✅ Required permissions (INTERNET)

### 2. **eas.json** - Build profiles created:
- ✅ **development**: For internal testing with Expo Go
- ✅ **preview**: Creates APK for easy sharing/testing
- ✅ **production**: Creates AAB (Android App Bundle) for Play Store

### 3. **Assets Ready**:
- ✅ App icon (1024x1024)
- ✅ Adaptive icon for Android
- ✅ Splash screen

---

## 🎯 Next Steps to Build Your App:

### **Step 1: Create Expo Account (FREE)**
```bash
# In your local terminal (not needed in this environment)
npx eas login
```
- Go to https://expo.dev/signup
- Create a free account
- No credit card required

### **Step 2: Configure Your Project**
```bash
cd /app/frontend
npx eas build:configure
```
This will:
- Link your project to Expo
- Generate signing credentials automatically (Android keystore)
- Set up your project ID

### **Step 3: Build Preview APK (For Testing)**
```bash
# Build APK for quick testing
npx eas build --platform android --profile preview
```
- Takes ~10-15 minutes
- Downloads directly to your phone
- Great for testing before Play Store

### **Step 4: Build Production AAB (For Play Store)**
```bash
# Build AAB for Play Store submission
npx eas build --platform android --profile production
```
- Takes ~10-15 minutes
- Generates .aab file
- Ready for Play Store upload

---

## 📱 Play Store Submission Checklist:

### **Before Submitting:**
1. ✅ **App configured** (Done!)
2. ⬜ **Google Play Console account** ($25 one-time fee)
3. ⬜ **Privacy Policy URL** (Required by Google)
4. ⬜ **App screenshots** (at least 2, up to 8)
5. ⬜ **App description** (short & full)
6. ⬜ **Feature graphic** (1024x500px)
7. ⬜ **Content rating** (via Google's questionnaire)

### **Play Store Assets Needed:**
```
📱 Screenshots:
- Phone: 16:9 or 9:16 ratio (at least 2)
- 7-inch tablet (optional)
- 10-inch tablet (optional)

🎨 Graphics:
- Feature Graphic: 1024 x 500px
- App Icon: Already ready! (512x512)

📝 Text:
- Short description (80 chars max)
- Full description (4000 chars max)
- App title (30 chars max)
```

---

## 💡 Important URLs for Backend:

Your app currently uses:
```
EXPO_PUBLIC_BACKEND_URL=https://prep-route-admin.preview.emergentagent.com
```

**For Production Build:**
- Make sure your backend URL is stable and production-ready
- Update `EXPO_PUBLIC_BACKEND_URL` in `.env` if needed
- The URL is baked into the build, so you'll need to rebuild if it changes

---

## 🔧 Build Commands Reference:

```bash
# Preview build (APK - quick testing)
npx eas build --platform android --profile preview

# Production build (AAB - Play Store)
npx eas build --platform android --profile production

# Check build status
npx eas build:list

# Download build
npx eas build:download --platform android

# iOS build (if needed later)
npx eas build --platform ios --profile production
```

---

## 📊 Build Process Timeline:

1. **Configure** (5 mins) - `eas build:configure`
2. **Queue** (1-2 mins) - Upload code to Expo servers
3. **Build** (10-15 mins) - Compile your app
4. **Download** (2-5 mins) - Get your APK/AAB
5. **Test** (Your time) - Install and test
6. **Submit** (30-60 mins) - Upload to Play Store

**Total: ~30 minutes for first build**

---

## 🆓 Free Tier Limits:

- **30 builds/month** (plenty for most apps!)
- **Unlimited projects**
- **Unlimited submissions**
- **Full build logs**
- **Artifact storage**

---

## ❓ Common Questions:

### Q: Do I need a Mac for iOS builds?
**A:** No! EAS Build handles iOS builds on their servers.

### Q: Can I update my app after publishing?
**A:** Yes! Build a new version, increment version code, and upload to Play Store.

### Q: What about over-the-air (OTA) updates?
**A:** You can set up EAS Update for minor updates without rebuilding (separate service).

### Q: How do I handle environment variables?
**A:** They're baked into the build. Use different profiles for different environments.

---

## 🎉 You're Ready!

Your app is fully configured and ready to build. When you're ready:

1. Create your Expo account at https://expo.dev/signup
2. Run `npx eas build:configure` in your frontend directory
3. Run `npx eas build --platform android --profile preview` for testing
4. Once tested, run `npx eas build --platform android --profile production` for Play Store

---

## 📞 Support:

- **Expo Docs**: https://docs.expo.dev/build/introduction/
- **EAS Build**: https://docs.expo.dev/build/setup/
- **Play Store**: https://support.google.com/googleplay/android-developer/

---

**Good luck with your launch! 🚀**
