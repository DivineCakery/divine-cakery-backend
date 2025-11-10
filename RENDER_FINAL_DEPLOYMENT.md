# Render.com Final Deployment - Code Ready on GitHub!

## ✅ Completed
- Code pushed to GitHub: https://github.com/DivineCakery/divine-cakery-backend ✅
- MongoDB Atlas configured ✅
- All environment variables prepared ✅

## Deploy Now (5 minutes)

### Step 1: Login to Render
1. Go to: https://dashboard.render.com/
2. Login with: contact@divinecakery.in
3. Password: Tunak/kk2$

### Step 2: Create New Web Service
1. Click **"New +"** (top right)
2. Select **"Web Service"**
3. Click **"Build and deploy from a Git repository"**
4. Click **"Next"**

### Step 3: Connect GitHub Repository
1. Click **"Connect account"** → Select **GitHub**
2. You may need to authorize Render to access your GitHub
3. Once connected, you'll see your repositories
4. Find and select: **divine-cakery-backend**
5. Click **"Connect"**

### Step 4: Configure Service

**Basic Settings:**
- **Name**: `divine-cakery-api`
- **Region**: **Singapore** (closest to India)
- **Branch**: `main`
- **Root Directory**: (leave blank)
- **Runtime**: **Python 3**

**Build & Deploy Commands:**
- **Build Command**: 
  ```
  pip install -r requirements.txt
  ```
- **Start Command**: 
  ```
  uvicorn server:app --host 0.0.0.0 --port $PORT
  ```

**Instance Type:**
- **Plan**: **Free**

### Step 5: Add Environment Variables

Scroll down to **"Environment Variables"** section.

Click **"Add Environment Variable"** for each of these:

**Copy-paste each variable:**

```
Key: MONGO_URL
Value: mongodb+srv://divinecakery:Tunak%2Fkk2%24@divinecakery.0vv8unb.mongodb.net/?appName=divinecakery
```

```
Key: DB_NAME
Value: divine_cakery
```

```
Key: SECRET_KEY
Value: divine_cakery_prod_secret_key_2024_secure_change_this_789
```

```
Key: RAZORPAY_KEY_ID
Value: rzp_test_RWMdSO0IeFPkBy
```

```
Key: RAZORPAY_KEY_SECRET
Value: TVsEj3kHSX8Qango60GbXET5
```

```
Key: RAZORPAY_WEBHOOK_SECRET
Value: (leave empty)
```

```
Key: SMTP_SERVER
Value: smtp-mail.outlook.com
```

```
Key: SMTP_PORT
Value: 587
```

```
Key: SMTP_USERNAME
Value: somann2@hotmail.com
```

```
Key: SMTP_PASSWORD
Value: oorbxzvzsygwrzxm
```

```
Key: ADMIN_EMAIL
Value: somann2@hotmail.com
```

```
Key: PYTHON_VERSION
Value: 3.11
```

### Step 6: Create Web Service
1. Scroll to bottom
2. Click **"Create Web Service"**
3. Wait 5-10 minutes for deployment
4. Watch the build logs (will show installation progress)

### Step 7: Get Your Backend URL

Once deployed successfully, you'll see:
```
Your service is live at https://divine-cakery-api.onrender.com
```

**Copy this URL!**

### Step 8: Test Deployment

Visit these URLs to verify:

1. **API Docs**: `https://divine-cakery-api.onrender.com/docs`
   - Should show FastAPI Swagger documentation

2. **Get Products**: `https://divine-cakery-api.onrender.com/api/products`
   - Should return JSON with 113 products

3. **Get Categories**: `https://divine-cakery-api.onrender.com/api/categories`
   - Should return JSON with categories

### Step 9: Share Backend URL With Me

Once you see "Your service is live", copy the URL and share it with me.

**Format**: `https://divine-cakery-api.onrender.com` (or similar)

---

## What Happens Next

After you share the backend URL, I'll:
1. ✅ Update mobile app configuration
2. ✅ Create Build 27 (with new icon!)
3. ✅ Generate AAB file
4. ✅ Guide you through Google Play upload
5. ✅ Fix login issue completely!

---

## Troubleshooting

### Build Fails
- Check logs in Render dashboard
- Ensure all environment variables are correct
- Verify MONGO_URL has correct format

### Service Shows "Unhealthy"
- Check start command is correct
- Verify MongoDB connection string
- Review logs for errors

### Can't See Repository
- Make sure you authorized Render to access GitHub
- Repository must be public or Render must have access
- Try refreshing the repository list

---

## Important Notes

**Render Free Tier:**
- Service spins down after 15 minutes of inactivity
- First request after spin-down takes 30-50 seconds
- Perfect for testing
- Upgrade to $7/month for always-on production

**Your Data:**
- 113 products already in MongoDB Atlas ✅
- 23 users, 59 orders migrated ✅
- Ready to use immediately!

---

## Need Help?

If you encounter any issues during deployment:
1. Take a screenshot of the error
2. Share it with me
3. I'll help you resolve it!

**Go ahead and deploy - takes just 5 minutes!** 🚀
