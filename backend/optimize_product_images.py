"""
Script to optimize product images in MongoDB
Finds products with large base64 images and compresses them
"""
import asyncio
import base64
import io
import os
from motor.motor_asyncio import AsyncIOMotorClient
from PIL import Image
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'divine_cakery')]


def compress_image_base64(base64_str: str, max_size_kb: int = 100) -> str:
    """
    Compress a base64 image to target size
    
    Args:
        base64_str: Base64 encoded image string
        max_size_kb: Maximum size in KB (default 100KB)
    
    Returns:
        Compressed base64 string
    """
    try:
        # Remove data URI prefix if present
        if ',' in base64_str:
            header, base64_str = base64_str.split(',', 1)
        else:
            header = None
        
        # Decode base64 to image
        image_data = base64.b64decode(base64_str)
        image = Image.open(io.BytesIO(image_data))
        
        # Convert RGBA to RGB if necessary
        if image.mode == 'RGBA':
            background = Image.new('RGB', image.size, (255, 255, 255))
            background.paste(image, mask=image.split()[3])
            image = background
        
        # Resize if very large
        max_dimension = 800
        if image.width > max_dimension or image.height > max_dimension:
            image.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)
        
        # Try different quality levels until we get under target size
        quality = 85
        while quality > 20:
            output = io.BytesIO()
            image.save(output, format='JPEG', quality=quality, optimize=True)
            output.seek(0)
            
            # Check size
            size_kb = len(output.getvalue()) / 1024
            if size_kb <= max_size_kb:
                break
            
            quality -= 10
        
        # Encode back to base64
        compressed_base64 = base64.b64encode(output.getvalue()).decode('utf-8')
        
        # Add back header if it existed
        if header:
            compressed_base64 = f"{header},{compressed_base64}"
        
        print(f"  Compressed from {len(base64_str)/1024:.1f}KB to {len(compressed_base64)/1024:.1f}KB (quality={quality})")
        return compressed_base64
    
    except Exception as e:
        print(f"  Error compressing image: {e}")
        return base64_str  # Return original if compression fails


async def optimize_product_images():
    """Find and optimize all products with large images"""
    
    print("=" * 60)
    print("Product Image Optimization Script")
    print("=" * 60)
    
    # Find all products
    products = await db.products.find({}).to_list(None)
    print(f"\nFound {len(products)} products")
    
    # Track statistics
    stats = {
        'total': len(products),
        'with_images': 0,
        'large_images': 0,
        'optimized': 0,
        'errors': 0,
        'bytes_saved': 0
    }
    
    for product in products:
        product_id = product.get('id', 'unknown')
        product_name = product.get('name', 'Unknown')
        image_base64 = product.get('image_base64')
        
        if not image_base64:
            continue
        
        stats['with_images'] += 1
        original_size = len(image_base64)
        original_size_kb = original_size / 1024
        
        # Check if image is large (> 100KB)
        if original_size_kb > 100:
            stats['large_images'] += 1
            print(f"\n[{stats['large_images']}] Product: {product_name} ({product_id})")
            print(f"  Current size: {original_size_kb:.1f}KB")
            
            # Compress the image
            try:
                compressed = compress_image_base64(image_base64, max_size_kb=100)
                new_size = len(compressed)
                new_size_kb = new_size / 1024
                
                # Update in database
                await db.products.update_one(
                    {"id": product_id},
                    {"$set": {"image_base64": compressed}}
                )
                
                stats['optimized'] += 1
                stats['bytes_saved'] += (original_size - new_size)
                
                print(f"  ✅ Optimized! New size: {new_size_kb:.1f}KB")
                
            except Exception as e:
                stats['errors'] += 1
                print(f"  ❌ Error: {e}")
    
    # Print summary
    print("\n" + "=" * 60)
    print("OPTIMIZATION SUMMARY")
    print("=" * 60)
    print(f"Total products: {stats['total']}")
    print(f"Products with images: {stats['with_images']}")
    print(f"Products with large images (>100KB): {stats['large_images']}")
    print(f"Successfully optimized: {stats['optimized']}")
    print(f"Errors: {stats['errors']}")
    print(f"Total space saved: {stats['bytes_saved']/1024/1024:.2f}MB")
    print("=" * 60)


async def main():
    try:
        await optimize_product_images()
    except Exception as e:
        print(f"\nFatal error: {e}")
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(main())
