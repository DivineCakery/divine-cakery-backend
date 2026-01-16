#!/usr/bin/env python3
"""
Direct MongoDB test to verify standing order update logic
"""

import asyncio
import os
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient

# MongoDB connection
mongo_url = "mongodb+srv://divinecakery:Tunak%2Fkk2%24@divinecakery.0vv8unb.mongodb.net/?appName=divinecakery"
client = AsyncIOMotorClient(mongo_url)
db = client["divine_cakery"]

async def test_standing_order_update():
    """Test the standing order update logic directly"""
    
    standing_order_id = "ec659ed9-4d46-41c8-bcd5-0d90f141249d"
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    print(f"Testing standing order: {standing_order_id}")
    print(f"Today: {today}")
    
    # First, count how many orders should be updated
    count_query = {
        "standing_order_id": standing_order_id,
        "delivery_date": {"$gte": today},
        "is_standing_order": True
    }
    
    orders_to_update = await db.orders.count_documents(count_query)
    print(f"Orders matching update criteria: {orders_to_update}")
    
    # Get the actual orders to see their current state
    orders = await db.orders.find(count_query).to_list(100)
    print(f"Found {len(orders)} orders:")
    
    for order in orders[:3]:  # Show first 3
        order_id = order.get("id", "unknown")[:8]
        delivery_date = order.get("delivery_date", "unknown")
        items = order.get("items", [])
        quantities = [item.get("quantity", 0) for item in items]
        print(f"  Order {order_id}: delivery={delivery_date}, quantities={quantities}")
    
    # Test the update operation
    new_items = [
        {
            "product_id": "test-product-1",
            "product_name": "Test Product 1", 
            "quantity": 99,
            "price": 100.0,
            "subtotal": 9900.0
        }
    ]
    
    new_total = 9900.0
    
    print(f"\nTesting update with new items: {new_items}")
    
    # Perform the update
    update_result = await db.orders.update_many(
        count_query,
        {
            "$set": {
                "items": new_items,
                "total_amount": new_total,
                "final_amount": new_total,
                "notes": "Test update from direct MongoDB test",
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    print(f"Update result: matched={update_result.matched_count}, modified={update_result.modified_count}")
    
    # Verify the update
    updated_orders = await db.orders.find(count_query).to_list(100)
    print(f"\nAfter update:")
    
    for order in updated_orders[:3]:  # Show first 3
        order_id = order.get("id", "unknown")[:8]
        items = order.get("items", [])
        quantities = [item.get("quantity", 0) for item in items]
        notes = order.get("notes", "")
        print(f"  Order {order_id}: quantities={quantities}, notes='{notes[:50]}...'")
    
    # Close connection
    client.close()

if __name__ == "__main__":
    asyncio.run(test_standing_order_update())