"""
Script to initialize order counter to 101
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

async def init_counter():
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client['divine_cakery']
    
    # Check if counter exists
    counter = await db.counters.find_one({"_id": "order_counter"})
    
    if counter:
        print(f"Counter already exists with sequence: {counter.get('sequence')}")
        # Update to 100 so next order will be 101
        await db.counters.update_one(
            {"_id": "order_counter"},
            {"$set": {"sequence": 100}}
        )
        print("Counter reset to 100 (next order will be 101)")
    else:
        # Create counter starting at 100 (next will be 101)
        await db.counters.insert_one({
            "_id": "order_counter",
            "sequence": 100
        })
        print("Counter created at 100 (next order will be 101)")
    
    # Verify
    counter = await db.counters.find_one({"_id": "order_counter"})
    print(f"Current counter value: {counter.get('sequence')}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(init_counter())
