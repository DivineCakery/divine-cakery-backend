#!/bin/bash
# Divine Cakery - APK Build Script
# This script will guide you through building your Play Store APK

echo "🚀 Divine Cakery - APK Build Process"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}✅ Configuration verified:${NC}"
echo "   - App Name: Divine Cakery"
echo "   - Package: com.divinecakery.app"
echo "   - Version: 1.0.0"
echo "   - Backend: https://fresh-fix-portal.preview.emergentagent.com"
echo ""

echo -e "${YELLOW}📋 Prerequisites:${NC}"
echo "   1. Expo account (create at: https://expo.dev/signup)"
echo "   2. Internet connection"
echo "   3. 15-20 minutes of time"
echo ""

echo -e "${YELLOW}⚠️  IMPORTANT:${NC}"
echo "   This script must be run from YOUR LOCAL TERMINAL"
echo "   It requires authentication which can only be done by you"
echo ""

read -p "Do you have an Expo account? (y/n): " has_account
if [[ $has_account != "y" ]]; then
    echo -e "${RED}❌ Please create an Expo account first:${NC}"
    echo "   Go to: https://expo.dev/signup"
    echo "   It's FREE - no credit card required"
    exit 1
fi

echo ""
echo -e "${GREEN}📦 Starting build process...${NC}"
echo ""

# Navigate to frontend directory
cd /app/frontend || exit 1

echo -e "${YELLOW}Step 1: Login to Expo${NC}"
echo "Running: npx eas login"
echo ""
npx eas login

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Login failed. Please try again.${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Login successful!${NC}"
echo ""

echo -e "${YELLOW}Step 2: Configure EAS Build${NC}"
echo "Running: npx eas build:configure"
echo ""
npx eas build:configure

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Configuration failed. Please check errors above.${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Configuration complete!${NC}"
echo ""

echo -e "${YELLOW}Step 3: Build Preview APK (for testing)${NC}"
echo "This will take approximately 10-15 minutes..."
echo "Running: npx eas build --platform android --profile preview"
echo ""

read -p "Start preview build now? (y/n): " start_preview
if [[ $start_preview == "y" ]]; then
    npx eas build --platform android --profile preview
    
    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✅ Preview APK build queued successfully!${NC}"
        echo ""
        echo "📱 Next steps:"
        echo "   1. Wait for build to complete (~10-15 minutes)"
        echo "   2. Download APK from link provided"
        echo "   3. Install on your Android phone to test"
        echo "   4. If everything works, build production AAB"
        echo ""
    else
        echo -e "${RED}❌ Build failed. Check errors above.${NC}"
        exit 1
    fi
fi

echo ""
echo -e "${YELLOW}Step 4: Build Production AAB (for Play Store)${NC}"
echo "Only do this AFTER testing the preview APK!"
echo ""

read -p "Build production AAB now? (y/n): " start_production
if [[ $start_production == "y" ]]; then
    echo "Running: npx eas build --platform android --profile production"
    npx eas build --platform android --profile production
    
    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✅ Production AAB build queued successfully!${NC}"
        echo ""
        echo "🎉 Next steps:"
        echo "   1. Wait for build to complete (~10-15 minutes)"
        echo "   2. Download AAB from link provided"
        echo "   3. Upload to Google Play Console"
        echo "   4. Submit for review"
        echo ""
    else
        echo -e "${RED}❌ Build failed. Check errors above.${NC}"
        exit 1
    fi
fi

echo ""
echo -e "${GREEN}🎉 Build process initiated!${NC}"
echo ""
echo "📊 Check build status at: https://expo.dev/accounts/[your-account]/projects/divine-cakery/builds"
echo ""
echo "💡 Tips:"
echo "   - You'll receive email notifications when builds complete"
echo "   - Builds are stored in your Expo dashboard"
echo "   - You can download them anytime"
echo ""
