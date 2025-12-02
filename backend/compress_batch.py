"""Quick batch compression - processes 10 products at a time"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
import sys
import base64
import io
from PIL import Image

def compress_base64_image(base64_string: str, max_width: int = 800, quality: int = 70) -> str:
    try:
        if ',' in base64_string:
            base64_string = base64_string.split(',', 1)[1]
        image_bytes = base64.b64decode(base64_string)
        img = Image.open(io.BytesIO(image_bytes))
        if img.mode in ('RGBA', 'LA', 'P'):
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
            img = background
        if img.width > max_width:
            ratio = max_width / img.width
            new_height = int(img.height * ratio)
            img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)
        buffer = io.BytesIO()
        img.save(buffer, format='JPEG', quality=quality, optimize=True)
        buffer.seek(0)
        return base64.b64encode(buffer.read()).decode('utf-8')
    except Exception as e:
        return base64_string

async def compress_batch(limit=10):
    mongo_url = os.environ.get("MONGO_URL")
    client = AsyncIOMotorClient(mongo_url)
    db = client.divine_cakery
    
    # Get products with large images (> 100KB)
    products = await db.products.find({
        "image_base64": {"$exists": True, "$ne": ""}
    }).to_list(None)
    
    large_products = [p for p in products if len(p.get("image_base64", "")) > 100000]
    
    print(f"Found {len(large_products)} products with large images")
    
    for i, product in enumerate(large_products[:limit], 1):
        original = product.get("image_base64", "")
        compressed = compress_base64_image(original)
        
        await db.products.update_one(
            {"id": product["id"]},
            {"$set": {"image_base64": compressed}}
        )
        
        print(f"{i}. {product['name'][:30]} - {len(original)} → {len(compressed)} bytes")
    
    remaining = len(large_products) - limit
    print(f"\n✅ Compressed {min(limit, len(large_products))} products")
    if remaining > 0:
        print(f"⚠️  {remaining} products remaining - run again to continue")

if __name__ == "__main__":
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else 10
    asyncio.run(compress_batch(limit))
