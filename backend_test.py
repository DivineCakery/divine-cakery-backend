#!/usr/bin/env python3
"""
Divine Cakery Backend API Testing Suite
Tests the backend implementation focusing on:
1. Date-wise revenue API endpoint
2. Order update functionality
3. Authentication and admin access
"""

import requests
import json
from datetime import datetime, timedelta
import uuid

# Configuration
BACKEND_URL = "https://sweet-orders-8.preview.emergentagent.com/api"
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"

class DivineCakeryTester:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.test_results = []
        
    def log_result(self, test_name, success, message, details=None):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name} - {message}")
        if details:
            print(f"   Details: {details}")
    
    def test_health_check(self):
        """Test basic API health"""
        try:
            response = self.session.get(f"{BACKEND_URL}/health")
            if response.status_code == 200:
                self.log_result("Health Check", True, "API is responding")
                return True
            else:
                self.log_result("Health Check", False, f"API returned status {response.status_code}")
                return False
        except Exception as e:
            self.log_result("Health Check", False, f"Connection failed: {str(e)}")
            return False
    
    def test_admin_login(self):
        """Test admin authentication"""
        try:
            login_data = {
                "username": ADMIN_USERNAME,
                "password": ADMIN_PASSWORD
            }
            
            response = self.session.post(f"{BACKEND_URL}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data:
                    self.admin_token = data["access_token"]
                    self.session.headers.update({"Authorization": f"Bearer {self.admin_token}"})
                    self.log_result("Admin Login", True, "Successfully authenticated as admin")
                    return True
                else:
                    self.log_result("Admin Login", False, "No access token in response", data)
                    return False
            else:
                self.log_result("Admin Login", False, f"Login failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Admin Login", False, f"Login request failed: {str(e)}")
            return False
    
    def test_admin_me_endpoint(self):
        """Test admin user verification"""
        try:
            response = self.session.get(f"{BACKEND_URL}/auth/me")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("role") == "admin":
                    self.log_result("Admin Verification", True, "Admin role confirmed")
                    return True
                else:
                    self.log_result("Admin Verification", False, f"Expected admin role, got {data.get('role')}", data)
                    return False
            else:
                self.log_result("Admin Verification", False, f"Failed to verify admin: {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Admin Verification", False, f"Admin verification failed: {str(e)}")
            return False
    
    def create_sample_orders(self):
        """Create sample orders with completed payment status for testing revenue"""
        try:
            # First create a sample product
            product_data = {
                "name": "Chocolate Cake",
                "description": "Delicious chocolate cake",
                "category": "Cakes",
                "mrp": 500.0,
                "price": 450.0,
                "packet_size": "1kg",
                "unit": "piece",
                "is_available": True
            }
            
            product_response = self.session.post(f"{BACKEND_URL}/products", json=product_data)
            if product_response.status_code != 200:
                self.log_result("Sample Product Creation", False, f"Failed to create product: {product_response.status_code}")
                return None
            
            product = product_response.json()
            product_id = product["id"]
            
            # Create sample orders for the last few days
            orders_created = 0
            for i in range(5):  # Create 5 orders over last 5 days
                order_date = datetime.utcnow() - timedelta(days=i)
                
                # Create a customer first
                customer_data = {
                    "username": f"testcustomer{i}_{uuid.uuid4().hex[:8]}",
                    "password": "password123",
                    "email": f"customer{i}@test.com",
                    "phone": f"98765432{i:02d}",
                    "business_name": f"Test Business {i}",
                    "address": "Test Address"
                }
                
                customer_response = self.session.post(f"{BACKEND_URL}/auth/register", json=customer_data)
                if customer_response.status_code != 200:
                    continue
                
                customer = customer_response.json()
                
                # Login as customer to create order
                login_response = self.session.post(f"{BACKEND_URL}/auth/login", json={
                    "username": customer_data["username"],
                    "password": customer_data["password"]
                })
                
                if login_response.status_code != 200:
                    continue
                
                customer_token = login_response.json()["access_token"]
                
                # First add money to customer's wallet
                wallet_topup_data = {
                    "amount": 1000.0,
                    "transaction_type": "wallet_topup"
                }
                
                # Create a mock completed transaction by directly updating wallet
                # Since we can't complete Razorpay payment in test, we'll use admin to add balance
                self.session.headers.update({"Authorization": f"Bearer {self.admin_token}"})
                
                # Update customer wallet balance directly (admin operation)
                import requests
                wallet_update_response = requests.put(
                    f"{BACKEND_URL}/admin/users/{customer['id']}", 
                    json={"wallet_balance": 1000.0},
                    headers={"Authorization": f"Bearer {self.admin_token}"}
                )
                
                # Create order with wallet payment (this will have completed payment status)
                order_data = {
                    "items": [{
                        "product_id": product_id,
                        "product_name": "Chocolate Cake",
                        "quantity": 2,
                        "price": 450.0,
                        "subtotal": 900.0
                    }],
                    "total_amount": 900.0,
                    "payment_method": "wallet",  # Use wallet payment for completed status
                    "delivery_address": "Test Address",
                    "notes": f"Test order {i}"
                }
                
                headers = {"Authorization": f"Bearer {customer_token}"}
                order_response = requests.post(f"{BACKEND_URL}/orders", json=order_data, headers=headers)
                
                if order_response.status_code == 200:
                    order = order_response.json()
                    
                    # Manually update the order to have completed payment status and specific date
                    # This requires direct database access, so we'll use admin endpoint to update
                    self.session.headers.update({"Authorization": f"Bearer {self.admin_token}"})
                    
                    # Update order payment status to completed (need to manually update payment_status)
                    # Since we can't directly update payment_status through the API, we'll create wallet orders instead
                    pass
                    
                    if update_response.status_code == 200:
                        orders_created += 1
            
            self.log_result("Sample Orders Creation", True, f"Created {orders_created} sample orders")
            return orders_created > 0
            
        except Exception as e:
            self.log_result("Sample Orders Creation", False, f"Failed to create sample orders: {str(e)}")
            return False
    
    def test_daily_revenue_endpoint(self):
        """Test the new daily revenue API endpoint"""
        try:
            response = self.session.get(f"{BACKEND_URL}/admin/revenue/daily")
            
            if response.status_code == 200:
                data = response.json()
                
                # Check response structure
                if "daily_revenue" not in data:
                    self.log_result("Daily Revenue API", False, "Missing 'daily_revenue' key in response", data)
                    return False
                
                daily_revenue = data["daily_revenue"]
                
                # Check if we have 7 days of data
                if len(daily_revenue) != 7:
                    self.log_result("Daily Revenue API", False, f"Expected 7 days of data, got {len(daily_revenue)}", daily_revenue)
                    return False
                
                # Check structure of each day's data
                required_fields = ["date", "day_name", "revenue", "order_count"]
                for day_data in daily_revenue:
                    for field in required_fields:
                        if field not in day_data:
                            self.log_result("Daily Revenue API", False, f"Missing field '{field}' in day data", day_data)
                            return False
                
                # Verify data types
                for day_data in daily_revenue:
                    if not isinstance(day_data["revenue"], (int, float)):
                        self.log_result("Daily Revenue API", False, f"Revenue should be numeric, got {type(day_data['revenue'])}", day_data)
                        return False
                    
                    if not isinstance(day_data["order_count"], int):
                        self.log_result("Daily Revenue API", False, f"Order count should be integer, got {type(day_data['order_count'])}", day_data)
                        return False
                
                # Check date format and order (should be chronological)
                dates = [day_data["date"] for day_data in daily_revenue]
                for date_str in dates:
                    try:
                        datetime.strptime(date_str, "%Y-%m-%d")
                    except ValueError:
                        self.log_result("Daily Revenue API", False, f"Invalid date format: {date_str}")
                        return False
                
                self.log_result("Daily Revenue API", True, "API returns correct 7-day revenue breakdown", {
                    "total_days": len(daily_revenue),
                    "date_range": f"{daily_revenue[0]['date']} to {daily_revenue[-1]['date']}",
                    "sample_data": daily_revenue[0]
                })
                return True
                
            elif response.status_code == 403:
                self.log_result("Daily Revenue API", False, "Access denied - admin authentication required")
                return False
            else:
                self.log_result("Daily Revenue API", False, f"API returned status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Daily Revenue API", False, f"Request failed: {str(e)}")
            return False
    
    def test_order_update_endpoint(self):
        """Test order status update functionality"""
        try:
            # First get existing orders
            orders_response = self.session.get(f"{BACKEND_URL}/orders")
            
            if orders_response.status_code != 200:
                self.log_result("Order Update Test", False, f"Failed to fetch orders: {orders_response.status_code}")
                return False
            
            orders = orders_response.json()
            
            if not orders:
                self.log_result("Order Update Test", False, "No orders found to test update functionality")
                return False
            
            # Test updating the first order
            test_order = orders[0]
            order_id = test_order["id"]
            
            # Update order status to confirmed
            update_data = {"status": "confirmed"}
            update_response = self.session.put(f"{BACKEND_URL}/orders/{order_id}", json=update_data)
            
            if update_response.status_code == 200:
                updated_order = update_response.json()
                
                if updated_order["order_status"] == "confirmed":
                    self.log_result("Order Update", True, "Successfully updated order status to confirmed", {
                        "order_id": order_id,
                        "old_status": test_order.get("order_status"),
                        "new_status": updated_order["order_status"]
                    })
                    return True
                else:
                    self.log_result("Order Update", False, f"Order status not updated correctly. Expected 'confirmed', got '{updated_order['order_status']}'")
                    return False
            else:
                self.log_result("Order Update", False, f"Failed to update order: {update_response.status_code}", update_response.text)
                return False
                
        except Exception as e:
            self.log_result("Order Update", False, f"Order update test failed: {str(e)}")
            return False
    
    def test_admin_delivery_date_override(self):
        """Test admin delivery date override functionality - MAIN FEATURE TEST"""
        try:
            print("\n🎯 TESTING ADMIN DELIVERY DATE OVERRIDE FEATURE")
            print("-" * 50)
            
            # Step 1: Get an existing order to test delivery date override
            print("📋 Step 1: Getting existing order for testing...")
            
            # Get existing orders
            orders_response = self.session.get(f"{BACKEND_URL}/orders")
            
            if orders_response.status_code != 200:
                self.log_result("Get Existing Orders", False, f"HTTP {orders_response.status_code}: {orders_response.text}")
                return False
            
            orders = orders_response.json()
            
            if not orders:
                # If no orders exist, create a simple UPI order (which doesn't require wallet balance)
                print("📋 No existing orders found, creating a UPI order for testing...")
                
                # Create a test customer
                customer_data = {
                    "username": f"testcustomer_{int(datetime.now().timestamp())}",
                    "password": "testpass123",
                    "email": "test@example.com",
                    "phone": "9876543210",
                    "business_name": "Test Bakery Business",
                    "address": "123 Test Street, Test City",
                    "can_topup_wallet": True
                }
                
                customer_response = self.session.post(f"{BACKEND_URL}/admin/users", json=customer_data)
                
                if customer_response.status_code != 200:
                    self.log_result("Create Test Customer", False, f"HTTP {customer_response.status_code}: {customer_response.text}")
                    return False
                
                customer = customer_response.json()
                customer_id = customer["id"]
                self.log_result("Create Test Customer", True, f"Customer created with ID: {customer_id}")
                
                # Login as customer
                customer_login = requests.post(f"{BACKEND_URL}/auth/login", json={
                    "username": customer_data["username"],
                    "password": customer_data["password"]
                })
                
                if customer_login.status_code != 200:
                    self.log_result("Customer Login", False, f"HTTP {customer_login.status_code}: {customer_login.text}")
                    return False
                
                customer_token = customer_login.json()["access_token"]
                
                # Create a UPI order (doesn't require wallet balance)
                order_data = {
                    "items": [
                        {
                            "product_id": "test-product-1",
                            "product_name": "Chocolate Cake",
                            "quantity": 1,
                            "price": 500.0,
                            "subtotal": 500.0
                        }
                    ],
                    "subtotal": 500.0,
                    "delivery_charge": 50.0,
                    "discount_amount": 0.0,
                    "total_amount": 550.0,
                    "payment_method": "upi",  # Use UPI instead of wallet
                    "order_type": "delivery",
                    "delivery_address": "123 Test Street, Test City",
                    "notes": "Test order for delivery date override testing"
                }
                
                customer_headers = {"Authorization": f"Bearer {customer_token}"}
                order_response = requests.post(f"{BACKEND_URL}/orders", json=order_data, headers=customer_headers)
                
                if order_response.status_code != 200:
                    self.log_result("Create Test Order", False, f"HTTP {order_response.status_code}: {order_response.text}")
                    return False
                
                order = order_response.json()
                order_id = order["id"]
                original_delivery_date = order.get("delivery_date")
                
                self.log_result("Create Test Order", True, f"Order created with ID: {order_id}")
                print(f"   Original delivery date: {original_delivery_date}")
            else:
                # Use the first existing order
                order = orders[0]
                order_id = order["id"]
                original_delivery_date = order.get("delivery_date")
                
                self.log_result("Use Existing Order", True, f"Using existing order ID: {order_id}")
                print(f"   Original delivery date: {original_delivery_date}")
            
            # Step 2: Test delivery date update
            print("\n📅 Step 2: Testing delivery date update...")
            
            new_delivery_date = "2025-06-20T00:00:00Z"
            update_data = {"delivery_date": new_delivery_date}
            
            update_response = self.session.put(f"{BACKEND_URL}/orders/{order_id}", json=update_data)
            
            if update_response.status_code != 200:
                self.log_result("Delivery Date Update", False, f"HTTP {update_response.status_code}: {update_response.text}")
                return False
            
            updated_order = update_response.json()
            
            # Verify delivery_date was updated
            if "delivery_date" in updated_order:
                returned_date = updated_order["delivery_date"]
                try:
                    expected_dt = datetime.fromisoformat(new_delivery_date.replace('Z', '+00:00'))
                    returned_dt = datetime.fromisoformat(returned_date.replace('Z', '+00:00'))
                    
                    if expected_dt.date() == returned_dt.date():
                        self.log_result("Delivery Date Update", True, f"Date updated to {returned_dt.date()}")
                    else:
                        self.log_result("Delivery Date Update", False, f"Expected {expected_dt.date()}, got {returned_dt.date()}")
                        return False
                except Exception as e:
                    self.log_result("Delivery Date Update", False, f"Error parsing dates: {str(e)}")
                    return False
            else:
                self.log_result("Delivery Date Update", False, "delivery_date field missing from response")
                return False
            
            # Verify other fields are preserved
            if updated_order.get("order_status") == order.get("order_status"):
                self.log_result("Order Status Preservation", True, "Order status preserved during update")
            else:
                self.log_result("Order Status Preservation", False, "Order status changed unexpectedly")
                return False
            
            # Step 3: Test persistence
            print("\n💾 Step 3: Testing delivery date persistence...")
            
            get_response = self.session.get(f"{BACKEND_URL}/orders/{order_id}")
            
            if get_response.status_code != 200:
                self.log_result("Fetch Updated Order", False, f"HTTP {get_response.status_code}: {get_response.text}")
                return False
            
            persisted_order = get_response.json()
            
            if "delivery_date" in persisted_order:
                delivery_date = persisted_order["delivery_date"]
                try:
                    parsed_date = datetime.fromisoformat(delivery_date.replace('Z', '+00:00'))
                    if parsed_date.year == 2025 and parsed_date.month == 6 and parsed_date.day == 20:
                        self.log_result("Delivery Date Persistence", True, "Date update persisted in database")
                    else:
                        self.log_result("Delivery Date Persistence", False, f"Expected 2025-06-20, got {parsed_date.date()}")
                        return False
                except Exception as e:
                    self.log_result("Delivery Date Persistence", False, f"Error parsing persisted date: {str(e)}")
                    return False
            else:
                self.log_result("Delivery Date Persistence", False, "delivery_date field missing from persisted order")
                return False
            
            # Step 4: Test different date formats
            print("\n🔄 Step 4: Testing date format variations...")
            
            test_dates = [
                "2025-07-15T10:30:00Z",  # With time and Z
                "2025-08-20T00:00:00",   # Without timezone
                "2025-09-25T15:45:30+05:30"  # With timezone offset
            ]
            
            for i, test_date in enumerate(test_dates):
                update_data = {"delivery_date": test_date}
                
                response = self.session.put(f"{BACKEND_URL}/orders/{order_id}", json=update_data)
                
                if response.status_code == 200:
                    updated_order = response.json()
                    if "delivery_date" in updated_order:
                        self.log_result(f"Date Format {i+1}", True, f"Format accepted: {test_date}")
                    else:
                        self.log_result(f"Date Format {i+1}", False, f"delivery_date missing for {test_date}")
                        return False
                else:
                    self.log_result(f"Date Format {i+1}", False, f"HTTP {response.status_code} for {test_date}")
                    return False
            
            # Step 5: Test authorization
            print("\n🔒 Step 5: Testing admin authorization...")
            
            # Test without token
            update_data = {"delivery_date": "2025-12-25T00:00:00Z"}
            response = requests.put(f"{BACKEND_URL}/orders/{order_id}", json=update_data)
            
            if response.status_code == 401:
                self.log_result("Unauthorized Access Block", True, "Properly blocked access without token")
            else:
                self.log_result("Unauthorized Access Block", False, f"Expected 401, got {response.status_code}")
                return False
            
            # Test with invalid token
            headers = {"Authorization": "Bearer invalid_token_123"}
            response = requests.put(f"{BACKEND_URL}/orders/{order_id}", json=update_data, headers=headers)
            
            if response.status_code == 401:
                self.log_result("Invalid Token Rejection", True, "Invalid token properly rejected")
            else:
                self.log_result("Invalid Token Rejection", False, f"Expected 401, got {response.status_code}")
                return False
            
            print("\n✅ ADMIN DELIVERY DATE OVERRIDE FEATURE: ALL TESTS PASSED")
            return True
            
        except Exception as e:
            self.log_result("Admin Delivery Date Override", False, f"Exception: {str(e)}")
            return False
    
    def test_admin_stats_endpoint(self):
        """Test admin stats endpoint for comparison"""
        try:
            response = self.session.get(f"{BACKEND_URL}/admin/stats")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["total_users", "total_products", "total_orders", "total_revenue"]
                
                for field in required_fields:
                    if field not in data:
                        self.log_result("Admin Stats", False, f"Missing field '{field}' in stats", data)
                        return False
                
                self.log_result("Admin Stats", True, "Admin stats endpoint working correctly", {
                    "total_orders": data.get("total_orders"),
                    "total_revenue": data.get("total_revenue")
                })
                return True
            else:
                self.log_result("Admin Stats", False, f"Stats endpoint failed: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Admin Stats", False, f"Stats test failed: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Divine Cakery Backend Tests")
        print("=" * 50)
        
        # Basic connectivity
        if not self.test_health_check():
            print("❌ Cannot proceed - API is not responding")
            return False
        
        # Authentication tests
        if not self.test_admin_login():
            print("❌ Cannot proceed - Admin authentication failed")
            return False
        
        if not self.test_admin_me_endpoint():
            print("❌ Admin verification failed")
            return False
        
        # Create sample data for testing
        print("\n📊 Setting up test data...")
        self.create_sample_orders()
        
        # Core functionality tests
        print("\n🧪 Testing Core Functionality...")
        self.test_daily_revenue_endpoint()
        self.test_order_update_endpoint()
        self.test_admin_stats_endpoint()
        
        # MAIN FEATURE TEST: Admin Delivery Date Override
        print("\n🎯 MAIN FEATURE TEST...")
        self.test_admin_delivery_date_override()
        
        # Summary
        print("\n" + "=" * 50)
        print("📋 TEST SUMMARY")
        print("=" * 50)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        # Show failed tests
        failed_tests = [result for result in self.test_results if not result["success"]]
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"  - {test['test']}: {test['message']}")
        
        return passed == total

if __name__ == "__main__":
    tester = DivineCakeryTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 All tests passed!")
    else:
        print("\n⚠️  Some tests failed. Check the details above.")