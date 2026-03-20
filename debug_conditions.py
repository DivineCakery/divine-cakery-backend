#!/usr/bin/env python3
"""
Debug test to check the condition logic in standing order update
"""

import asyncio
import aiohttp
import json
from datetime import datetime

BACKEND_URL = "https://daily-reports-v2.preview.emergentagent.com/api"
ADMIN_USERNAME = "testadmin"
ADMIN_PASSWORD = "admin123"

async def test_condition_logic():
    async with aiohttp.ClientSession() as session:
        # Login
        login_data = {"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
        async with session.post(f"{BACKEND_URL}/auth/login", json=login_data) as response:
            if response.status != 200:
                print("❌ Login failed")
                return
            token = (await response.json())["access_token"]
            headers = {"Authorization": f"Bearer {token}"}
            print("✅ Logged in successfully")
        
        # Create a new test customer
        customer_data = {
            "username": f"debugcustomer_{int(datetime.now().timestamp())}",
            "email": f"debug_{int(datetime.now().timestamp())}@example.com",
            "phone": "+919876543210",
            "business_name": "Debug Test Business",
            "address": "123 Debug Street",
            "password": "debugpassword123",
            "role": "customer",
            "is_approved": True,
            "can_topup_wallet": True,
            "user_type": "owner"
        }
        
        async with session.post(f"{BACKEND_URL}/admin/users", json=customer_data, headers=headers) as response:
            if response.status != 200:
                error_text = await response.text()
                print(f"❌ Failed to create customer: {response.status} - {error_text}")
                return
            customer = await response.json()
            customer_id = customer["id"]
            print(f"✅ Created customer: {customer_id}")
        
        # Create a new standing order
        standing_order_data = {
            "customer_id": customer_id,
            "items": [
                {
                    "product_id": "debug_product_1",
                    "product_name": "Debug Bread",
                    "quantity": 5,
                    "price": 20.0
                }
            ],
            "recurrence_type": "weekly_days",
            "recurrence_config": {
                "days": [0, 2, 4]  # Monday, Wednesday, Friday
            },
            "duration_type": "indefinite",
            "notes": "Debug test standing order"
        }
        
        async with session.post(f"{BACKEND_URL}/admin/standing-orders", json=standing_order_data, headers=headers) as response:
            if response.status != 200:
                error_text = await response.text()
                print(f"❌ Failed to create standing order: {response.status} - {error_text}")
                return
            standing_order = await response.json()
            standing_order_id = standing_order["id"]
            print(f"✅ Created standing order: {standing_order_id}")
        
        # Wait for orders to be generated
        await asyncio.sleep(3)
        
        # Now update ONLY the items (no frequency change, no status change)
        update_data = {
            "items": [
                {
                    "product_id": "debug_product_1",
                    "product_name": "Debug Bread",
                    "quantity": 50,  # Changed from 5 to 50
                    "price": 20.0
                }
            ]
        }
        
        print(f"Updating standing order with: {json.dumps(update_data, indent=2)}")
        
        async with session.put(
            f"{BACKEND_URL}/admin/standing-orders/{standing_order_id}",
            json=update_data,
            headers=headers
        ) as response:
            if response.status != 200:
                error_text = await response.text()
                print(f"❌ Update failed: {response.status} - {error_text}")
                return
            
            updated_standing_order = await response.json()
            print("✅ Update successful")
            
            # Check debug_info in detail
            debug_info = updated_standing_order.get("debug_info", {})
            print(f"Debug info keys: {list(debug_info.keys())}")
            print(f"Full debug info: {json.dumps(debug_info, indent=2, default=str)}")
            
            # Check the specific fields we expect
            expected_fields = [
                "function_called",
                "items_changed", 
                "update_logic_executed",
                "orders_found",
                "orders_updated"
            ]
            
            for field in expected_fields:
                value = debug_info.get(field)
                print(f"  {field}: {value} (type: {type(value)})")
            
            # Check if the standing order items were updated
            updated_items = updated_standing_order.get("items", [])
            if updated_items and len(updated_items) > 0:
                new_quantity = updated_items[0].get("quantity")
                print(f"Standing order quantity updated to: {new_quantity}")
                if new_quantity == 50:
                    print("✅ Standing order items updated correctly")
                else:
                    print(f"❌ Standing order items not updated correctly (expected 50, got {new_quantity})")
            
            # Check generated orders
            async with session.get(
                f"{BACKEND_URL}/admin/standing-orders/{standing_order_id}/generated-orders",
                headers=headers
            ) as response:
                if response.status == 200:
                    generated_orders = await response.json()
                    print(f"✅ Found {len(generated_orders)} generated orders")
                    
                    # Check if any orders have the new quantity
                    updated_count = 0
                    for order in generated_orders:
                        order_items = order.get("items", [])
                        if order_items and len(order_items) > 0:
                            order_quantity = order_items[0].get("quantity")
                            if order_quantity == 50:
                                updated_count += 1
                    
                    print(f"Orders with updated quantity (50): {updated_count}/{len(generated_orders)}")
                    
                    if updated_count > 0:
                        print("✅ Some orders were updated with new quantities")
                    else:
                        print("❌ No orders were updated with new quantities")
                        # Show first few order quantities for debugging
                        for i, order in enumerate(generated_orders[:3]):
                            order_items = order.get("items", [])
                            if order_items:
                                qty = order_items[0].get("quantity", "N/A")
                                delivery_date = order.get("delivery_date", "N/A")
                                print(f"  Order {i+1}: quantity={qty}, delivery_date={delivery_date}")
                else:
                    print("❌ Failed to get generated orders")

if __name__ == "__main__":
    asyncio.run(test_condition_logic())