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

async def create_admin():
    # MongoDB connection
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ.get('DB_NAME', 'divine_cakery')]
    
    # Check if admin already exists
    existing_admin = await db.users.find_one({"username": "admin"})
    if existing_admin:
        print("Admin user already exists, deleting and recreating...")
        await db.users.delete_one({"username": "admin"})
        await db.wallets.delete_one({"user_id": existing_admin["id"]})
    
    # Create admin user
    admin_id = str(uuid.uuid4())
    hashed_password = pwd_context.hash("admin123")
    
    admin_dict = {
        "id": admin_id,
        "username": "admin",
        "email": "admin@divinecakery.in",
        "phone": "9999999999",
        "role": "admin",
        "business_name": "Divine Cakery",
        "address": "BNRA 161, Bhagawathi Nagar, NCC Road, Thiruvananthapuram, Kerala",
        "wallet_balance": 0.0,
        "hashed_password": hashed_password,
        "created_at": datetime.utcnow(),
        "is_active": True
    }
    
    await db.users.insert_one(admin_dict)
    
    # Create wallet for admin
    wallet_dict = {
        "user_id": admin_id,
        "balance": 0.0,
        "updated_at": datetime.utcnow()
    }
    await db.wallets.insert_one(wallet_dict)
    
    print("Admin user created successfully!")
    print("Username: admin")
    print("Password: admin123")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_admin())
