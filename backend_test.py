#!/usr/bin/env python3
"""
Backend Testing Script for Delivery Date Display Fix
Tests the delivery date conversion to noon-UTC format for all app versions
"""

import requests
import json
import sys
from datetime import datetime, timedelta
import pytz

# Configuration
BACKEND_URL = "https://doughtype-admin.preview.emergentagent.com/api"

# Test credentials
ADMIN_CREDENTIALS = {
    "username": "admin",
    "password": "admin123"
}

CUSTOMER_CREDENTIALS = {
    "username": "testcustomer",
    "password": "password123"
}

class DeliveryDateTester:
    def __init__(self):
        self.admin_token = None
        self.customer_token = None
        self.test_results = []
        
    def log_result(self, test_name, success, message, details=None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            "test": test_name,
            "status": status,
            "message": message,
            "details": details or {}
        }
        self.test_results.append(result)
        print(f"{status}: {test_name} - {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def authenticate_admin(self):
        """Authenticate as admin"""
        try:
            response = requests.post(
                f"{BACKEND_URL}/auth/login",
                json=ADMIN_CREDENTIALS,
                timeout=10
            )
            
            if response.status_code == 200:
                self.admin_token = response.json()["access_token"]
                self.log_result("Admin Authentication", True, "Successfully authenticated as admin")
                return True
            else:
                self.log_result("Admin Authentication", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Admin Authentication", False, f"Exception: {str(e)}")
            return False
    
    def authenticate_customer(self):
        """Authenticate as customer"""
        try:
            response = requests.post(
                f"{BACKEND_URL}/auth/login",
                json=CUSTOMER_CREDENTIALS,
                timeout=10
            )
            
            if response.status_code == 200:
                self.customer_token = response.json()["access_token"]
                self.log_result("Customer Authentication", True, "Successfully authenticated as customer")
                return True
            else:
                # Try to create customer if login fails
                return self.create_test_customer()
                
        except Exception as e:
            self.log_result("Customer Authentication", False, f"Exception: {str(e)}")
            return False
    
    def create_test_customer(self):
        """Create test customer if doesn't exist"""
        try:
            customer_data = {
                "username": "testcustomer",
                "password": "password123",
                "email": "test@example.com",
                "phone": "+919876543210",
                "business_name": "Test Business",
                "address": "Test Address",
                "can_topup_wallet": True
            }
            
            response = requests.post(
                f"{BACKEND_URL}/auth/register",
                json=customer_data,
                timeout=10
            )
            
            if response.status_code == 200:
                # Approve the customer using admin token
                if self.admin_token:
                    user_id = response.json()["id"]
                    approve_response = requests.put(
                        f"{BACKEND_URL}/admin/users/{user_id}",
                        json={"is_approved": True},
                        headers={"Authorization": f"Bearer {self.admin_token}"},
                        timeout=10
                    )
                    
                    if approve_response.status_code == 200:
                        # Now try to login
                        login_response = requests.post(
                            f"{BACKEND_URL}/auth/login",
                            json=CUSTOMER_CREDENTIALS,
                            timeout=10
                        )
                        
                        if login_response.status_code == 200:
                            self.customer_token = login_response.json()["access_token"]
                            self.log_result("Customer Creation & Authentication", True, "Created and authenticated test customer")
                            return True
                
                self.log_result("Customer Creation", False, "Failed to approve customer")
                return False
            else:
                self.log_result("Customer Creation", False, f"Failed with status {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Customer Creation", False, f"Exception: {str(e)}")
            return False
    
    def test_delivery_date_endpoint(self):
        """Test GET /api/delivery-date endpoint (Public)"""
        try:
            response = requests.get(f"{BACKEND_URL}/delivery-date", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check required fields
                required_fields = [
                    "delivery_date", "delivery_date_formatted", "day_name", 
                    "is_same_day", "order_cutoff_message", "current_time_ist"
                ]
                
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_result(
                        "Delivery Date Endpoint - Fields", 
                        False, 
                        f"Missing fields: {missing_fields}",
                        data
                    )
                    return False
                
                # Validate date format (YYYY-MM-DD)
                try:
                    datetime.strptime(data["delivery_date"], "%Y-%m-%d")
                    date_format_valid = True
                except ValueError:
                    date_format_valid = False
                
                if not date_format_valid:
                    self.log_result(
                        "Delivery Date Endpoint - Date Format", 
                        False, 
                        f"Invalid date format: {data['delivery_date']}",
                        data
                    )
                    return False
                
                # Validate IST timezone logic
                ist = pytz.timezone('Asia/Kolkata')
                now_ist = datetime.now(ist)
                current_hour = now_ist.hour
                
                expected_is_same_day = current_hour < 4
                actual_is_same_day = data["is_same_day"]
                
                if expected_is_same_day != actual_is_same_day:
                    self.log_result(
                        "Delivery Date Endpoint - IST Logic", 
                        False, 
                        f"IST logic mismatch. Hour: {current_hour}, Expected same_day: {expected_is_same_day}, Got: {actual_is_same_day}",
                        data
                    )
                    return False
                
                self.log_result(
                    "Delivery Date Endpoint", 
                    True, 
                    f"All fields present and valid. IST time: {data['current_time_ist']}, Same day: {data['is_same_day']}"
                )
                return True
                
            else:
                self.log_result(
                    "Delivery Date Endpoint", 
                    False, 
                    f"Failed with status {response.status_code}",
                    response.text
                )
                return False
                
        except Exception as e:
            self.log_result("Delivery Date Endpoint", False, f"Exception: {str(e)}")
            return False
    
    def create_test_order(self):
        """Create a test order to verify delivery date conversion"""
        if not self.customer_token:
            return None
            
        try:
            # First get some products
            products_response = requests.get(f"{BACKEND_URL}/products", timeout=10)
            if products_response.status_code != 200:
                self.log_result("Get Products for Order", False, "Failed to fetch products")
                return None
            
            products = products_response.json()
            if not products:
                self.log_result("Get Products for Order", False, "No products available")
                return None
            
            # Create order with first available product
            product = products[0]
            order_data = {
                "items": [
                    {
                        "product_id": product["id"],
                        "product_name": product["name"],
                        "quantity": 2,
                        "price": product["price"],
                        "unit": product.get("unit", "piece")
                    }
                ],
                "total_amount": product["price"] * 2,
                "delivery_address": "Test Address for Delivery Date Testing",
                "notes": "Test order for delivery date conversion testing"
            }
            
            response = requests.post(
                f"{BACKEND_URL}/orders",
                json=order_data,
                headers={"Authorization": f"Bearer {self.customer_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                order = response.json()
                self.log_result("Create Test Order", True, f"Created order {order['order_number']}")
                return order["id"]
            else:
                self.log_result("Create Test Order", False, f"Failed with status {response.status_code}", response.text)
                return None
                
        except Exception as e:
            self.log_result("Create Test Order", False, f"Exception: {str(e)}")
            return None
    
    def test_orders_endpoint_delivery_date_conversion(self):
        """Test GET /api/orders endpoint for delivery date conversion"""
        if not self.customer_token:
            self.log_result("Orders Endpoint Test", False, "No customer token available")
            return False
        
        # Create a test order first
        order_id = self.create_test_order()
        if not order_id:
            self.log_result("Orders Endpoint Test", False, "Failed to create test order")
            return False
        
        try:
            # Fetch orders
            response = requests.get(
                f"{BACKEND_URL}/orders",
                headers={"Authorization": f"Bearer {self.customer_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                orders = response.json()
                
                if not orders:
                    self.log_result("Orders Endpoint Test", False, "No orders returned")
                    return False
                
                # Find our test order
                test_order = None
                for order in orders:
                    if order.get("id") == order_id:
                        test_order = order
                        break
                
                if not test_order:
                    self.log_result("Orders Endpoint Test", False, "Test order not found in response")
                    return False
                
                # Verify delivery date conversion
                success = self.verify_delivery_date_conversion(test_order, "Orders Endpoint")
                return success
                
            else:
                self.log_result("Orders Endpoint Test", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Orders Endpoint Test", False, f"Exception: {str(e)}")
            return False
    
    def verify_delivery_date_conversion(self, order, test_context):
        """Verify that delivery date is converted to noon-UTC format"""
        try:
            # Check required fields
            required_fields = ["delivery_date", "delivery_date_ist", "delivery_date_formatted"]
            missing_fields = [field for field in required_fields if field not in order]
            
            if missing_fields:
                self.log_result(
                    f"{test_context} - Required Fields", 
                    False, 
                    f"Missing fields: {missing_fields}",
                    order
                )
                return False
            
            delivery_date = order["delivery_date"]
            delivery_date_ist = order["delivery_date_ist"]
            delivery_date_formatted = order["delivery_date_formatted"]
            
            # Verify delivery_date is in noon-UTC format (ends with T12:00:00.000Z)
            if not delivery_date.endswith("T12:00:00.000Z"):
                self.log_result(
                    f"{test_context} - Noon UTC Format", 
                    False, 
                    f"delivery_date not in noon-UTC format: {delivery_date}",
                    {"expected_suffix": "T12:00:00.000Z", "actual": delivery_date}
                )
                return False
            
            # Verify delivery_date_ist is in YYYY-MM-DD format
            try:
                datetime.strptime(delivery_date_ist, "%Y-%m-%d")
            except ValueError:
                self.log_result(
                    f"{test_context} - IST Date Format", 
                    False, 
                    f"delivery_date_ist not in YYYY-MM-DD format: {delivery_date_ist}"
                )
                return False
            
            # Verify the date portion matches between delivery_date and delivery_date_ist
            delivery_date_portion = delivery_date.split("T")[0]
            if delivery_date_portion != delivery_date_ist:
                self.log_result(
                    f"{test_context} - Date Consistency", 
                    False, 
                    f"Date mismatch: delivery_date={delivery_date_portion}, delivery_date_ist={delivery_date_ist}"
                )
                return False
            
            # Verify delivery_date_formatted is human readable
            if not delivery_date_formatted or len(delivery_date_formatted) < 10:
                self.log_result(
                    f"{test_context} - Formatted Date", 
                    False, 
                    f"delivery_date_formatted seems invalid: {delivery_date_formatted}"
                )
                return False
            
            # Test that old apps would show correct date
            # Simulate what old apps do: new Date(delivery_date).toLocaleDateString()
            try:
                # Parse the noon-UTC datetime
                dt = datetime.fromisoformat(delivery_date.replace("Z", "+00:00"))
                
                # Convert to various timezones to verify it shows same date
                timezones_to_test = [
                    ("UTC", pytz.UTC),
                    ("US/Eastern", pytz.timezone("US/Eastern")),
                    ("Europe/London", pytz.timezone("Europe/London")),
                    ("Asia/Tokyo", pytz.timezone("Asia/Tokyo")),
                    ("Australia/Sydney", pytz.timezone("Australia/Sydney")),
                    ("Asia/Kolkata", pytz.timezone("Asia/Kolkata"))
                ]
                
                expected_date = delivery_date_ist
                date_consistency_issues = []
                
                for tz_name, tz in timezones_to_test:
                    local_dt = dt.astimezone(tz)
                    local_date = local_dt.strftime("%Y-%m-%d")
                    
                    if local_date != expected_date:
                        date_consistency_issues.append(f"{tz_name}: {local_date}")
                
                if date_consistency_issues:
                    self.log_result(
                        f"{test_context} - Timezone Consistency", 
                        False, 
                        f"Date inconsistency across timezones: {date_consistency_issues}",
                        {"expected": expected_date, "delivery_date": delivery_date}
                    )
                    return False
                
                self.log_result(
                    f"{test_context} - Delivery Date Conversion", 
                    True, 
                    f"All conversion checks passed. IST date: {delivery_date_ist}, Noon-UTC: {delivery_date}"
                )
                return True
                
            except Exception as e:
                self.log_result(
                    f"{test_context} - Date Parsing", 
                    False, 
                    f"Failed to parse delivery_date: {str(e)}",
                    {"delivery_date": delivery_date}
                )
                return False
                
        except Exception as e:
            self.log_result(f"{test_context} - Verification", False, f"Exception: {str(e)}")
            return False
    
    def test_delivery_date_calculation_logic(self):
        """Test the delivery date calculation logic for different times"""
        try:
            # Get current delivery date info
            response = requests.get(f"{BACKEND_URL}/delivery-date", timeout=10)
            
            if response.status_code != 200:
                self.log_result("Delivery Date Logic Test", False, "Failed to get delivery date info")
                return False
            
            data = response.json()
            current_time_ist = data["current_time_ist"]
            is_same_day = data["is_same_day"]
            delivery_date = data["delivery_date"]
            
            # Parse current IST time
            ist_dt = datetime.strptime(current_time_ist, "%Y-%m-%d %H:%M:%S")
            current_hour = ist_dt.hour
            
            # Verify logic: before 4 AM = same day, after 4 AM = next day
            expected_same_day = current_hour < 4
            
            if expected_same_day != is_same_day:
                self.log_result(
                    "Delivery Date Logic Test", 
                    False, 
                    f"Logic mismatch. Hour: {current_hour}, Expected same_day: {expected_same_day}, Got: {is_same_day}"
                )
                return False
            
            # Verify delivery date is correct based on logic
            today = ist_dt.date()
            tomorrow = today + timedelta(days=1)
            
            expected_delivery_date = today.strftime("%Y-%m-%d") if expected_same_day else tomorrow.strftime("%Y-%m-%d")
            
            if delivery_date != expected_delivery_date:
                self.log_result(
                    "Delivery Date Logic Test", 
                    False, 
                    f"Date mismatch. Expected: {expected_delivery_date}, Got: {delivery_date}"
                )
                return False
            
            self.log_result(
                "Delivery Date Logic Test", 
                True, 
                f"Logic correct. IST hour: {current_hour}, Same day: {is_same_day}, Delivery: {delivery_date}"
            )
            return True
            
        except Exception as e:
            self.log_result("Delivery Date Logic Test", False, f"Exception: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all delivery date tests"""
        print("🚀 Starting Delivery Date Display Fix Testing...")
        print("=" * 60)
        
        # Authentication tests
        if not self.authenticate_admin():
            print("❌ Cannot proceed without admin authentication")
            return False
        
        if not self.authenticate_customer():
            print("⚠️ Customer authentication failed, some tests may be skipped")
        
        # Core delivery date tests
        test_methods = [
            self.test_delivery_date_endpoint,
            self.test_delivery_date_calculation_logic,
            self.test_orders_endpoint_delivery_date_conversion
        ]
        
        passed_tests = 0
        total_tests = len(test_methods)
        
        for test_method in test_methods:
            try:
                if test_method():
                    passed_tests += 1
            except Exception as e:
                print(f"❌ Test {test_method.__name__} failed with exception: {str(e)}")
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 DELIVERY DATE DISPLAY FIX TEST SUMMARY")
        print("=" * 60)
        
        for result in self.test_results:
            print(f"{result['status']}: {result['test']}")
            if result['status'] == "❌ FAIL":
                print(f"   └─ {result['message']}")
        
        print(f"\n🎯 Overall Result: {passed_tests}/{total_tests} tests passed")
        
        if passed_tests == total_tests:
            print("🎉 ALL TESTS PASSED! Delivery date display fix is working correctly.")
            return True
        else:
            print(f"⚠️ {total_tests - passed_tests} test(s) failed. Review the issues above.")
            return False

def main():
    """Main test execution"""
    tester = DeliveryDateTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n✅ DELIVERY DATE DISPLAY FIX: FULLY FUNCTIONAL")
        sys.exit(0)
    else:
        print("\n❌ DELIVERY DATE DISPLAY FIX: ISSUES FOUND")
        sys.exit(1)

if __name__ == "__main__":
    main()