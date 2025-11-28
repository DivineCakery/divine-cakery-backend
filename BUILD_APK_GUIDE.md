# 🚀 BUILD YOUR APK - Complete Step-by-Step Guide

## ⚠️ IMPORTANT: Where to Run These Commands

**You MUST run these commands from YOUR computer/terminal**, not in this chat!

Why? Because:
- EAS Build requires your Expo account login
- Authentication can only be done by you
- Builds happen on Expo's cloud servers

---

## 📋 Prerequisites (5 minutes)

### 1. Create Expo Account (FREE)
- Go to: **https://expo.dev/signup**
- Sign up with email
- Verify your email
- **No credit card required!**

### 2. Have Access to Your Terminal
- **Windows**: Use Command Prompt or PowerShell
- **Mac/Linux**: Use Terminal
- **Or**: Use the terminal in this Emergent environment

---

## 🎯 BUILD PROCESS (3 Simple Commands)

### **Command 1: Login to Expo**
```bash
cd /app/frontend
npx eas login
```

**What will happen:**
- You'll be asked for email and password
- Enter your Expo account credentials
- You'll see: "Logged in as [your-email]"

---

### **Command 2: Configure Project**
```bash
npx eas build:configure
```

**What will happen:**
- You'll be asked: "Would you like to create a project?" → Press **Y**
- You'll be asked: "Generate new Android Keystore?" → Press **Y**
- You'll see: "Project configured successfully"

**⏱️ Time: 1-2 minutes**

---

### **Command 3: Build Production AAB (for Play Store)**
```bash
npx eas build --platform android --profile production
```

**What will happen:**
1. Code is uploaded to Expo servers
2. Build starts in the cloud
3. You get a build URL to track progress
4. You'll receive email when complete (~15 minutes)

**⏱️ Time: 10-15 minutes**

---

## 📱 OPTIONAL: Build Preview APK First (Recommended!)

**Before building for Play Store, test with preview APK:**

```bash
npx eas build --platform android --profile preview
```

**Why?**
- Creates APK (easy to install and test)
- Test on your phone before Play Store submission
- Same 10-15 minute build time
- FREE (counts from your 30 builds/month)

**Recommended Flow:**
1. Build preview APK → Test → If good →
2. Build production AAB → Submit to Play Store

---

## 🎯 EXACT COMMANDS TO RUN (Copy-Paste Ready)

Open your terminal and run these one by one:

```bash
# Step 1: Navigate to frontend folder
cd /app/frontend

# Step 2: Login
npx eas login

# Step 3: Configure (first time only)
npx eas build:configure

# Step 4: Build preview APK for testing
npx eas build --platform android --profile preview

# Step 5: After testing, build production AAB
npx eas build --platform android --profile production
```

---

## 📊 What Happens During Build

### **1. Upload Phase (1-2 minutes)**
```
✓ Compressing project files
✓ Uploading to Expo servers
✓ Build queued
```

### **2. Build Phase (10-15 minutes)**
```
✓ Installing dependencies
✓ Compiling Android app
✓ Generating APK/AAB
✓ Running post-build checks
```

### **3. Complete Phase**
```
✓ Build successful!
✓ Download link provided
✓ Email notification sent
```

---

## 📥 After Build Completes

### **You'll Get:**
1. **Direct download link** in terminal
2. **Email notification** with download link
3. **Dashboard access** at: https://expo.dev

### **Download Your Build:**
```bash
# Download latest build
npx eas build:download --platform android
```

Or click the download link provided after build completes.

---

## 🧪 Testing Your APK (Before Play Store)

### **Install Preview APK on Your Phone:**

**Method 1: Direct Download**
1. Open download link on your Android phone
2. Download the APK
3. Install (you may need to allow "Install from unknown sources")
4. Open and test all features

**Method 2: Transfer File**
1. Download APK to computer
2. Transfer to phone via USB or cloud storage
3. Install and test

### **What to Test:**
- ✅ Login works
- ✅ All pages load
- ✅ Can create orders
- ✅ Products display correctly
- ✅ Images load
- ✅ Payments work (test mode)
- ✅ Admin panel accessible

---

## 🎯 For Play Store Submission

### **You Need:**
1. **Production AAB file** (not APK!)
   ```bash
   npx eas build --platform android --profile production
   ```

2. **Google Play Console Account** ($25 one-time)
   - Sign up at: https://play.google.com/console

3. **App Assets:**
   - Screenshots (at least 2)
   - Feature graphic (1024x500)
   - App description
   - Privacy policy URL

---

## 🔧 Troubleshooting

### **Error: "Not logged in"**
```bash
npx eas login
```

### **Error: "Project not configured"**
```bash
npx eas build:configure
```

### **Error: "Build failed"**
- Check error message in terminal
- Look for missing dependencies
- Verify app.json is valid
- Try building again

### **Can't Find Download Link**
```bash
npx eas build:list
npx eas build:download --platform android
```

---

## 💰 Cost Reminder

| Item | Cost |
|------|------|
| Expo Account | **FREE** ✅ |
| EAS Builds | **FREE** (30/month) ✅ |
| Preview APK Build | **FREE** ✅ |
| Production AAB Build | **FREE** ✅ |
| Play Store Developer | **$25 one-time** |

**Total to build and test: $0**
**Total to publish: $25**

---

## ✅ Your App Configuration

Already configured and ready:

```json
App Name: Divine Cakery
Package: com.divinecakery.app
Version: 1.0.0
Backend: https://cakeryflow.preview.emergentagent.com
Icons: ✅ Ready
Splash Screen: ✅ Ready
EAS Config: ✅ Ready
```

---

## 🎉 Summary

### **What You Need to Do:**
1. ✅ Create Expo account (5 mins)
2. ✅ Run 3 commands (see above)
3. ✅ Wait 15 minutes for build
4. ✅ Download and test APK
5. ✅ Build production AAB
6. ✅ Submit to Play Store

### **Total Time:**
- Setup: 5 minutes
- Build: 15 minutes
- Testing: 30 minutes
- **Total: ~1 hour to have your app ready!**

---

## 📞 Need Help?

### **If Commands Don't Work:**
1. Make sure you're in `/app/frontend` directory
2. Verify internet connection
3. Try running `npm install -g eas-cli` first

### **If Build Fails:**
- Check terminal for error messages
- Look at build logs on Expo dashboard
- Contact me with the error message

### **Expo Support:**
- Docs: https://docs.expo.dev/build/introduction/
- Discord: https://discord.gg/expo
- Forum: https://forums.expo.dev/

---

## 🚀 Ready to Start?

**Open your terminal and run:**

```bash
cd /app/frontend
npx eas login
```

**Then come back and let me know:**
- ✅ Login successful?
- ✅ Build started?
- ❓ Any errors?

I'll help you through each step! 🎉
