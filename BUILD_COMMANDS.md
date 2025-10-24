# 📱 DIVINE CAKERY - APK BUILD COMMANDS

## 🚀 Quick Command Reference

Copy and paste these commands one by one in your terminal:

---

### ✅ **STEP 1: Navigate to Project**
```bash
cd /app/frontend
```

---

### ✅ **STEP 2: Login to Expo**
```bash
npx eas login
```
**Enter your Expo email and password**

---

### ✅ **STEP 3: Configure Build (First Time Only)**
```bash
npx eas build:configure
```
**Press Y to all prompts**

---

### ✅ **STEP 4A: Build Preview APK (For Testing)**
```bash
npx eas build --platform android --profile preview
```
**Wait 10-15 minutes → Download → Install on phone → Test**

---

### ✅ **STEP 4B: Build Production AAB (For Play Store)**
```bash
npx eas build --platform android --profile production
```
**Wait 10-15 minutes → Download → Upload to Play Store**

---

## 📥 Download Built Files

```bash
# List all builds
npx eas build:list

# Download latest Android build
npx eas build:download --platform android

# Download specific build
npx eas build:download --id [BUILD_ID]
```

---

## 🔧 Troubleshooting Commands

```bash
# Check if logged in
npx eas whoami

# Login again
npx eas login

# View build status
npx eas build:view [BUILD_ID]

# Cancel running build
npx eas build:cancel [BUILD_ID]
```

---

## 📊 Build Status

Check your builds at:
**https://expo.dev/accounts/[your-username]/projects/divine-cakery/builds**

---

## ⏱️ Expected Timeline

| Step | Time |
|------|------|
| Login | 1 min |
| Configure | 2 mins |
| Upload | 2 mins |
| Build | 10-15 mins |
| Download | 2 mins |
| **Total** | **~20 mins** |

---

## 💡 Pro Tips

1. **Test First**: Always build preview APK before production AAB
2. **Check Logs**: If build fails, check the build logs on Expo dashboard
3. **Save Links**: Save download links for future reference
4. **Monitor Email**: You'll get email when build completes

---

## 📞 Need Help?

Come back to this chat with:
- Screenshot of any errors
- Build ID if build fails
- Question about next steps

I'm here to help! 🚀
