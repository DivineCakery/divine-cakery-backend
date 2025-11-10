# Fix Render Failed Service - Step by Step Guide

## Current Status
Your screenshot shows: **"divine-cakery-backend" - Failed service**

## Root Cause
The service failed because the `MONGO_URL` environment variable is missing from your Render configuration. The FastAPI backend crashes on startup when it tries to connect to MongoDB.

## Step-by-Step Fix (5 minutes)

### Step 1: View the Error Logs (Optional but Recommended)
1. Click on **"divine-cakery-backend"** service name in your Render dashboard
2. Look for a **"Logs"** tab or section
3. You should see an error like:
   ```
   KeyError: 'MONGO_URL'
   ```
   or
   ```
   ERROR:    Application startup failed
   ```

### Step 2: Add the Missing Environment Variable
1. In your Render dashboard, click on **"divine-cakery-backend"** service
2. Go to the **"Environment"** tab in the left sidebar
3. Scroll down to the environment variables section
4. Click **"Add Environment Variable"** button
5. Add the following:

   **Key:** `MONGO_URL`
   
   **Value:** 
   ```
   mongodb+srv://divinecakery:Tunak%2Fkk2%24@divinecakery.0vv8unb.mongodb.net/?appName=divinecakery
   ```

6. Click **"Save Changes"**

### Step 3: Wait for Auto-Redeployment
- After saving, Render will automatically trigger a new deployment
- This will take 2-5 minutes
- Watch the deployment logs - you should see:
  ```
  ==> Build successful!
  ==> Starting service...
  INFO:     Uvicorn running on http://0.0.0.0:10000 (Press CTRL+C to quit)
  INFO:     Application startup complete.
  ```

### Step 4: Verify the Fix
Once deployment completes, test these endpoints:

**In your browser:**
- https://divine-cakery-backend.onrender.com/api/health
- https://divine-cakery-backend.onrender.com/api/products
- https://divine-cakery-backend.onrender.com/api/categories

All should return valid JSON data (not 502 errors).

## Alternative: Manual Redeploy (If Needed)
If the service doesn't auto-redeploy after adding the environment variable:

1. Go to your service page
2. Find the **"Manual Deploy"** button (usually top-right)
3. Click it and select **"Deploy latest commit"**

## Verification Checklist
After the fix:
- [ ] Service status shows "Live" (green) instead of "Failed" (red)
- [ ] `/api/health` returns `{"status":"healthy"}`
- [ ] `/api/products` returns product list (not 502)
- [ ] Mobile app can load products page
- [ ] Mobile app can load stock management page

## What We Fixed
✅ Added missing `MONGO_URL` environment variable
✅ Backend can now connect to MongoDB Atlas
✅ All API endpoints will work properly
✅ Your Google Play Store app will function correctly

## Important Notes
1. **Professional Plan**: Your upgrade to professional plan is excellent - this ensures:
   - No auto-sleep (service stays awake)
   - More memory (512MB+)
   - Better performance
   - No cold starts

2. **Security**: The MongoDB connection string includes URL-encoded credentials:
   - `/` is encoded as `%2F`
   - `$` is encoded as `%24`
   - This is correct and necessary

3. **Other Environment Variables**: All other variables (SMTP, Razorpay, etc.) are already configured correctly in your Render service.

## Need Help?
If you see any errors in the logs after adding MONGO_URL, please share:
1. Screenshot of the error logs
2. The exact error message
3. I'll help you troubleshoot immediately

## Next Steps After Fix
Once the backend is running successfully:
1. Test your mobile app from Google Play Store
2. Verify all features work (products, orders, stock, etc.)
3. Monitor the service for a few hours to ensure stability
4. Consider setting up Render's health check alerts
