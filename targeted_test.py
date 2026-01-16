#!/usr/bin/env python3
"""
Targeted test for standing order items update
"""

import requests
import json
from datetime import datetime

# Configuration
BACKEND_URL = "https://divine-cakery-backend.onrender.com/api"
ADMIN_CREDENTIALS = {
    "username": "testadmin",
    "password": "admin123"
}

def authenticate():
    """Get admin token"""
    response = requests.post(
        f"{BACKEND_URL}/auth/login",
        json=ADMIN_CREDENTIALS,
        timeout=30
    )
    
    if response.status_code == 200:
        token = response.json()["access_token"]
        print(f"✅ Authenticated successfully")
        return token
    else:
        print(f"❌ Authentication failed: {response.status_code}")
        return None

def test_items_update(token):
    """Test updating items specifically"""
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get standing orders
    response = requests.get(f"{BACKEND_URL}/admin/standing-orders", headers=headers, timeout=30)
    
    if response.status_code != 200:
        print(f"❌ Failed to get standing orders: {response.status_code}")
        return
    
    standing_orders = response.json()
    if not standing_orders:
        print("❌ No standing orders found")
        return
    
    # Find an active standing order
    active_so = None
    for so in standing_orders:
        if so.get("status") == "active":
            active_so = so
            break
    
    if not active_so:
        print("❌ No active standing orders found")
        return
    
    so_id = active_so["id"]
    original_items = active_so.get("items", [])
    
    print(f"🔍 Testing standing order: {so_id}")
    print(f"   Customer: {active_so.get('customer_name')}")
    print(f"   Original items: {len(original_items)}")
    
    for i, item in enumerate(original_items):
        print(f"     Item {i+1}: {item.get('product_name')} - Qty: {item.get('quantity')}")
    
    # Create updated items with different quantities
    updated_items = []
    for i, item in enumerate(original_items):
        new_quantity = item.get("quantity", 1) + 10  # Add 10 to each quantity
        updated_items.append({
            "product_id": item.get("product_id"),
            "product_name": item.get("product_name"),
            "quantity": new_quantity,
            "price": item.get("price", 100)
        })
    
    print(f"\n📝 Updating items with new quantities:")
    for i, item in enumerate(updated_items):
        print(f"     Item {i+1}: {item.get('product_name')} - New Qty: {item.get('quantity')}")
    
    # Update the standing order with new items
    update_data = {"items": updated_items}
    
    response = requests.put(
        f"{BACKEND_URL}/admin/standing-orders/{so_id}",
        json=update_data,
        headers=headers,
        timeout=30
    )
    
    if response.status_code == 200:
        updated_so = response.json()
        print(f"\n✅ Standing order updated successfully")
        print(f"   Debug Info: {updated_so.get('debug_info', 'None')}")
        
        # Check if items were updated
        new_items = updated_so.get("items", [])
        print(f"   Updated items count: {len(new_items)}")
        
        for i, item in enumerate(new_items):
            print(f"     Item {i+1}: {item.get('product_name')} - Final Qty: {item.get('quantity')}")
        
        # Get generated orders to check propagation
        response = requests.get(
            f"{BACKEND_URL}/admin/standing-orders/{so_id}/generated-orders",
            headers=headers,
            timeout=30
        )
        
        if response.status_code == 200:
            orders = response.json()
            print(f"\n📋 Generated orders: {len(orders)}")
            
            # Check future orders
            today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            future_orders = []
            
            for order in orders:
                delivery_date_str = order.get("delivery_date")
                if delivery_date_str:
                    if isinstance(delivery_date_str, str):
                        delivery_date = datetime.fromisoformat(delivery_date_str.replace('Z', '+00:00'))
                    else:
                        delivery_date = delivery_date_str
                    
                    if delivery_date.replace(tzinfo=None) >= today:
                        future_orders.append(order)
            
            print(f"   Future orders: {len(future_orders)}")
            
            for i, order in enumerate(future_orders[:3]):  # Show first 3
                order_items = order.get("items", [])
                quantities = [item.get("quantity") for item in order_items]
                print(f"     Order {i+1} ({order.get('delivery_date', 'Unknown date')}): Quantities {quantities}")
        
        return so_id
    else:
        print(f"❌ Failed to update standing order: {response.status_code} - {response.text}")
        return None

def main():
    print("🎯 TARGETED STANDING ORDER ITEMS UPDATE TEST")
    print("=" * 60)
    
    # Authenticate
    token = authenticate()
    if not token:
        return
    
    # Test items update
    test_items_update(token)

if __name__ == "__main__":
    main()