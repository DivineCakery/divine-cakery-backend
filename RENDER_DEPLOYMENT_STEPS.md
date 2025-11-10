# Render.com Deployment - Step-by-Step Guide

## Your Credentials
- Email: contact@divinecakery.in
- Password: Tunak/kk2$

---

## Step 1: Setup MongoDB Atlas (10 minutes)

Since you're using local MongoDB, we need to migrate to MongoDB Atlas for production.

### 1.1 Create MongoDB Atlas Account
1. Go to: https://www.mongodb.com/cloud/atlas/register
2. Sign up with: **contact@divinecakery.in**
3. Choose password or use Google Sign-In

### 1.2 Create Free Cluster
1. Click **"Build a Database"**
2. Select **"M0 FREE"** tier
3. Choose **Cloud Provider**: AWS or Google Cloud
4. Choose **Region**: Mumbai (ap-south-1) or Singapore (ap-southeast-1)
5. Cluster Name: `divine-cakery`
6. Click **"Create"** (takes 3-5 minutes)

### 1.3 Create Database User
1. Click **"Database Access"** (left sidebar)
2. Click **"Add New Database User"**
3. Authentication Method: **Password**
4. Username: `divinecakery`
5. Click **"Autogenerate Secure Password"** 
6. **COPY AND SAVE THIS PASSWORD!** (You'll need it)
7. Database User Privileges: **"Atlas Admin"**
8. Click **"Add User"**

### 1.4 Setup Network Access
1. Click **"Network Access"** (left sidebar)
2. Click **"Add IP Address"**
3. Click **"Allow Access from Anywhere"**
4. IP Address will show: `0.0.0.0/0`
5. Click **"Confirm"**

### 1.5 Get Connection String
1. Go to **"Database"** (left sidebar)
2. Click **"Connect"** button on your cluster
3. Select **"Connect your application"**
4. Driver: **Python**, Version: **3.12 or later**
5. Copy the connection string:
   ```
   mongodb+srv://divinecakery:<password>@divine-cakery.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Replace `<password>` with the password you saved in step 1.3
7. **SAVE THIS COMPLETE STRING!**

### 1.6 Migrate Your Data
You'll need to export from local MongoDB and import to Atlas:

**Option A: Use mongodump/mongorestore (if you have MongoDB tools)**
```bash
# Export from local
mongodump --db divine_cakery --out /tmp/backup

# Import to Atlas (replace with your connection string)
mongorestore --uri "YOUR_MONGODB_ATLAS_CONNECTION_STRING" --db divine_cakery /tmp/backup/divine_cakery
```

**Option B: Re-run bulk upload script on Atlas**
After Render deployment, run the bulk upload script again to populate products.

---

## Step 2: Deploy to Render.com (15 minutes)

### 2.1 Login to Render
1. Go to: https://dashboard.render.com/
2. Login with: contact@divinecakery.in
3. Password: Tunak/kk2$

### 2.2 Create Web Service
1. Click **"New +"** (top right)
2. Select **"Web Service"**

### 2.3 Connect Git Repository

**Option A: Connect GitHub (Recommended)**
1. Click **"Connect account"** → **GitHub**
2. Authorize Render to access GitHub
3. Select your repository with the backend code

**Option B: Deploy from Git URL**
If you don't have GitHub:
1. Select **"Public Git repository"**
2. Enter repository URL (if available)

**Option C: Manual Deployment (I'll help)**
If you need to create a GitHub repo first, let me know!

### 2.4 Configure Service

Fill in these settings:

**Basic Information:**
- **Name**: `divine-cakery-api`
- **Region**: Singapore (closest to India/Kerala)
- **Branch**: `main` or `master`
- **Root Directory**: `backend` (if backend is in a subfolder) or leave blank
- **Runtime**: Python 3

**Build & Deploy:**
- **Build Command**: 
  ```
  pip install -r requirements.txt
  ```
- **Start Command**: 
  ```
  uvicorn server:app --host 0.0.0.0 --port $PORT
  ```

**Instance Type:**
- **Plan**: Free

### 2.5 Add Environment Variables

Click **"Advanced"** → **"Add Environment Variable"**

Add these one by one:

| Key | Value |
|-----|-------|
| `MONGO_URL` | Your MongoDB Atlas connection string from Step 1.5 |
| `DB_NAME` | `divine_cakery` |
| `SECRET_KEY` | `divine_cakery_prod_secret_key_2024_change_this_123456` |
| `RAZORPAY_KEY_ID` | `rzp_test_RWMdSO0IeFPkBy` |
| `RAZORPAY_KEY_SECRET` | `TVsEj3kHSX8Qango60GbXET5` |
| `RAZORPAY_WEBHOOK_SECRET` | (leave empty) |
| `SMTP_SERVER` | `smtp-mail.outlook.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USERNAME` | `somann2@hotmail.com` |
| `SMTP_PASSWORD` | `oorbxzvzsygwrzxm` |
| `ADMIN_EMAIL` | `somann2@hotmail.com` |
| `PYTHON_VERSION` | `3.11` |

**Important**: For `MONGO_URL`, paste the FULL connection string including your password!

### 2.6 Deploy
1. Click **"Create Web Service"**
2. Render will start building (5-10 minutes)
3. Watch the logs for any errors
4. Once deployed, you'll see: **"Your service is live at https://divine-cakery-api.onrender.com"**

### 2.7 Test Deployment
1. Visit: `https://divine-cakery-api.onrender.com/docs`
2. You should see FastAPI Swagger documentation
3. Test an endpoint (like `/api/categories`)

---

## Step 3: Get Your Backend URL

Once deployed, your backend URL will be:
```
https://divine-cakery-api.onrender.com
```

**COPY THIS URL** - you'll need it for the mobile app!

---

## What to Share With Me

After completing the above steps, provide me with:

1. ✅ **MongoDB Atlas connection string** (with password)
2. ✅ **Render backend URL** (e.g., `https://divine-cakery-api.onrender.com`)

Then I'll:
- Update the mobile app configuration
- Create Build 27 with the correct backend URL
- Guide you through uploading to Google Play

---

## Troubleshooting

### Build Fails
- Check logs in Render dashboard
- Ensure `requirements.txt` is in the root or backend folder
- Verify Python version is 3.11

### MongoDB Connection Error
- Verify connection string has correct password
- Check Network Access allows 0.0.0.0/0
- Ensure user has "Atlas Admin" privileges

### Service Won't Start
- Check environment variables are set correctly
- Look for errors in Render logs
- Verify `uvicorn server:app` command is correct

---

## Cost & Limitations

**Render Free Tier:**
- ✅ Free forever
- ✅ 512 MB RAM
- ⚠️ Spins down after 15 minutes of inactivity
- ⚠️ First request after spin-down takes 30-50 seconds

**MongoDB Atlas Free Tier:**
- ✅ Free forever
- ✅ 512 MB storage
- ✅ Sufficient for thousands of products

**Recommended Upgrade (Later):**
- Render Starter: $7/month (no spin-down, custom domain)
- MongoDB M10: $10/month (dedicated, 10GB)
- Total: $17/month for production-grade setup

---

## Next Steps

1. Complete MongoDB Atlas setup
2. Deploy to Render.com
3. Share URLs with me
4. I'll rebuild the app (Build 27)
5. Upload to Google Play Store
6. Users can login! ✅
