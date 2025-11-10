# Render Shell Commands - Update server.py

## Step-by-Step Instructions

### Step 1: Open Shell
1. In Render dashboard, click on **divine-cakery-backend** service
2. Click on **"Shell"** tab
3. Wait for shell to connect

### Step 2: Navigate to Project Directory
Copy and paste this command:
```bash
cd /opt/render/project/src
```

### Step 3: Check Current Location
```bash
pwd
ls -la server.py
```
You should see server.py listed.

### Step 4: Backup Current File (Just in Case)
```bash
cp server.py server.py.backup
```

### Step 5: Edit the File
```bash
nano server.py
```

### Step 6: Find the get_products Function
- Press `Ctrl + W` (search in nano)
- Type: `def get_products`
- Press Enter

You'll see the function starting around line 436.

### Step 7: Replace the Function
Select and delete the OLD function (from line 436 to 452).

**OLD CODE TO DELETE:**
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

**NEW CODE TO PASTE:**
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
        
        # Process products and truncate large images
        processed_products = []
        for product in products:
            # Truncate image_base64 if it's too large (> 500KB base64)
            if product.get("image_base64") and len(product["image_base64"]) > 500000:
                logger.warning(f"Product {product.get('id', 'unknown')} has large image ({len(product['image_base64'])} chars), truncating for API response")
                product["image_base64"] = product["image_base64"][:500000] + "...truncated"
            
            try:
                processed_products.append(Product(**product))
            except Exception as e:
                logger.error(f"Error processing product {product.get('id', 'unknown')}: {str(e)}")
                continue
        
        return processed_products
    except Exception as e:
        logger.error(f"Error fetching products: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching products: {str(e)}")
```

### Step 8: Save and Exit
1. Press `Ctrl + X` (exit)
2. Press `Y` (yes to save)
3. Press `Enter` (confirm filename)

### Step 9: Verify Changes
```bash
grep -A 5 "Process products and truncate" server.py
```
You should see the new code displayed.

### Step 10: Service Will Auto-Restart
Render will automatically detect the change and restart the service.
Wait 30-60 seconds.

### Step 11: Verify It's Working
After 1 minute, run:
```bash
curl http://localhost:10000/api/health
```
Should return: `{"status":"healthy"}`

Then:
```bash
curl -s http://localhost:10000/api/products | head -100
```
Should return product data (not errors).

---

## If Nano is Not Available

If nano doesn't work, try:
```bash
vi server.py
```

Or use sed command (I can provide if needed).

---

## Quick Copy-Paste Version

If you want, I can provide a single sed command that automatically replaces the function without manual editing. Let me know!

---

## After Update

1. Exit the shell
2. Check your Render logs for "Application startup complete"
3. Test from your mobile app
4. Products should now load!
