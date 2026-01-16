#!/usr/bin/env python3
"""
Create or update admin user for testing
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path
from passlib.context import CryptContext
import uuid
from datetime import datetime

# Load environment variables
ROOT_DIR = Path(__file__).parent / "backend"
load_dotenv(ROOT_DIR / '.env')

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_test_admin():
    # MongoDB connection
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ.get('DB_NAME', 'divine_cakery')]
    
    print("🔧 Creating/updating test admin user...")
    
    # Check if testadmin exists
    existing_user = await db.users.find_one({"username": "testadmin"})
    
    if existing_user:
        print("📝 Updating existing testadmin user to admin role...")
        
        # Update the user to admin role with known password
        hashed_password = pwd_context.hash("admin123")
        
        await db.users.update_one(
            {"username": "testadmin"},
            {"$set": {
                "role": "admin",
                "hashed_password": hashed_password,
                "is_approved": True,
                "is_active": True,
                "is_superadmin": False
            }}
        )
        
        print("✅ Updated testadmin user:")
        print("   Username: testadmin")
        print("   Password: admin123")
        print("   Role: admin")
        
    else:
        print("🆕 Creating new test admin user...")
        
        # Create new admin user
        user_id = str(uuid.uuid4())
        hashed_password = pwd_context.hash("admin123")
        
        user_dict = {
            "id": user_id,
            "username": "testadmin",
            "email": "test@example.com",
            "phone": "+919876543210",
            "role": "admin",
            "business_name": "Test Admin",
            "address": "Test Address",
            "wallet_balance": 0.0,
            "can_topup_wallet": True,
            "hashed_password": hashed_password,
            "created_at": datetime.utcnow(),
            "is_active": True,
            "is_approved": True,
            "is_superadmin": False,
            "favorite_products": [],
            "onsite_pickup_only": False,
            "delivery_charge_waived": False,
            "admin_access_level": "full",
            "user_type": "owner",
            "linked_owner_id": None,
            "allowed_product_ids": None,
            "pay_later_enabled": False,
            "pay_later_max_limit": 0
        }
        
        await db.users.insert_one(user_dict)
        
        print("✅ Created new admin user:")
        print("   Username: testadmin")
        print("   Password: admin123")
        print("   Role: admin")
    
    # Test login
    print("\n🔐 Testing login...")
    
    user = await db.users.find_one({"username": "testadmin"})
    if user:
        print(f"   User found: {user['username']}")
        print(f"   Role: {user['role']}")
        print(f"   Is Active: {user['is_active']}")
        print(f"   Is Approved: {user['is_approved']}")
        
        # Verify password
        if pwd_context.verify("admin123", user["hashed_password"]):
            print("   ✅ Password verification successful")
        else:
            print("   ❌ Password verification failed")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_test_admin())