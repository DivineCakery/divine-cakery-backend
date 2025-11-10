# Quick Render.com Deployment Guide

## ✅ Completed So Far
- MongoDB Atlas setup ✅
- Data migrated (113 products, 23 users, 59 orders) ✅
- Backend ready for deployment ✅

## Now Deploy to Render.com (10 minutes)

### Step 1: Login to Render
1. Go to: https://dashboard.render.com/
2. Login with: contact@divinecakery.in
3. Password: Tunak/kk2$

### Step 2: Create Web Service

**Option A: Deploy from GitHub (Recommended)**

If you have the code on GitHub:
1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub account
3. Select your repository
4. Continue to Step 3

**Option B: Manual Setup (If no GitHub)**

1. First, push backend to GitHub:
   ```bash
   # Create a new repository on GitHub named: divine-cakery-backend
   # Then run:
   cd /app/backend
   git init
   git add .
   git commit -m "Backend for production"
   git remote add origin https://github.com/YOUR_USERNAME/divine-cakery-backend.git
   git push -u origin main
   ```

2. Then follow Option A

### Step 3: Configure Service

Fill in these details:

**Basic:**
- Name: `divine-cakery-api`
- Region: **Singapore** (closest to India)
- Branch: `main`
- Root Directory: Leave blank (or `backend` if in subfolder)

**Build Settings:**
- Build Command: `pip install -r requirements.txt`
- Start Command: `uvicorn server:app --host 0.0.0.0 --port $PORT`

**Instance:**
- Plan: **Free**

### Step 4: Add Environment Variables

Click **"Advanced"** → Scroll to **"Environment Variables"**

Add these (copy-paste each):

```
MONGO_URL=mongodb+srv://divinecakery:Tunak%2Fkk2%24@divinecakery.0vv8unb.mongodb.net/?appName=divinecakery
```

```
DB_NAME=divine_cakery
```

```
SECRET_KEY=divine_cakery_prod_secret_key_2024_secure_change_this_789
```

```
RAZORPAY_KEY_ID=rzp_test_RWMdSO0IeFPkBy
```

```
RAZORPAY_KEY_SECRET=TVsEj3kHSX8Qango60GbXET5
```

```
RAZORPAY_WEBHOOK_SECRET=
```

```
SMTP_SERVER=smtp-mail.outlook.com
```

```
SMTP_PORT=587
```

```
SMTP_USERNAME=somann2@hotmail.com
```

```
SMTP_PASSWORD=oorbxzvzsygwrzxm
```

```
ADMIN_EMAIL=somann2@hotmail.com
```

```
PYTHON_VERSION=3.11
```

### Step 5: Deploy!

1. Click **"Create Web Service"**
2. Wait 5-10 minutes for deployment
3. Watch the build logs
4. Once complete, you'll see: **"Your service is live"**

### Step 6: Get Your Backend URL

Your backend will be available at:
```
https://divine-cakery-api.onrender.com
```

Test it by visiting:
```
https://divine-cakery-api.onrender.com/docs
```

You should see the FastAPI documentation page.

### Step 7: Share URL With Me

Once deployed, copy the URL and share it with me. Then I'll:
1. Update mobile app configuration
2. Create Build 27 with new icon
3. Guide you through Google Play upload

---

## If You Need Help Pushing to GitHub

Let me know and I can:
1. Create a GitHub repo for you
2. Push the backend code
3. Then guide you through Render deployment

---

## Verification

After deployment, test these endpoints:

1. **API Docs**: `https://divine-cakery-api.onrender.com/docs`
2. **Get Products**: `https://divine-cakery-api.onrender.com/api/products`
3. **Get Categories**: `https://divine-cakery-api.onrender.com/api/categories`

All should return data from your MongoDB Atlas database!
