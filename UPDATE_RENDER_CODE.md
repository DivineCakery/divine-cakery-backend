# How to Update Render Backend Code

## The Problem
Your Render service has the OLD code that doesn't handle products correctly. The database images are optimized, but the backend code needs updating.

## Solution Options

### Option 1: Use Render Shell (Recommended if available)

1. In Render dashboard → Click your service "divine-cakery-backend"
2. Look for **"Shell"** tab in the left menu
3. If you find it, open the shell and run:
   ```bash
   cd /opt/render/project/src
   nano server.py
   ```
4. Find line 436 (the `get_products` function)
5. Replace the old code with the new code (I'll provide below)
6. Save and exit (Ctrl+X, then Y, then Enter)
7. Service will auto-restart

### Option 2: Connect to GitHub (Best long-term solution)

1. **Create GitHub Account** (if you don't have one): https://github.com/signup
2. **Create New Repository**: 
   - Name it: `divine-cakery-backend`
   - Keep it Private
3. **Upload files from this environment**:
   - I can provide you a zip file with all backend files
   - Upload to GitHub via web interface
4. **Connect Render to GitHub**:
   - In Render dashboard → Service Settings
   - Connect to your new repository
5. **Deploy**: Render will auto-deploy from GitHub

### Option 3: Manual File Upload via Git

If Render shows a Git URL in your service, you can:
1. Copy the Git URL from Render
2. I'll help you push the updated code

---

## The Code Change Needed

In `/server.py`, find this function around **line 436**:

### OLD CODE (Currently on Render):
```python
@api_router.get("/products", response_model=List[Product])
async def get_products(
    category: Optional[str] = None,
    is_available: Optional[bool] = None
):
    query = {}
    if category:
        query["$or"] = [
            {"category": category},
            {"categories": category}
        ]
    if is_available is not None:
        query["is_available"] = is_available
    
    products = await db.products.find(query).to_list(1000)
    return [Product(**product) for product in products]
```

### NEW CODE (What you need):
```python
@api_router.get("/products", response_model=List[Product])
async def get_products(
    category: Optional[str] = None,
    is_available: Optional[bool] = None
):
    query = {}
    if category:
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

---

## Quick Check: Does Render Have Shell Access?

**In your Render dashboard, check if you see:**
- "Shell" tab
- "SSH" option
- "Console" option

If YES → Use Option 1 (easiest)
If NO → Use Option 2 (GitHub connection)

---

## Need Help?

Please let me know:
1. Do you see a "Shell" or "Console" tab in Render?
2. Do you have a GitHub account?
3. Would you like me to prepare a complete backend.zip file for you to upload?
