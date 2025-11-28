# Divine Cakery - Config Files Package

## app.json - Copy this entire content and save as app.json

```json
{
  "expo": {
    "name": "Divine Cakery",
    "slug": "divine-cakery",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "scheme": "frontend",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#FF6B35"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.divinecakery.app"
    },
    "android": {
      "package": "com.divinecakery.app",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#FF6B35"
      },
      "permissions": [
        "INTERNET"
      ]
    },
    "plugins": [
      "expo-router"
    ],
    "extra": {
      "eas": {
        "projectId": "7f7621c8-13c8-4afa-833d-5c1a6dcfffd0"
      }
    }
  }
}
```

---

## eas.json - Copy this entire content and save as eas.json

```json
{
  "cli": {
    "version": ">= 16.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      },
      "env": {
        "EXPO_PUBLIC_BACKEND_URL": "https://cakeryflow.preview.emergentagent.com"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

---

## .env - Create this file with your backend URL

```
EXPO_PUBLIC_BACKEND_URL=https://cakeryflow.preview.emergentagent.com
```

---

## INSTRUCTIONS:

1. Run: `npx create-expo-app divine-cakery` on your computer
2. Replace app.json with the content above
3. Create eas.json with the content above
4. Create .env with the content above
5. Run: `npx eas build --platform android --profile production`

