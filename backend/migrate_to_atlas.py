#!/usr/bin/env python3
"""
Migrate data from local MongoDB to MongoDB Atlas
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime

# Connection strings
LOCAL_MONGO = "mongodb://localhost:27017"
ATLAS_MONGO = "mongodb+srv://divinecakery:Tunak%2Fkk2%24@divinecakery.0vv8unb.mongodb.net/?appName=divinecakery"
DB_NAME = "divine_cakery"

async def migrate_collection(local_db, atlas_db, collection_name):
    """Migrate a single collection"""
    print(f"\n📦 Migrating {collection_name}...")
    
    # Get all documents from local
    cursor = local_db[collection_name].find({})
    documents = await cursor.to_list(length=None)
    
    if not documents:
        print(f"   ⚠️  No documents in {collection_name}")
        return 0
    
    # Clear Atlas collection first
    await atlas_db[collection_name].delete_many({})
    
    # Insert into Atlas
    result = await atlas_db[collection_name].insert_many(documents)
    count = len(result.inserted_ids)
    
    print(f"   ✅ Migrated {count} documents")
    return count

async def migrate_all():
    """Migrate all collections"""
    print("=" * 60)
    print("MONGODB MIGRATION: Local → Atlas")
    print("=" * 60)
    
    # Connect to both databases
    print("\n🔌 Connecting to databases...")
    local_client = AsyncIOMotorClient(LOCAL_MONGO)
    atlas_client = AsyncIOMotorClient(ATLAS_MONGO)
    
    local_db = local_client[DB_NAME]
    atlas_db = atlas_client[DB_NAME]
    
    # Test connections
    try:
        await local_client.server_info()
        print("   ✅ Local MongoDB connected")
    except Exception as e:
        print(f"   ❌ Local MongoDB error: {e}")
        return
    
    try:
        await atlas_client.server_info()
        print("   ✅ Atlas MongoDB connected")
    except Exception as e:
        print(f"   ❌ Atlas MongoDB error: {e}")
        return
    
    # Collections to migrate
    collections = [
        "products",
        "users",
        "orders",
        "categories",
        "wallets",
        "standing_orders"
    ]
    
    total_migrated = 0
    
    for collection in collections:
        try:
            count = await migrate_collection(local_db, atlas_db, collection)
            total_migrated += count
        except Exception as e:
            print(f"   ❌ Error migrating {collection}: {e}")
    
    # Close connections
    local_client.close()
    atlas_client.close()
    
    print("\n" + "=" * 60)
    print("MIGRATION COMPLETE")
    print("=" * 60)
    print(f"Total documents migrated: {total_migrated}")
    print("\n✅ Your data is now on MongoDB Atlas!")
    print("🚀 Ready for Render.com deployment")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(migrate_all())
