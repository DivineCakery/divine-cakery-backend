# Deploy Backend NOW - Quick Guide

## 🚀 Quick 3-Step Deployment

### Step 1: Setup MongoDB Atlas (5 minutes)
1. Go to: https://cloud.mongodb.com/
2. Sign up (free account)
3. Create cluster → Select "Free" tier → Name: `divine-cakery`
4. Database Access → Add User:
   - Username: `divinecakery`
   - Auto-generate password → **COPY IT!**
5. Network Access → Add IP: `0.0.0.0/0` (Allow all)
6. Get connection string:
   - Click "Connect" → "Connect your application"
   - Copy the string (replace `<password>` with your password)
   - Example: `mongodb+srv://divinecakery:YOUR_PASSWORD@divine-cakery.xxxxx.mongodb.net/`

### Step 2: Deploy to Render.com (10 minutes)
1. Go to: https://render.com
2. Sign up with GitHub
3. Click "New +" → "Web Service"
4. Connect your repo (or I'll provide deployment files)
5. Configure:
   - **Name**: `divine-cakery-api`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn server:app --host 0.0.0.0 --port $PORT`
   - **Plan**: Free

6. Add Environment Variables:
   ```
   MONGO_URL=<Your MongoDB Atlas connection string>
   DB_NAME=divine_cakery
   SECRET_KEY=divine_cakery_secret_key_change_in_production_123456
   RAZORPAY_KEY_ID=rzp_test_RWMdSO0IeFPkBy
   RAZORPAY_KEY_SECRET=TVsEj3kHSX8Qango60GbXET5
   SMTP_SERVER=smtp-mail.outlook.com
   SMTP_PORT=587
   SMTP_USERNAME=somann2@hotmail.com
   SMTP_PASSWORD=oorbxzvzsygwrzxm
   ADMIN_EMAIL=somann2@hotmail.com
   ```

7. Click "Create Web Service"
8. Wait 5-10 minutes
9. **COPY YOUR URL**: `https://divine-cakery-api.onrender.com`

### Step 3: Update App & Rebuild (15 minutes)
1. I'll update the app with your backend URL
2. Rebuild the app (Build 27)
3. Download new AAB
4. Upload to Google Play Console

## ⚠️ Important
- Render free tier "spins down" after 15 min inactivity
- First request takes 30-50 seconds to wake up
- Upgrade to $7/month for always-on service (recommended for production)

## 📝 What I Need From You
After you complete Step 1 & 2, provide me:
1. ✅ MongoDB Atlas connection string
2. ✅ Render backend URL (e.g., `https://divine-cakery-api.onrender.com`)

Then I'll handle Step 3 automatically!
