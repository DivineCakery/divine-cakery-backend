#!/bin/bash
# Divine Cakery - EAS Build with Token Authentication

cd /app/frontend

# Set your Expo token
export EXPO_TOKEN="Y3Rw_AjfTy5AHdEDC2jq6SQXMe22UfOVi8gKhHs1"

echo "🚀 Divine Cakery - EAS Build Script"
echo "===================================="
echo ""
echo "✅ Authenticated as: divinecakery"
echo ""

# Configure the build (this needs to be run interactively first time)
echo "Step 1: Configuring EAS Build..."
echo "You will be asked to create a project - Press Y"
echo "You will be asked to generate keystore - Press Y"
echo ""

# This will prompt for input
npx eas build:configure --platform android

if [ $? -ne 0 ]; then
    echo "❌ Configuration failed. This needs interactive input."
    echo "Please run these commands manually in your terminal:"
    echo ""
    echo "  cd /app/frontend"
    echo "  export EXPO_TOKEN=\"Y3Rw_AjfTy5AHdEDC2jq6SQXMe22UfOVi8gKhHs1\""
    echo "  npx eas build:configure"
    echo "  npx eas build --platform android --profile production"
    exit 1
fi

echo ""
echo "Step 2: Building Production AAB..."
npx eas build --platform android --profile production

echo ""
echo "🎉 Build queued successfully!"
echo ""
echo "Check status at: https://expo.dev"
