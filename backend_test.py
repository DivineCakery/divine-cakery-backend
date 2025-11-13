#!/usr/bin/env python3
"""
Backend Test Suite for Agent-Owner Linking Feature
Tests all CRUD operations for user management with user_type and linked_owner_id fields
"""

import requests
import json
import sys
from datetime import datetime
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "https://cakery-app.preview.emergentagent.com/api"
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"

class TestResults:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.errors = []
        
    def add_pass(self, test_name):
        self.passed += 1
        print(f"✅ {test_name}")
        
    def add_fail(self, test_name, error):
        self.failed += 1
        self.errors.append(f"{test_name}: {error}")
        print(f"❌ {test_name}: {error}")
        
    def summary(self):
        total = self.passed + self.failed
        print(f"\n📊 TEST SUMMARY:")
        print(f"Total Tests: {total}")
        print(f"Passed: {self.passed}")
        print(f"Failed: {self.failed}")
        if self.errors:
            print(f"\n🚨 FAILED TESTS:")
            for error in self.errors:
                print(f"  - {error}")
        return self.failed == 0

def get_admin_token():
    """Get admin authentication token"""
    try:
        response = requests.post(f"{API_BASE}/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        else:
            print(f"❌ Admin login failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"❌ Admin login error: {str(e)}")
        return None

def make_authenticated_request(method, endpoint, token, **kwargs):
    """Make authenticated API request"""
    headers = {"Authorization": f"Bearer {token}"}
    if "headers" in kwargs:
        kwargs["headers"].update(headers)
    else:
        kwargs["headers"] = headers
    
    url = f"{API_BASE}{endpoint}"
    return requests.request(method, url, **kwargs)

def test_preparation_list_filter():
    """Test the preparation list filter feature comprehensively"""
    results = TestResults()
    
    print("🧪 TESTING PREPARATION LIST FILTER FEATURE")
    print("=" * 60)
    
    # Get admin token
    token = get_admin_token()
    if not token:
        results.add_fail("Admin Authentication", "Could not get admin token")
        return results
    
    results.add_pass("Admin Authentication")
    
    # Test 1: Baseline Test - Check current state
    print("\n📋 Test 1: Baseline - Current Preparation List State")
    try:
        response = make_authenticated_request("GET", "/admin/reports/preparation-list", token)
        if response.status_code == 200:
            data = response.json()
            baseline_count = data.get("total_items", 0)
            baseline_items = data.get("items", [])
            
            print(f"   Current items in preparation list: {baseline_count}")
            
            # Verify response structure
            required_fields = ["date", "day_name", "total_items", "items"]
            for field in required_fields:
                if field not in data:
                    results.add_fail("Response Structure", f"Missing field: {field}")
                    return results
            
            # Verify each item has required fields
            item_fields = ["product_id", "product_name", "previous_closing_stock", "ordered_quantity", "balance", "units_to_prepare", "unit"]
            for i, item in enumerate(baseline_items):
                for field in item_fields:
                    if field not in item:
                        results.add_fail("Item Structure", f"Item {i} missing field: {field}")
                        return results
                
                # Critical test: Verify ordered_quantity > 0 for all items
                ordered_qty = item.get("ordered_quantity", 0)
                if ordered_qty <= 0:
                    results.add_fail("Filter Logic", f"Product {item.get('product_name')} has ordered_quantity={ordered_qty}, should be > 0")
                    return results
            
            results.add_pass("Baseline Test - Response Structure")
            results.add_pass("Baseline Test - Filter Logic (all items have orders)")
            
        else:
            results.add_fail("Baseline Test", f"HTTP {response.status_code}: {response.text}")
            return results
            
    except Exception as e:
        results.add_fail("Baseline Test", f"Exception: {str(e)}")
        return results
    
    # Test 2: Get all products to understand total count
    print("\n📦 Test 2: Get Total Product Count")
    try:
        response = requests.get(f"{API_BASE}/products")
        if response.status_code == 200:
            all_products = response.json()
            total_products = len(all_products)
            print(f"   Total products in database: {total_products}")
            print(f"   Products with orders: {baseline_count}")
            print(f"   Products filtered out (no orders): {total_products - baseline_count}")
            
            if baseline_count < total_products:
                results.add_pass("Filter Effectiveness - Products filtered out")
            else:
                print("   ⚠️  All products have orders - filter effectiveness cannot be verified")
                results.add_pass("Product Count Retrieved")
                
        else:
            results.add_fail("Product Count Test", f"HTTP {response.status_code}")
            return results
            
    except Exception as e:
        results.add_fail("Product Count Test", f"Exception: {str(e)}")
        return results
    
    # Test 3: Create test orders to verify filter works
    print("\n🛒 Test 3: Create Test Orders")
    
    # First, get some products to create orders with
    if len(all_products) >= 3:
        test_products = all_products[:3]  # Use first 3 products
        
        # Create a test customer first
        customer_data = {
            "username": f"testcustomer_{int(datetime.now().timestamp())}",
            "password": "testpass123",
            "email": "test@example.com",
            "phone": "9876543210",
            "business_name": "Test Business",
            "address": "Test Address",
            "can_topup_wallet": True
        }
        
        try:
            # Create customer via admin
            response = make_authenticated_request("POST", "/admin/users", token, json=customer_data)
            if response.status_code == 200:
                customer = response.json()
                customer_id = customer["id"]
                results.add_pass("Test Customer Creation")
                
                # Login as customer to get token
                customer_response = requests.post(f"{API_BASE}/auth/login", json={
                    "username": customer_data["username"],
                    "password": customer_data["password"]
                })
                
                if customer_response.status_code == 200:
                    customer_token = customer_response.json()["access_token"]
                    results.add_pass("Customer Authentication")
                    
                    # Add wallet balance for customer
                    balance_response = make_authenticated_request(
                        "POST", f"/admin/users/{customer_id}/add-wallet-balance?amount=1000.0", 
                        token
                    )
                    
                    if balance_response.status_code == 200:
                        results.add_pass("Customer Wallet Setup")
                        
                        # Create test orders with different products
                        orders_created = []
                        for i, product in enumerate(test_products):
                            order_data = {
                                "items": [{
                                    "product_id": product["id"],
                                    "product_name": product["name"],
                                    "quantity": i + 2,  # Different quantities: 2, 3, 4
                                    "price": product.get("price", 100),
                                    "subtotal": (i + 2) * product.get("price", 100)
                                }],
                                "subtotal": (i + 2) * product.get("price", 100),
                                "delivery_charge": 0,
                                "discount_amount": 0,
                                "total_amount": (i + 2) * product.get("price", 100),
                                "payment_method": "wallet",
                                "order_type": "regular",
                                "notes": f"Test order {i+1}"
                            }
                            
                            order_response = make_authenticated_request(
                                "POST", "/orders", customer_token, json=order_data
                            )
                            
                            if order_response.status_code == 200:
                                order = order_response.json()
                                orders_created.append(order)
                                print(f"   Created order for {product['name']} (qty: {i+2})")
                            else:
                                results.add_fail("Order Creation", f"Failed to create order {i+1}: {order_response.text}")
                                return results
                        
                        if len(orders_created) == 3:
                            results.add_pass("Test Orders Creation")
                        else:
                            results.add_fail("Test Orders Creation", f"Only created {len(orders_created)}/3 orders")
                            return results
                            
                    else:
                        results.add_fail("Customer Wallet Setup", f"HTTP {balance_response.status_code}")
                        return results
                else:
                    results.add_fail("Customer Authentication", f"HTTP {customer_response.status_code}")
                    return results
            else:
                results.add_fail("Test Customer Creation", f"HTTP {response.status_code}: {response.text}")
                return results
                
        except Exception as e:
            results.add_fail("Test Orders Setup", f"Exception: {str(e)}")
            return results
    else:
        results.add_fail("Test Orders Setup", "Not enough products in database")
        return results
    
    # Test 4: Verify updated preparation list
    print("\n📋 Test 4: Verify Updated Preparation List")
    try:
        response = make_authenticated_request("GET", "/admin/reports/preparation-list", token)
        if response.status_code == 200:
            data = response.json()
            updated_count = data.get("total_items", 0)
            updated_items = data.get("items", [])
            
            print(f"   Updated items in preparation list: {updated_count}")
            
            # Verify our test products are now included
            test_product_ids = [p["id"] for p in test_products]
            found_test_products = 0
            
            for item in updated_items:
                # Verify ordered_quantity > 0 for all items
                ordered_qty = item.get("ordered_quantity", 0)
                if ordered_qty <= 0:
                    results.add_fail("Updated Filter Logic", f"Product {item.get('product_name')} has ordered_quantity={ordered_qty}")
                    return results
                
                # Check if our test products are included
                if item.get("product_id") in test_product_ids:
                    found_test_products += 1
                    print(f"   ✓ Found test product: {item.get('product_name')} (ordered_qty: {ordered_qty})")
            
            if found_test_products >= 3:
                results.add_pass("Updated Filter Logic - Test products included")
            else:
                results.add_fail("Updated Filter Logic", f"Only found {found_test_products}/3 test products")
                return results
                
            results.add_pass("Updated Filter Logic - All items have orders")
            
        else:
            results.add_fail("Updated Preparation List", f"HTTP {response.status_code}")
            return results
            
    except Exception as e:
        results.add_fail("Updated Preparation List", f"Exception: {str(e)}")
        return results
    
    # Test 5: Test with specific date parameter
    print("\n📅 Test 5: Date Parameter Test")
    try:
        test_date = "2025-11-10"
        response = make_authenticated_request("GET", f"/admin/reports/preparation-list?date={test_date}", token)
        if response.status_code == 200:
            data = response.json()
            
            # Verify date is correctly set
            if data.get("date") == test_date:
                results.add_pass("Date Parameter - Correct date returned")
            else:
                results.add_fail("Date Parameter", f"Expected date {test_date}, got {data.get('date')}")
                return results
            
            # Verify day name is present
            if data.get("day_name"):
                results.add_pass("Date Parameter - Day name included")
            else:
                results.add_fail("Date Parameter", "Day name missing")
                return results
            
            # Verify filter still works with date parameter
            items = data.get("items", [])
            for item in items:
                ordered_qty = item.get("ordered_quantity", 0)
                if ordered_qty <= 0:
                    results.add_fail("Date Parameter Filter", f"Product {item.get('product_name')} has ordered_quantity={ordered_qty}")
                    return results
            
            results.add_pass("Date Parameter Filter - All items have orders")
            
        else:
            results.add_fail("Date Parameter Test", f"HTTP {response.status_code}")
            return results
            
    except Exception as e:
        results.add_fail("Date Parameter Test", f"Exception: {str(e)}")
        return results
    
    # Test 6: Edge Cases
    print("\n🔍 Test 6: Edge Cases")
    
    # Test invalid date format
    try:
        response = make_authenticated_request("GET", "/admin/reports/preparation-list?date=invalid-date", token)
        if response.status_code == 400:
            results.add_pass("Edge Case - Invalid date format rejected")
        else:
            results.add_fail("Edge Case", f"Invalid date should return 400, got {response.status_code}")
            
    except Exception as e:
        results.add_fail("Edge Case - Invalid date", f"Exception: {str(e)}")
    
    # Test unauthorized access
    try:
        response = requests.get(f"{API_BASE}/admin/reports/preparation-list")
        if response.status_code == 401:
            results.add_pass("Edge Case - Unauthorized access blocked")
        else:
            results.add_fail("Edge Case", f"Unauthorized access should return 401, got {response.status_code}")
            
    except Exception as e:
        results.add_fail("Edge Case - Unauthorized", f"Exception: {str(e)}")
    
    # Test 7: Verify total_items count matches items array length
    print("\n🔢 Test 7: Count Verification")
    try:
        response = make_authenticated_request("GET", "/admin/reports/preparation-list", token)
        if response.status_code == 200:
            data = response.json()
            total_items = data.get("total_items", 0)
            items_length = len(data.get("items", []))
            
            if total_items == items_length:
                results.add_pass("Count Verification - total_items matches items array length")
            else:
                results.add_fail("Count Verification", f"total_items={total_items} but items array length={items_length}")
                
        else:
            results.add_fail("Count Verification", f"HTTP {response.status_code}")
            
    except Exception as e:
        results.add_fail("Count Verification", f"Exception: {str(e)}")
    
    print("\n" + "=" * 60)
    return results

if __name__ == "__main__":
    print("🚀 DIVINE CAKERY BACKEND TESTING")
    print("Focus: Preparation List Filter Feature")
    print(f"Backend URL: {BACKEND_URL}")
    print("=" * 60)
    
    results = test_preparation_list_filter()
    
    success = results.summary()
    
    if success:
        print("\n🎉 ALL TESTS PASSED! Preparation list filter is working correctly.")
        sys.exit(0)
    else:
        print("\n💥 SOME TESTS FAILED! Check the errors above.")
        sys.exit(1)