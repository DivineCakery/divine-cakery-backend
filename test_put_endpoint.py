#!/usr/bin/env python3
"""
Test if the PUT endpoint is actually being called
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

def test_put_endpoint():
    """Test if PUT endpoint is working"""
    
    # Authenticate
    response = requests.post(
        f"{BACKEND_URL}/auth/login",
        json=ADMIN_CREDENTIALS,
        timeout=30
    )
    
    if response.status_code != 200:
        print(f"❌ Authentication failed: {response.status_code}")
        return
    
    token = response.json()["access_token"]
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
    
    so_id = standing_orders[0]["id"]
    print(f"🔍 Testing PUT endpoint for standing order: {so_id}")
    
    # Test with a simple update that should trigger debug info
    update_data = {
        "notes": f"Debug test at {datetime.now().isoformat()}"
    }
    
    print(f"📝 Sending PUT request to: {BACKEND_URL}/admin/standing-orders/{so_id}")
    print(f"📝 Update data: {update_data}")
    
    response = requests.put(
        f"{BACKEND_URL}/admin/standing-orders/{so_id}",
        json=update_data,
        headers=headers,
        timeout=30
    )
    
    print(f"📊 Response status: {response.status_code}")
    print(f"📊 Response headers: {dict(response.headers)}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ PUT request successful")
        print(f"📊 Response keys: {list(result.keys())}")
        print(f"📊 Debug info: {result.get('debug_info', 'None')}")
        print(f"📊 Notes: {result.get('notes', 'None')}")
    else:
        print(f"❌ PUT request failed")
        print(f"📊 Response text: {response.text}")

if __name__ == "__main__":
    test_put_endpoint()