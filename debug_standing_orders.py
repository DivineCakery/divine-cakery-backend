#!/usr/bin/env python3
"""
Debug test for standing order update issue
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

def test_standing_order_endpoint(token):
    """Test if standing order endpoints are working"""
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test GET standing orders
    response = requests.get(f"{BACKEND_URL}/admin/standing-orders", headers=headers, timeout=30)
    
    if response.status_code == 200:
        standing_orders = response.json()
        print(f"✅ GET standing orders works - found {len(standing_orders)} orders")
        
        if standing_orders:
            # Test GET specific standing order
            so_id = standing_orders[0]["id"]
            response = requests.get(f"{BACKEND_URL}/admin/standing-orders/{so_id}", headers=headers, timeout=30)
            
            if response.status_code == 200:
                so = response.json()
                print(f"✅ GET specific standing order works")
                print(f"   Standing Order ID: {so_id}")
                print(f"   Customer: {so.get('customer_name')}")
                print(f"   Items: {len(so.get('items', []))}")
                print(f"   Debug Info: {so.get('debug_info', 'None')}")
                
                # Test UPDATE standing order
                update_data = {"notes": f"Test update at {datetime.now().isoformat()}"}
                response = requests.put(
                    f"{BACKEND_URL}/admin/standing-orders/{so_id}",
                    json=update_data,
                    headers=headers,
                    timeout=30
                )
                
                if response.status_code == 200:
                    updated_so = response.json()
                    print(f"✅ PUT standing order works")
                    print(f"   Updated notes: {updated_so.get('notes')}")
                    print(f"   Debug Info after update: {updated_so.get('debug_info', 'None')}")
                    return so_id
                else:
                    print(f"❌ PUT standing order failed: {response.status_code} - {response.text}")
            else:
                print(f"❌ GET specific standing order failed: {response.status_code}")
        else:
            print("ℹ️ No standing orders found to test")
    else:
        print(f"❌ GET standing orders failed: {response.status_code} - {response.text}")
    
    return None

def main():
    print("🔍 DEBUGGING STANDING ORDER ENDPOINTS")
    print("=" * 50)
    
    # Authenticate
    token = authenticate()
    if not token:
        return
    
    # Test endpoints
    test_standing_order_endpoint(token)

if __name__ == "__main__":
    main()