# Render Backend Redeployment Guide

## Issue Fixed
- Added missing `MONGO_URL` environment variable to render.yaml
- Updated plan from "free" to "starter" (professional tier)

## Steps to Redeploy on Render.com

### Option 1: Manual Environment Variable Update (Quickest)
1. Go to your Render dashboard: https://dashboard.render.com/
2. Select your service: **divine-cakery-api**
3. Click on **Environment** tab
4. Click **Add Environment Variable**
5. Add the following:
   - **Key**: `MONGO_URL`
   - **Value**: `mongodb+srv://divinecakery:Tunak%2Fkk2%24@divinecakery.0vv8unb.mongodb.net/?appName=divinecakery`
6. Click **Save Changes**
7. Render will automatically redeploy your service

### Option 2: Git Push (Updates render.yaml)
1. Commit the updated render.yaml to your GitHub repository
2. Push to the main/master branch
3. Render will automatically detect the changes and redeploy

## What Was Changed
- **backend/render.yaml**: 
  - Added `MONGO_URL` environment variable
  - Changed `plan: free` to `plan: starter`

## Expected Result
After redeployment:
- `/api/health` endpoint: ✅ Should return 200 OK (already working)
- `/api/products` endpoint: ✅ Should return 200 OK with product data (was 502, now fixed)
- `/api/categories` endpoint: ✅ Should work properly
- Mobile app should load products and stock pages successfully

## Verification Steps
After redeployment, test:
```bash
curl https://divine-cakery-backend.onrender.com/api/health
curl https://divine-cakery-backend.onrender.com/api/products
curl https://divine-cakery-backend.onrender.com/api/categories
```

All should return 200 OK with valid JSON data.

## Mobile App Testing
1. Open your mobile app from Google Play Store
2. Navigate to Products page - should load successfully
3. Navigate to Stock management page - should load successfully
4. All other features should work normally

## Notes
- The professional plan provides better performance and no auto-spin down
- MongoDB Atlas connection is properly configured with URL-encoded credentials
- All other environment variables remain unchanged
