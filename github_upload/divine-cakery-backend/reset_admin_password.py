import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def reset_admin():
    MONGO_URL = "mongodb://localhost:27017"
    client = AsyncIOMotorClient(MONGO_URL)
    db = client.divine_cakery
    
    # Update the admin user's password
    result = await db.users.update_one(
        {"username": "admin"},
        {"$set": {"hashed_password": pwd_context.hash("admin123")}}
    )
    
    if result.modified_count > 0:
        print("✓ Admin password reset to: admin123")
    else:
        print("⚠️  Admin user not found or password already set")
    
    client.close()

asyncio.run(reset_admin())
