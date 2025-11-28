import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import os
from dotenv import load_dotenv
from pathlib import Path
import uuid
from datetime import datetime

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_demo_admins():
    # MongoDB connection
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ.get('DB_NAME', 'divine_cakery')]
    
    # Create LIMITED ACCESS admin (orders manager)
    print("\n=== Creating Limited Access Admin ===")
    existing_limited = await db.users.find_one({"username": "ordermanager"})
    if existing_limited:
        print("Order Manager user already exists, deleting and recreating...")
        await db.users.delete_one({"username": "ordermanager"})
        await db.wallets.delete_one({"user_id": existing_limited["id"]})
    
    limited_id = str(uuid.uuid4())
    limited_password = pwd_context.hash("orders123")
    
    limited_dict = {
        "id": limited_id,
        "username": "ordermanager",
        "email": "orders@divinecakery.in",
        "phone": "8888888888",
        "role": "admin",
        "admin_access_level": "limited",  # LIMITED ACCESS
        "business_name": "Divine Cakery",
        "address": "BNRA 161, Bhagawathi Nagar, NCC Road, Thiruvananthapuram, Kerala",
        "wallet_balance": 0.0,
        "hashed_password": limited_password,
        "created_at": datetime.utcnow(),
        "is_active": True
    }
    
    await db.users.insert_one(limited_dict)
    
    # Create wallet
    wallet_dict = {
        "user_id": limited_id,
        "balance": 0.0,
        "updated_at": datetime.utcnow()
    }
    await db.wallets.insert_one(wallet_dict)
    
    print("✅ LIMITED ACCESS Admin created!")
    print("   Username: ordermanager")
    print("   Password: orders123")
    print("   Access: Dashboard + Orders ONLY")
    
    # Create REPORTS ONLY admin (accountant)
    print("\n=== Creating Reports Only Admin ===")
    existing_reports = await db.users.find_one({"username": "accountant"})
    if existing_reports:
        print("Accountant user already exists, deleting and recreating...")
        await db.users.delete_one({"username": "accountant"})
        await db.wallets.delete_one({"user_id": existing_reports["id"]})
    
    reports_id = str(uuid.uuid4())
    reports_password = pwd_context.hash("reports123")
    
    reports_dict = {
        "id": reports_id,
        "username": "accountant",
        "email": "accounts@divinecakery.in",
        "phone": "7777777777",
        "role": "admin",
        "admin_access_level": "reports",  # REPORTS ACCESS
        "business_name": "Divine Cakery",
        "address": "BNRA 161, Bhagawathi Nagar, NCC Road, Thiruvananthapuram, Kerala",
        "wallet_balance": 0.0,
        "hashed_password": reports_password,
        "created_at": datetime.utcnow(),
        "is_active": True
    }
    
    await db.users.insert_one(reports_dict)
    
    # Create wallet
    wallet_dict = {
        "user_id": reports_id,
        "balance": 0.0,
        "updated_at": datetime.utcnow()
    }
    await db.wallets.insert_one(wallet_dict)
    
    print("✅ REPORTS ONLY Admin created!")
    print("   Username: accountant")
    print("   Password: reports123")
    print("   Access: Dashboard (minimal) + Reports ONLY")
    
    print("\n" + "="*50)
    print("DEMO ADMIN ACCOUNTS CREATED SUCCESSFULLY!")
    print("="*50)
    print("\nYou now have 3 admin accounts:")
    print("\n1. FULL ACCESS:")
    print("   Username: admin")
    print("   Password: admin123")
    print("   → Can access everything")
    
    print("\n2. LIMITED ACCESS (Orders Manager):")
    print("   Username: ordermanager")
    print("   Password: orders123")
    print("   → Can access: Dashboard + Orders only")
    
    print("\n3. REPORTS ONLY (Accountant):")
    print("   Username: accountant")
    print("   Password: reports123")
    print("   → Can access: Dashboard (minimal) + Daily Items Report only")
    
    print("\n" + "="*50)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_demo_admins())
