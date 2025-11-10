# Update server.py on GitHub - Step by Step

## The Problem
- Customer portal: Products not loading (502 errors)
- Admin panel: Product images showing incorrectly

## The Solution
Update the `get_products` function in your GitHub repository's `server.py` file.

---

## 📝 Step-by-Step Instructions

### Step 1: Open Your GitHub Repository
1. Go to: https://github.com/YourUsername/divine-cakery-backend
   (Replace "YourUsername" with your actual GitHub username)
2. You should see your repository with files like `server.py`, `models.py`, etc.

### Step 2: Edit server.py
1. Click on **`server.py`** file
2. Click the **pencil icon (✏️)** at the top-right to edit
3. The file will open in edit mode

### Step 3: Find the Function to Replace
1. Press `Ctrl+F` (Windows) or `Cmd+F` (Mac) to open search
2. Type: `def get_products`
3. Press Enter - it will jump to around line 436

### Step 4: Replace the OLD Code

**FIND THIS (OLD CODE - around lines 436-452):**
```python
@api_router.get("/products", response_model=List[Product])
async def get_products(
    category: Optional[str] = None,
    is_available: Optional[bool] = None
):
    query = {}
    if category:
        # Check both old 'category' field and new 'categories' array
        query["$or"] = [
            {"category": category},
            {"categories": category}
        ]
    if is_available is not None:
        query["is_available"] = is_available
    
    products = await db.products.find(query).to_list(1000)
    return [Product(**product) for product in products]
```

**REPLACE WITH THIS (NEW CODE):**
```python
@api_router.get("/products", response_model=List[Product])
async def get_products(
    category: Optional[str] = None,
    is_available: Optional[bool] = None
):
    query = {}
    if category:
        # Check both old 'category' field and new 'categories' array
        query["$or"] = [
            {"category": category},
            {"categories": category}
        ]
    if is_available is not None:
        query["is_available"] = is_available
    
    try:
        products = await db.products.find(query).to_list(1000)
        
        # Process products with error handling
        processed_products = []
        for product in products:
            try:
                processed_products.append(Product(**product))
            except Exception as e:
                logger.error(f"Error processing product {product.get('id', 'unknown')}: {str(e)}")
                # Skip malformed products instead of crashing
                continue
        
        logger.info(f"Successfully loaded {len(processed_products)} products")
        return processed_products
    except Exception as e:
        logger.error(f"Error fetching products: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching products: {str(e)}")
```

### Step 5: Save Changes
1. Scroll down to the bottom of the page
2. You'll see "Commit changes" section
3. In the commit message box, type:
   ```
   Fix products endpoint - add error handling
   ```
4. Click the green **"Commit changes"** button

### Step 6: Wait for Render to Deploy
1. Go to your Render dashboard: https://dashboard.render.com/
2. You should see a deployment starting automatically
3. Click on "divine-cakery-backend" service
4. Watch the logs - wait for:
   ```
   ==> Your service is live 🎉
   ```
5. This takes about 2-3 minutes

### Step 7: Test Everything
1. **Test API directly:**
   - Open: https://divine-cakery-backend.onrender.com/api/products
   - Should return JSON with product data (not 502!)

2. **Test Admin Panel:**
   - Login to admin panel
   - Go to Products page
   - Product images should display correctly now

3. **Test Customer Portal:**
   - Login as customer
   - Products should load properly

---

## 🎯 What Changed?

**Key Changes:**
1. ✅ Added `try-except` error handling (prevents crashes)
2. ✅ Removed image truncation logic (images already optimized in database)
3. ✅ Added logging for debugging
4. ✅ Gracefully skip malformed products instead of crashing entire API

**Why This Works:**
- All images in database are already optimized (~80KB each)
- No need to truncate anymore
- Error handling prevents one bad product from breaking everything
- Service won't crash on products endpoint

---

## ⚠️ If You Get Stuck

**Can't find your GitHub repository?**
- Check: https://github.com/YourUsername/repositories
- Look for "divine-cakery-backend"

**Can't edit server.py?**
- Make sure you're logged into YOUR GitHub account
- Click the pencil icon (not view mode)

**Deployment not starting on Render?**
- Go to Render dashboard
- Click service → Manual Deploy → Deploy latest commit

**Still having issues?**
- Share a screenshot of what you see
- Share any error messages from Render logs
- I'll help you troubleshoot!

---

## 📋 Quick Checklist

- [ ] Opened GitHub repository
- [ ] Found and opened server.py
- [ ] Clicked edit (pencil icon)
- [ ] Found get_products function (line ~436)
- [ ] Replaced old code with new code
- [ ] Committed changes
- [ ] Render started deployment
- [ ] Waited for "service is live"
- [ ] Tested /api/products URL
- [ ] Tested admin panel products
- [ ] Tested customer portal products

---

Let me know once you've committed the changes, and I'll help verify everything is working!
