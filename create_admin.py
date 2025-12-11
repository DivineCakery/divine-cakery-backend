#!/usr/bin/env python3
"""
Script to create an admin user for testing
"""

import asyncio
import os
import sys
from datetime import datetime
import uuid
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from dotenv import load_dotenv
from pathlib import Path

# Load environment
ROOT_DIR = Path(__file__).parent / "backend"
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'divine_cakery')]

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_admin_user():
    """Create admin user if it doesn't exist"""
    try:
        # Check if admin user already exists
        existing_admin = await db.users.find_one({"username": "admin"})
        
        if existing_admin:
            print("✅ Admin user already exists")
            return True
        
        # Create admin user
        admin_id = str(uuid.uuid4())
        hashed_password = pwd_context.hash("admin123")
        
        admin_dict = {
            "id": admin_id,
            "username": "admin",
            "email": "admin@divinecakery.com",
            "phone": "+919876543210",
            "role": "admin",
            "business_name": "Divine Cakery Admin",
            "address": "Admin Address",
            "wallet_balance": 0.0,
            "can_topup_wallet": True,
            "hashed_password": hashed_password,
            "created_at": datetime.utcnow(),
            "is_active": True,
            "is_approved": True,
            "favorite_products": [],
            "admin_access_level": "full",
            "user_type": "owner",
            "linked_owner_id": None,
            "onsite_pickup_only": False,
            "delivery_charge_waived": False
        }
        
        await db.users.insert_one(admin_dict)
        
        # Create wallet for admin
        wallet_dict = {
            "user_id": admin_id,
            "balance": 0.0,
            "updated_at": datetime.utcnow()
        }
        await db.wallets.insert_one(wallet_dict)
        
        print("✅ Admin user created successfully")
        print("   Username: admin")
        print("   Password: admin123")
        return True
        
    except Exception as e:
        print(f"❌ Error creating admin user: {str(e)}")
        return False

async def main():
    """Main function"""
    print("🔧 Creating admin user...")
    success = await create_admin_user()
    
    if success:
        print("🎉 Admin user setup complete!")
    else:
        print("💥 Failed to create admin user")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())