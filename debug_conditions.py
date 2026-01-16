#!/usr/bin/env python3
"""
Debug the condition logic in standing order update
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

def debug_condition_logic(token):
    """Debug the condition logic"""
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
    print(f"   Status: {active_so.get('status')}")
    print(f"   Original items: {len(original_items)}")
    
    # Create updated items with different quantities
    updated_items = []
    for i, item in enumerate(original_items):
        new_quantity = item.get("quantity", 1) + 5  # Add 5 to each quantity
        updated_items.append({
            "product_id": item.get("product_id"),
            "product_name": item.get("product_name"),
            "quantity": new_quantity,
            "price": item.get("price", 100)
        })
    
    print(f"\n📝 Updating ONLY items (no status change):")
    
    # Update ONLY items (no status field)
    update_data = {"items": updated_items}
    
    response = requests.put(
        f"{BACKEND_URL}/admin/standing-orders/{so_id}",
        json=update_data,
        headers=headers,
        timeout=30
    )
    
    if response.status_code == 200:
        updated_so = response.json()
        debug_info = updated_so.get("debug_info", {})
        
        print(f"\n✅ Standing order updated successfully")
        print(f"📊 Debug Info Analysis:")
        print(f"   Raw debug_info: {debug_info}")
        
        if debug_info:
            condition_check = debug_info.get("condition_check", {})
            print(f"   items_changed: {condition_check.get('items_changed')}")
            print(f"   not_frequency_changed: {condition_check.get('not_frequency_changed')}")
            print(f"   not_cancelled: {condition_check.get('not_cancelled')}")
            print(f"   should_execute: {condition_check.get('should_execute')}")
            
            update_logic_executed = debug_info.get("update_logic_executed")
            print(f"   update_logic_executed: {update_logic_executed}")
            
            if update_logic_executed == "items_change":
                print(f"   orders_found: {debug_info.get('orders_found')}")
                print(f"   orders_updated: {debug_info.get('orders_updated')}")
            elif update_logic_executed == "error":
                print(f"   error: {debug_info.get('error')}")
        else:
            print("   ❌ No debug info found!")
        
        return so_id
    else:
        print(f"❌ Failed to update standing order: {response.status_code} - {response.text}")
        return None

def main():
    print("🐛 DEBUG CONDITION LOGIC IN STANDING ORDER UPDATE")
    print("=" * 60)
    
    # Authenticate
    token = authenticate()
    if not token:
        return
    
    # Debug condition logic
    debug_condition_logic(token)

if __name__ == "__main__":
    main()