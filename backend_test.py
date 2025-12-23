#!/usr/bin/env python3
"""
Backend Testing Script for Divine Cakery API
Focus: Delivery Date Calculation - IST Timezone Fix
"""

import requests
import json
from datetime import datetime, timedelta
import pytz
import sys
import os

# Configuration
BACKEND_URL = "https://fresh-fix-portal.preview.emergentagent.com/api"
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"

class BackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.test_results = []
        
    def log_test(self, test_name, success, details=""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details
        })
    
    def get_admin_token(self):
        """Get admin authentication token"""
        try:
            response = self.session.post(f"{BACKEND_URL}/auth/login", json={
                "username": ADMIN_USERNAME,
                "password": ADMIN_PASSWORD
            })
            
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data["access_token"]
                self.session.headers.update({"Authorization": f"Bearer {self.admin_token}"})
                self.log_test("Admin Authentication", True, f"Token obtained successfully")
                return True
            else:
                self.log_test("Admin Authentication", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Admin Authentication", False, f"Exception: {str(e)}")
            return False
    
    def test_delivery_date_endpoint_public_access(self):
        """Test 1: Verify GET /api/delivery-date endpoint is publicly accessible"""
        try:
            # Test without authentication
            response = requests.get(f"{BACKEND_URL}/delivery-date")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = [
                    "delivery_date", "delivery_date_formatted", "day_name", 
                    "is_same_day", "order_cutoff_message", "current_time_ist"
                ]
                
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    self.log_test("Public Access - Delivery Date Endpoint", True, 
                                f"All required fields present: {list(data.keys())}")
                    return data
                else:
                    self.log_test("Public Access - Delivery Date Endpoint", False, 
                                f"Missing fields: {missing_fields}")
                    return None
            else:
                self.log_test("Public Access - Delivery Date Endpoint", False, 
                            f"Status: {response.status_code}, Response: {response.text}")
                return None
        except Exception as e:
            self.log_test("Public Access - Delivery Date Endpoint", False, f"Exception: {str(e)}")
            return None
    
    def test_delivery_date_response_format(self, delivery_data):
        """Test 2: Verify response format and data types"""
        try:
            # Check delivery_date format (YYYY-MM-DD)
            delivery_date = delivery_data.get("delivery_date")
            try:
                datetime.strptime(delivery_date, "%Y-%m-%d")
                date_format_valid = True
            except:
                date_format_valid = False
            
            # Check if delivery_date_formatted is a readable string
            formatted_date = delivery_data.get("delivery_date_formatted", "")
            formatted_valid = len(formatted_date) > 10 and "," in formatted_date
            
            # Check day_name is a valid day
            day_name = delivery_data.get("day_name", "")
            valid_days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
            day_valid = day_name in valid_days
            
            # Check is_same_day is boolean
            is_same_day = delivery_data.get("is_same_day")
            boolean_valid = isinstance(is_same_day, bool)
            
            # Check current_time_ist format
            current_time = delivery_data.get("current_time_ist", "")
            try:
                datetime.strptime(current_time, "%Y-%m-%d %H:%M:%S")
                time_format_valid = True
            except:
                time_format_valid = False
            
            all_valid = all([date_format_valid, formatted_valid, day_valid, boolean_valid, time_format_valid])
            
            details = f"Date format: {date_format_valid}, Formatted: {formatted_valid}, Day: {day_valid}, Boolean: {boolean_valid}, Time format: {time_format_valid}"
            self.log_test("Response Format Validation", all_valid, details)
            
            return all_valid
        except Exception as e:
            self.log_test("Response Format Validation", False, f"Exception: {str(e)}")
            return False
    
    def test_delivery_date_logic(self, delivery_data):
        """Test 3: Verify delivery date logic based on IST time"""
        try:
            # Parse current IST time from response
            current_time_str = delivery_data.get("current_time_ist")
            current_time = datetime.strptime(current_time_str, "%Y-%m-%d %H:%M:%S")
            
            # Get current hour in IST
            current_hour = current_time.hour
            is_same_day = delivery_data.get("is_same_day")
            
            # Verify logic: Before 4 AM IST = same day, At/After 4 AM IST = next day
            expected_same_day = current_hour < 4
            logic_correct = (is_same_day == expected_same_day)
            
            # Parse delivery date
            delivery_date_str = delivery_data.get("delivery_date")
            delivery_date = datetime.strptime(delivery_date_str, "%Y-%m-%d").date()
            current_date = current_time.date()
            
            # Verify actual delivery date matches logic
            if expected_same_day:
                date_correct = delivery_date == current_date
            else:
                expected_delivery_date = current_date + timedelta(days=1)
                date_correct = delivery_date == expected_delivery_date
            
            overall_correct = logic_correct and date_correct
            
            details = f"Current hour IST: {current_hour}, Expected same day: {expected_same_day}, Got same day: {is_same_day}, Date correct: {date_correct}"
            self.log_test("Delivery Date Logic Verification", overall_correct, details)
            
            return overall_correct
        except Exception as e:
            self.log_test("Delivery Date Logic Verification", False, f"Exception: {str(e)}")
            return False
    
    def test_order_cutoff_message(self, delivery_data):
        """Test 4: Verify order cutoff message is appropriate"""
        try:
            message = delivery_data.get("order_cutoff_message", "")
            is_same_day = delivery_data.get("is_same_day")
            
            # Check message content based on delivery type
            if is_same_day:
                message_appropriate = "same day" in message.lower()
            else:
                message_appropriate = ("next day" in message.lower() or "4 am" in message.lower())
            
            message_not_empty = len(message) > 10
            
            overall_valid = message_appropriate and message_not_empty
            
            details = f"Message: '{message}', Same day: {is_same_day}, Appropriate: {message_appropriate}"
            self.log_test("Order Cutoff Message Validation", overall_valid, details)
            
            return overall_valid
        except Exception as e:
            self.log_test("Order Cutoff Message Validation", False, f"Exception: {str(e)}")
            return False
    
    def test_order_creation_with_delivery_date(self):
        """Test 5: Verify order creation uses correct delivery date calculation"""
        if not self.admin_token:
            self.log_test("Order Creation Delivery Date Test", False, "No admin token available")
            return False
        
        try:
            # First, get a customer to create order for
            customers_response = self.session.get(f"{BACKEND_URL}/admin/users")
            if customers_response.status_code != 200:
                self.log_test("Order Creation Delivery Date Test", False, "Failed to get customers")
                return False
            
            customers = customers_response.json()
            customer_users = [u for u in customers if u.get("role") == "customer"]
            
            if not customer_users:
                self.log_test("Order Creation Delivery Date Test", False, "No customer users found")
                return False
            
            customer = customer_users[0]
            
            # Get products to create order
            products_response = requests.get(f"{BACKEND_URL}/products")
            if products_response.status_code != 200:
                self.log_test("Order Creation Delivery Date Test", False, "Failed to get products")
                return False
            
            products = products_response.json()
            if not products:
                self.log_test("Order Creation Delivery Date Test", False, "No products found")
                return False
            
            # Create a test order
            test_order = {
                "customer_id": customer["id"],
                "items": [
                    {
                        "product_id": products[0]["id"],
                        "quantity": 2,
                        "price": products[0]["price"]
                    }
                ],
                "total_amount": products[0]["price"] * 2,
                "delivery_address": "Test Address for Delivery Date Verification"
            }
            
            # Create order
            order_response = self.session.post(f"{BACKEND_URL}/orders", json=test_order)
            
            if order_response.status_code == 201:
                order_data = order_response.json()
                order_delivery_date = order_data.get("delivery_date")
                
                # Get current delivery date from endpoint
                delivery_info = requests.get(f"{BACKEND_URL}/delivery-date").json()
                expected_delivery_date = delivery_info.get("delivery_date")
                
                # Compare dates (convert to date objects for comparison)
                if order_delivery_date and expected_delivery_date:
                    order_date = datetime.fromisoformat(order_delivery_date.replace('Z', '+00:00')).date()
                    expected_date = datetime.strptime(expected_delivery_date, "%Y-%m-%d").date()
                    
                    dates_match = order_date == expected_date
                    
                    details = f"Order delivery date: {order_date}, Expected: {expected_date}, Match: {dates_match}"
                    self.log_test("Order Creation Delivery Date Test", dates_match, details)
                    
                    # Clean up - delete test order
                    try:
                        self.session.delete(f"{BACKEND_URL}/orders/{order_data['id']}")
                    except:
                        pass  # Ignore cleanup errors
                    
                    return dates_match
                else:
                    self.log_test("Order Creation Delivery Date Test", False, "Missing delivery date in order or endpoint response")
                    return False
            else:
                self.log_test("Order Creation Delivery Date Test", False, 
                            f"Order creation failed: {order_response.status_code} - {order_response.text}")
                return False
                
        except Exception as e:
            self.log_test("Order Creation Delivery Date Test", False, f"Exception: {str(e)}")
            return False
    
    def test_endpoint_consistency(self):
        """Test 6: Verify endpoint returns consistent results across multiple calls"""
        try:
            results = []
            for i in range(3):
                response = requests.get(f"{BACKEND_URL}/delivery-date")
                if response.status_code == 200:
                    data = response.json()
                    results.append({
                        "delivery_date": data.get("delivery_date"),
                        "is_same_day": data.get("is_same_day"),
                        "day_name": data.get("day_name")
                    })
                else:
                    self.log_test("Endpoint Consistency Test", False, f"Call {i+1} failed with status {response.status_code}")
                    return False
            
            # Check if all results are identical (they should be within the same minute)
            first_result = results[0]
            all_consistent = all(r["delivery_date"] == first_result["delivery_date"] and 
                               r["is_same_day"] == first_result["is_same_day"] and
                               r["day_name"] == first_result["day_name"] for r in results)
            
            details = f"All 3 calls returned consistent results: {all_consistent}"
            self.log_test("Endpoint Consistency Test", all_consistent, details)
            
            return all_consistent
        except Exception as e:
            self.log_test("Endpoint Consistency Test", False, f"Exception: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all delivery date tests"""
        print("🚀 Starting Delivery Date Calculation - IST Timezone Fix Tests")
        print("=" * 70)
        
        # Get admin token for authenticated tests
        if not self.get_admin_token():
            print("❌ Cannot proceed without admin authentication")
            return False
        
        # Test 1: Public endpoint access
        delivery_data = self.test_delivery_date_endpoint_public_access()
        if not delivery_data:
            print("❌ Cannot proceed without valid delivery date response")
            return False
        
        # Test 2: Response format validation
        self.test_delivery_date_response_format(delivery_data)
        
        # Test 3: Delivery date logic verification
        self.test_delivery_date_logic(delivery_data)
        
        # Test 4: Order cutoff message validation
        self.test_order_cutoff_message(delivery_data)
        
        # Test 5: Order creation with delivery date
        self.test_order_creation_with_delivery_date()
        
        # Test 6: Endpoint consistency
        self.test_endpoint_consistency()
        
        # Summary
        print("\n" + "=" * 70)
        print("📊 TEST SUMMARY")
        print("=" * 70)
        
        passed_tests = sum(1 for result in self.test_results if result["success"])
        total_tests = len(self.test_results)
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {total_tests - passed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        # Show failed tests
        failed_tests = [result for result in self.test_results if not result["success"]]
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"   • {test['test']}: {test['details']}")
        
        return passed_tests == total_tests

if __name__ == "__main__":
    tester = BackendTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 All tests passed! Delivery Date Calculation feature is working correctly.")
        sys.exit(0)
    else:
        print("\n⚠️  Some tests failed. Please check the details above.")
        sys.exit(1)