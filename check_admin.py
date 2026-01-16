#!/usr/bin/env python3
"""
Check for existing admin users in the database
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent / "backend"
load_dotenv(ROOT_DIR / '.env')

async def check_admin_users():
    # MongoDB connection
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ.get('DB_NAME', 'divine_cakery')]
    
    print("🔍 Checking for existing users in database...")
    
    # Get all users
    users = await db.users.find().to_list(1000)
    
    print(f"📊 Found {len(users)} total users")
    
    # Check for admin users
    admin_users = [u for u in users if u.get("role") == "admin"]
    superadmin_users = [u for u in users if u.get("is_superadmin") == True]
    
    print(f"👑 Admin users: {len(admin_users)}")
    print(f"🔑 Superadmin users: {len(superadmin_users)}")
    
    if admin_users:
        print("\n🔐 Admin users found:")
        for user in admin_users:
            print(f"  - Username: {user.get('username')}")
            print(f"    Role: {user.get('role')}")
            print(f"    Is Superadmin: {user.get('is_superadmin', False)}")
            print(f"    Is Active: {user.get('is_active', True)}")
            print()
    
    if superadmin_users:
        print("\n👑 Superadmin users found:")
        for user in superadmin_users:
            print(f"  - Username: {user.get('username')}")
            print(f"    Role: {user.get('role')}")
            print(f"    Is Active: {user.get('is_active', True)}")
            print()
    
    # Check for any users with admin-like usernames
    potential_admins = [u for u in users if any(keyword in u.get('username', '').lower() 
                       for keyword in ['admin', 'soman', 'divine', 'kitchen'])]
    
    if potential_admins:
        print("\n🤔 Users with admin-like usernames:")
        for user in potential_admins:
            print(f"  - Username: {user.get('username')}")
            print(f"    Role: {user.get('role')}")
            print(f"    Is Superadmin: {user.get('is_superadmin', False)}")
            print(f"    Is Active: {user.get('is_active', True)}")
            print()
    
    # Show first few users for reference
    print("\n📋 Sample users (first 5):")
    for i, user in enumerate(users[:5]):
        print(f"  {i+1}. Username: {user.get('username')}")
        print(f"     Role: {user.get('role')}")
        print(f"     Is Active: {user.get('is_active', True)}")
        print()
    
    client.close()

if __name__ == "__main__":
    asyncio.run(check_admin_users())