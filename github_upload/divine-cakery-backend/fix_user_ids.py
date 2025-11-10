"""
Script to add missing 'id' fields to existing users in the database.
This is a one-time migration script.
"""
import asyncio
import os
import uuid
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

async def fix_user_ids():
    # Connect to MongoDB
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ.get('DB_NAME', 'divine_cakery')]
    
    print(f"Connected to database: {db.name}\n")
    print("Checking for users without 'id' field...")
    
    # Find users without 'id' field
    users_without_id = await db.users.find({"id": {"$exists": False}}).to_list(1000)
    
    if not users_without_id:
        print("✅ All users have 'id' field. No migration needed.")
        client.close()
        return
    
    print(f"Found {len(users_without_id)} users without 'id' field\n")
    
    fixed_count = 0
    for user in users_without_id:
        # Generate new UUID for this user
        new_id = str(uuid.uuid4())
        
        # Update the user with new id
        result = await db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"id": new_id}}
        )
        
        if result.modified_count > 0:
            print(f"✅ Fixed user: {user.get('username', 'unknown')} (id: {new_id})")
            fixed_count += 1
        else:
            print(f"❌ Failed to fix user: {user.get('username', 'unknown')}")
    
    print(f"\n✅ Migration complete! Fixed {fixed_count} users.")
    
    # List all users with their IDs
    print("\n📋 All users in database:")
    all_users = await db.users.find({}, {"id": 1, "username": 1, "role": 1, "is_approved": 1}).to_list(1000)
    for user in all_users:
        print(f"  - {user.get('username')} ({user.get('role')}) - ID: {user.get('id', 'MISSING')} - Approved: {user.get('is_approved', False)}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(fix_user_ids())
