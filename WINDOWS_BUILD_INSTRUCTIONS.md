# Windows Build Instructions for Divine Cakery

## You Have Two Options:

### Option 1: Build from Your Windows Machine (Recommended - Since you're already logged in)

Since you're already logged in to EAS on your Windows machine, you need to:

1. **Clone or download the frontend folder to your Windows machine**

2. **Navigate to the frontend directory in Windows:**
```cmd
cd C:\path\to\your\divine-cakery\frontend
```

3. **Install dependencies (if not already done):**
```cmd
npm install
```

4. **Run the build command:**
```cmd
npx eas-cli build --platform android --profile production
```

---

### Option 2: Build from Inside the Container

If you want to build from the container, you need to provide your Expo authentication token:

1. **Get your Expo token from your profile:**
   - Go to: https://expo.dev/accounts/[your-account]/settings/access-tokens
   - Create a new token or copy existing one

2. **Run the build with the token:**
```bash
# Linux/Container command (not Windows)
cd /app/frontend
export EXPO_TOKEN="your-token-here"
npx eas-cli build --platform android --profile production --non-interactive
```

---

## Recommended Approach (Since you're on Windows):

**Use Option 1** - You're already logged in, so just:

1. Open a new Command Prompt or PowerShell
2. Navigate to where you have the project
3. If you don't have the project locally, you can access the container files or re-clone the repo
4. Run: `npx eas-cli build --platform android --profile production`

---

## If You Don't Have the Code Locally:

You can either:
- Ask me to provide you with a way to download the frontend folder
- Or provide me with your Expo token so I can build from the container

**What would you prefer?**
