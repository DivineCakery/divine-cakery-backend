import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def verify_users():
    # Connect to MongoDB
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ.get('DB_NAME', 'divine_cakery')]
    
    print(f"Connected to database: {db.name}\n")
    
    # Check both test users
    for username in ["admin", "testcustomer"]:
        user = await db.users.find_one({"username": username})
        
        if user:
            print(f"User: {username}")
            print(f"  Email: {user.get('email')}")
            print(f"  Role: {user.get('role')}")
            print(f"  Approved: {user.get('is_approved')}")
            print(f"  Active: {user.get('is_active')}")
            print(f"  Has password: {bool(user.get('hashed_password'))}")
            
            # Test password verification
            test_passwords = {
                "admin": "Admin@123",
                "testcustomer": "Test@123"
            }
            
            if username in test_passwords:
                is_valid = pwd_context.verify(test_passwords[username], user.get('hashed_password', ''))
                print(f"  Password '{test_passwords[username]}' valid: {is_valid}")
            
            print()
        else:
            print(f"❌ User '{username}' not found!\n")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(verify_users())
