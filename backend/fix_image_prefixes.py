"""
Script to add data URI prefix to images that are missing it
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

async def fix_image_prefixes():
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client['divine_cakery']
    
    # Find products with images that don't start with 'data:'
    products = await db.products.find({
        "image_base64": {
            "$exists": True,
            "$ne": "",
            "$not": {"$regex": "^data:"}
        }
    }).to_list(None)
    
    print(f"Found {len(products)} products with images missing data URI prefix")
    
    fixed_count = 0
    for product in products:
        product_id = product.get("id")
        product_name = product.get("name", "Unknown")
        original_image = product.get("image_base64", "")
        
        # Add data URI prefix
        fixed_image = f"data:image/jpeg;base64,{original_image}"
        
        # Update in database
        result = await db.products.update_one(
            {"id": product_id},
            {"$set": {"image_base64": fixed_image}}
        )
        
        if result.modified_count > 0:
            fixed_count += 1
            print(f"✓ Fixed: {product_name}")
        else:
            print(f"✗ Failed: {product_name}")
    
    print(f"\n✅ Fixed {fixed_count} out of {len(products)} products")
    
    # Verify fix
    remaining = await db.products.count_documents({
        "image_base64": {
            "$exists": True,
            "$ne": "",
            "$not": {"$regex": "^data:"}
        }
    })
    
    print(f"Remaining products without data URI prefix: {remaining}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(fix_image_prefixes())
