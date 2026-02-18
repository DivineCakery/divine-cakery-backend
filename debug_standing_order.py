#!/usr/bin/env python3
"""
Simple test to debug the standing order update issue
"""

import asyncio
import aiohttp
import json
from datetime import datetime

BACKEND_URL = "https://reports-timezone-bug.preview.emergentagent.com/api"
ADMIN_USERNAME = "testadmin"
ADMIN_PASSWORD = "admin123"

async def test_standing_order_debug():
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
        
        # Get existing standing orders
        async with session.get(f"{BACKEND_URL}/admin/standing-orders", headers=headers) as response:
            if response.status != 200:
                print("❌ Failed to get standing orders")
                return
            standing_orders = await response.json()
            print(f"✅ Found {len(standing_orders)} standing orders")
            
            if not standing_orders:
                print("❌ No standing orders found to test")
                return
            
            # Use the first standing order
            standing_order = standing_orders[0]
            standing_order_id = standing_order["id"]
            print(f"✅ Testing with standing order ID: {standing_order_id}")
            
            # Print current items
            current_items = standing_order.get("items", [])
            print(f"Current items: {json.dumps(current_items, indent=2)}")
            
            # Update with modified quantities
            new_items = []
            for item in current_items:
                new_item = item.copy()
                new_item["quantity"] = item["quantity"] + 100  # Add 100 to make it obvious
                new_items.append(new_item)
            
            print(f"New items: {json.dumps(new_items, indent=2)}")
            
            # Update the standing order
            update_data = {"items": new_items}
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
                
                # Check debug_info
                debug_info = updated_standing_order.get("debug_info", {})
                print(f"Debug info: {json.dumps(debug_info, indent=2)}")
                
                # Check if items were actually updated
                updated_items = updated_standing_order.get("items", [])
                print(f"Updated items in response: {json.dumps(updated_items, indent=2)}")
                
                # Get generated orders to check propagation
                async with session.get(
                    f"{BACKEND_URL}/admin/standing-orders/{standing_order_id}/generated-orders",
                    headers=headers
                ) as response:
                    if response.status == 200:
                        generated_orders = await response.json()
                        print(f"✅ Found {len(generated_orders)} generated orders")
                        
                        # Check first few orders
                        for i, order in enumerate(generated_orders[:3]):
                            order_items = order.get("items", [])
                            quantities = [item.get("quantity", 0) for item in order_items]
                            print(f"Order {i+1} quantities: {quantities}")
                    else:
                        print("❌ Failed to get generated orders")

if __name__ == "__main__":
    asyncio.run(test_standing_order_debug())