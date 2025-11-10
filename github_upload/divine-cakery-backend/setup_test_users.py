import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def setup_test_users():
    # Connect to MongoDB
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ.get('DB_NAME', 'divine_cakery')]
    
    print(f"Connected to database: {db.name}")
    
    # Test credentials
    test_users = [
        {
            "username": "admin",
            "password": "Admin@123",
            "email": "admin@divinecakery.com",
            "full_name": "Admin User",
            "phone": "9999999999",
            "role": "admin",
            "is_approved": True
        },
        {
            "username": "testcustomer",
            "password": "Test@123",
            "email": "testcustomer@divinecakery.com",
            "full_name": "Test Customer",
            "phone": "8888888888",
            "role": "customer",
            "is_approved": True
        }
    ]
    
    for user_data in test_users:
        username = user_data["username"]
        
        # Check if user exists
        existing_user = await db.users.find_one({"username": username})
        
        hashed_password = pwd_context.hash(user_data["password"])
        
        user_doc = {
            "username": username,
            "email": user_data["email"],
            "full_name": user_data["full_name"],
            "phone": user_data["phone"],
            "hashed_password": hashed_password,
            "role": user_data["role"],
            "is_approved": user_data["is_approved"],
            "is_active": True,
            "address": "",
            "gst_number": None
        }
        
        if existing_user:
            # Update existing user
            result = await db.users.update_one(
                {"username": username},
                {"$set": user_doc}
            )
            print(f"✅ Updated user: {username} (password: {user_data['password']})")
        else:
            # Create new user
            result = await db.users.insert_one(user_doc)
            print(f"✅ Created user: {username} (password: {user_data['password']})")
    
    # List all users in database
    print("\n📋 All users in database:")
    users = await db.users.find({}, {"username": 1, "email": 1, "role": 1, "is_approved": 1}).to_list(length=100)
    for user in users:
        print(f"  - {user['username']} ({user['role']}) - approved: {user.get('is_approved', False)}")
    
    client.close()
    print("\n✅ Test users setup complete!")

if __name__ == "__main__":
    asyncio.run(setup_test_users())
