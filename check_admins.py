import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def check_admins():
    MONGO_URL = "mongodb://localhost:27017"
    client = AsyncIOMotorClient(MONGO_URL)
    db = client.divine_cakery
    
    print("Checking admin users...")
    admins = []
    async for user in db.users.find({"role": "admin"}):
        admins.append({
            "username": user.get("username"),
            "name": user.get("name"),
            "role": user.get("role")
        })
    
    if admins:
        print(f"\nFound {len(admins)} admin(s):")
        for admin in admins:
            print(f"  - Username: {admin['username']}, Name: {admin['name']}")
    else:
        print("\n⚠️  No admin users found in database!")
        print("Creating default admin...")
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        
        admin_user = {
            "id": "admin-001",
            "username": "admin",
            "name": "Admin User",
            "email": "admin@divinecakery.com",
            "phone": "1234567890",
            "address": "Divine Cakery HQ",
            "role": "admin",
            "hashed_password": pwd_context.hash("admin123"),
            "wallet_balance": 0.0,
            "is_active": True,
            "favorite_products": [],
            "is_approved": True
        }
        
        await db.users.insert_one(admin_user)
        print("✓ Admin user created: username=admin, password=admin123")
    
    client.close()

asyncio.run(check_admins())
