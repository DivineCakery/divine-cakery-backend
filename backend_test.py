#!/usr/bin/env python3
"""
Backend API Testing Script for Divine Cakery
Testing the "Edit Standing Order" feature - PUT /api/admin/standing-orders/{standing_order_id}
"""

import requests
import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "https://divine-cakery-backend.onrender.com/api"
ADMIN_USERNAME = "testadmin"
ADMIN_PASSWORD = "admin123"

class BackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.test_customer_id = None
        self.test_standing_order_id = None
        
    def log(self, message: str, level: str = "INFO"):
        """Log test messages with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
        
    def login_admin(self) -> bool:
        """Login as admin and get authentication token"""
        try:
            self.log("🔐 Logging in as admin...")
            
            login_data = {
                "username": ADMIN_USERNAME,
                "password": ADMIN_PASSWORD
            }
            
            response = self.session.post(
                f"{BASE_URL}/auth/login",
                json=login_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                token_data = response.json()
                self.admin_token = token_data["access_token"]
                self.session.headers.update({
                    "Authorization": f"Bearer {self.admin_token}"
                })
                self.log("✅ Admin login successful")
                return True
            else:
                self.log(f"❌ Admin login failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Admin login error: {str(e)}", "ERROR")
            return False
    
    def get_test_customer(self) -> Optional[str]:
        """Get or create a test customer for standing orders"""
        try:
            self.log("👤 Getting test customer...")
            
            # Get all users to find a customer
            response = self.session.get(f"{BASE_URL}/admin/users")
            
            if response.status_code == 200:
                users = response.json()
                # Find a customer (non-admin user)
                customers = [u for u in users if u.get("role") == "customer"]
                
                if customers:
                    customer = customers[0]
                    self.test_customer_id = customer["id"]
                    self.log(f"✅ Using existing customer: {customer.get('username', 'Unknown')} (ID: {self.test_customer_id})")
                    return self.test_customer_id
                else:
                    self.log("❌ No customers found in database", "ERROR")
                    return None
            else:
                self.log(f"❌ Failed to get users: {response.status_code} - {response.text}", "ERROR")
                return None
                
        except Exception as e:
            self.log(f"❌ Error getting test customer: {str(e)}", "ERROR")
            return None
    
    def create_test_standing_order(self) -> Optional[str]:
        """Create a test standing order for editing"""
        try:
            self.log("📝 Creating test standing order...")
            
            standing_order_data = {
                "customer_id": self.test_customer_id,
                "items": [
                    {
                        "product_id": str(uuid.uuid4()),
                        "product_name": "Test Bread",
                        "quantity": 5,
                        "price": 25.0
                    },
                    {
                        "product_id": str(uuid.uuid4()),
                        "product_name": "Test Rolls",
                        "quantity": 10,
                        "price": 15.0
                    }
                ],
                "recurrence_type": "weekly_days",
                "recurrence_config": {
                    "days": [0, 2, 4]  # Monday, Wednesday, Friday
                },
                "duration_type": "indefinite",
                "notes": "Original test standing order for editing"
            }
            
            response = self.session.post(
                f"{BASE_URL}/admin/standing-orders",
                json=standing_order_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                created_order = response.json()
                self.test_standing_order_id = created_order["id"]
                self.log(f"✅ Test standing order created: {self.test_standing_order_id}")
                return self.test_standing_order_id
            else:
                self.log(f"❌ Failed to create test standing order: {response.status_code} - {response.text}", "ERROR")
                return None
                
        except Exception as e:
            self.log(f"❌ Error creating test standing order: {str(e)}", "ERROR")
            return None
    
    def get_standing_orders(self) -> Optional[list]:
        """Get list of standing orders to find one for testing"""
        try:
            self.log("📋 Getting existing standing orders...")
            
            response = self.session.get(f"{BASE_URL}/admin/standing-orders")
            
            if response.status_code == 200:
                orders = response.json()
                self.log(f"✅ Found {len(orders)} standing orders")
                return orders
            else:
                self.log(f"❌ Failed to get standing orders: {response.status_code} - {response.text}", "ERROR")
                return None
                
        except Exception as e:
            self.log(f"❌ Error getting standing orders: {str(e)}", "ERROR")
            return None
    
    def test_authentication_required(self) -> bool:
        """Test 1: Verify endpoint requires admin authentication"""
        try:
            self.log("🔒 Test 1: Authentication Required")
            
            # Remove auth header temporarily
            original_headers = self.session.headers.copy()
            if "Authorization" in self.session.headers:
                del self.session.headers["Authorization"]
            
            # Try to update without authentication
            update_data = {"notes": "Should fail without auth"}
            
            response = self.session.put(
                f"{BASE_URL}/admin/standing-orders/test-id",
                json=update_data,
                headers={"Content-Type": "application/json"}
            )
            
            # Restore headers
            self.session.headers = original_headers
            
            if response.status_code == 401:
                self.log("✅ Test 1 PASSED: Endpoint correctly requires authentication (401)")
                return True
            else:
                self.log(f"❌ Test 1 FAILED: Expected 401, got {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Test 1 ERROR: {str(e)}", "ERROR")
            return False
    
    def test_update_products(self) -> bool:
        """Test 2: Update products (items array)"""
        try:
            self.log("🛒 Test 2: Update Products")
            
            update_data = {
                "items": [
                    {
                        "product_id": str(uuid.uuid4()),
                        "product_name": "Updated Bread Loaf",
                        "quantity": 8,
                        "price": 30.0
                    },
                    {
                        "product_id": str(uuid.uuid4()),
                        "product_name": "Updated Dinner Rolls",
                        "quantity": 12,
                        "price": 18.0
                    },
                    {
                        "product_id": str(uuid.uuid4()),
                        "product_name": "New Croissants",
                        "quantity": 6,
                        "price": 45.0
                    }
                ]
            }
            
            response = self.session.put(
                f"{BASE_URL}/admin/standing-orders/{self.test_standing_order_id}",
                json=update_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                updated_order = response.json()
                updated_items = updated_order.get("items", [])
                
                if len(updated_items) == 3 and updated_items[0]["product_name"] == "Updated Bread Loaf":
                    self.log("✅ Test 2 PASSED: Products updated successfully")
                    return True
                else:
                    self.log(f"❌ Test 2 FAILED: Items not updated correctly. Got: {updated_items}", "ERROR")
                    return False
            else:
                self.log(f"❌ Test 2 FAILED: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Test 2 ERROR: {str(e)}", "ERROR")
            return False
    
    def test_update_recurrence_type(self) -> bool:
        """Test 3: Update recurrence type from weekly_days to interval"""
        try:
            self.log("🔄 Test 3: Update Recurrence Type")
            
            update_data = {
                "recurrence_type": "interval",
                "recurrence_config": {
                    "days": 3  # Every 3 days
                }
            }
            
            response = self.session.put(
                f"{BASE_URL}/admin/standing-orders/{self.test_standing_order_id}",
                json=update_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                updated_order = response.json()
                
                if (updated_order.get("recurrence_type") == "interval" and 
                    updated_order.get("recurrence_config", {}).get("days") == 3):
                    self.log("✅ Test 3 PASSED: Recurrence type updated to interval")
                    return True
                else:
                    self.log(f"❌ Test 3 FAILED: Recurrence not updated correctly. Got: {updated_order.get('recurrence_type')}, {updated_order.get('recurrence_config')}", "ERROR")
                    return False
            else:
                self.log(f"❌ Test 3 FAILED: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Test 3 ERROR: {str(e)}", "ERROR")
            return False
    
    def test_update_recurrence_config(self) -> bool:
        """Test 4: Update recurrence config back to weekly_days"""
        try:
            self.log("📅 Test 4: Update Recurrence Config")
            
            update_data = {
                "recurrence_type": "weekly_days",
                "recurrence_config": {
                    "days": [1, 3, 5]  # Tuesday, Thursday, Saturday
                }
            }
            
            response = self.session.put(
                f"{BASE_URL}/admin/standing-orders/{self.test_standing_order_id}",
                json=update_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                updated_order = response.json()
                expected_days = [1, 3, 5]
                actual_days = updated_order.get("recurrence_config", {}).get("days", [])
                
                if (updated_order.get("recurrence_type") == "weekly_days" and 
                    actual_days == expected_days):
                    self.log("✅ Test 4 PASSED: Recurrence config updated to weekly_days with new schedule")
                    return True
                else:
                    self.log(f"❌ Test 4 FAILED: Config not updated correctly. Expected days: {expected_days}, Got: {actual_days}", "ERROR")
                    return False
            else:
                self.log(f"❌ Test 4 FAILED: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Test 4 ERROR: {str(e)}", "ERROR")
            return False
    
    def test_update_duration_type(self) -> bool:
        """Test 5: Update duration type from indefinite to end_date"""
        try:
            self.log("⏰ Test 5: Update Duration Type")
            
            # Set end date to 30 days from now
            end_date = (datetime.utcnow() + timedelta(days=30)).isoformat()
            
            update_data = {
                "duration_type": "end_date",
                "end_date": end_date
            }
            
            response = self.session.put(
                f"{BASE_URL}/admin/standing-orders/{self.test_standing_order_id}",
                json=update_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                updated_order = response.json()
                
                if (updated_order.get("duration_type") == "end_date" and 
                    updated_order.get("end_date") is not None):
                    self.log("✅ Test 5 PASSED: Duration type updated to end_date with end date set")
                    return True
                else:
                    self.log(f"❌ Test 5 FAILED: Duration not updated correctly. Got: {updated_order.get('duration_type')}, end_date: {updated_order.get('end_date')}", "ERROR")
                    return False
            else:
                self.log(f"❌ Test 5 FAILED: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Test 5 ERROR: {str(e)}", "ERROR")
            return False
    
    def test_update_end_date(self) -> bool:
        """Test 6: Update end date to a different date"""
        try:
            self.log("📆 Test 6: Update End Date")
            
            # Set end date to 60 days from now
            new_end_date = (datetime.utcnow() + timedelta(days=60)).isoformat()
            
            update_data = {
                "end_date": new_end_date
            }
            
            response = self.session.put(
                f"{BASE_URL}/admin/standing-orders/{self.test_standing_order_id}",
                json=update_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                updated_order = response.json()
                updated_end_date = updated_order.get("end_date")
                
                if updated_end_date and new_end_date[:10] in updated_end_date:  # Check date part
                    self.log("✅ Test 6 PASSED: End date updated successfully")
                    return True
                else:
                    self.log(f"❌ Test 6 FAILED: End date not updated correctly. Expected: {new_end_date[:10]}, Got: {updated_end_date}", "ERROR")
                    return False
            else:
                self.log(f"❌ Test 6 FAILED: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Test 6 ERROR: {str(e)}", "ERROR")
            return False
    
    def test_update_notes(self) -> bool:
        """Test 7: Update notes field"""
        try:
            self.log("📝 Test 7: Update Notes")
            
            update_data = {
                "notes": "Updated notes: This standing order has been modified during testing. Special delivery instructions included."
            }
            
            response = self.session.put(
                f"{BASE_URL}/admin/standing-orders/{self.test_standing_order_id}",
                json=update_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                updated_order = response.json()
                updated_notes = updated_order.get("notes", "")
                
                if "Updated notes: This standing order has been modified" in updated_notes:
                    self.log("✅ Test 7 PASSED: Notes updated successfully")
                    return True
                else:
                    self.log(f"❌ Test 7 FAILED: Notes not updated correctly. Got: {updated_notes}", "ERROR")
                    return False
            else:
                self.log(f"❌ Test 7 FAILED: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Test 7 ERROR: {str(e)}", "ERROR")
            return False
    
    def test_validation_response(self) -> bool:
        """Test 8: Verify response returns updated standing order with all changes"""
        try:
            self.log("✅ Test 8: Validation - Response Structure")
            
            # Get the current standing order to verify all our changes
            response = self.session.get(f"{BASE_URL}/admin/standing-orders/{self.test_standing_order_id}")
            
            if response.status_code == 200:
                standing_order = response.json()
                
                # Verify all the changes we made are present
                checks = []
                
                # Check items (from test 2)
                items = standing_order.get("items", [])
                checks.append(("Items count", len(items) == 3, f"Expected 3 items, got {len(items)}"))
                if items:
                    checks.append(("First item name", "Updated Bread Loaf" in items[0].get("product_name", ""), f"Expected 'Updated Bread Loaf', got '{items[0].get('product_name')}'"))
                
                # Check recurrence (from test 4)
                recurrence_type = standing_order.get("recurrence_type")
                recurrence_config = standing_order.get("recurrence_config", {})
                checks.append(("Recurrence type", recurrence_type == "weekly_days", f"Expected 'weekly_days', got '{recurrence_type}'"))
                checks.append(("Recurrence days", recurrence_config.get("days") == [1, 3, 5], f"Expected [1, 3, 5], got {recurrence_config.get('days')}"))
                
                # Check duration (from test 5)
                duration_type = standing_order.get("duration_type")
                checks.append(("Duration type", duration_type == "end_date", f"Expected 'end_date', got '{duration_type}'"))
                
                # Check end date (from test 6)
                end_date = standing_order.get("end_date")
                checks.append(("End date set", end_date is not None, f"Expected end_date to be set, got {end_date}"))
                
                # Check notes (from test 7)
                notes = standing_order.get("notes", "")
                checks.append(("Notes updated", "Updated notes: This standing order has been modified" in notes, f"Expected updated notes, got '{notes[:50]}...'"))
                
                # Check required fields
                required_fields = ["id", "customer_id", "customer_name", "status", "created_at"]
                for field in required_fields:
                    checks.append((f"Field {field}", field in standing_order, f"Missing required field: {field}"))
                
                # Report results
                passed_checks = sum(1 for _, passed, _ in checks if passed)
                total_checks = len(checks)
                
                self.log(f"Validation Results: {passed_checks}/{total_checks} checks passed")
                
                for check_name, passed, message in checks:
                    status = "✅" if passed else "❌"
                    self.log(f"  {status} {check_name}: {message}")
                
                if passed_checks == total_checks:
                    self.log("✅ Test 8 PASSED: All validation checks passed")
                    return True
                else:
                    self.log(f"❌ Test 8 FAILED: {total_checks - passed_checks} validation checks failed", "ERROR")
                    return False
            else:
                self.log(f"❌ Test 8 FAILED: Could not retrieve standing order: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Test 8 ERROR: {str(e)}", "ERROR")
            return False
    
    def cleanup_test_data(self):
        """Clean up test standing order"""
        try:
            if self.test_standing_order_id:
                self.log("🧹 Cleaning up test data...")
                response = self.session.delete(f"{BASE_URL}/admin/standing-orders/{self.test_standing_order_id}")
                if response.status_code == 200:
                    self.log("✅ Test standing order deleted successfully")
                else:
                    self.log(f"⚠️ Could not delete test standing order: {response.status_code}")
        except Exception as e:
            self.log(f"⚠️ Cleanup error: {str(e)}")
    
    def run_all_tests(self):
        """Run all standing order edit tests"""
        self.log("🚀 Starting Edit Standing Order Backend API Tests")
        self.log("=" * 60)
        
        # Setup
        if not self.login_admin():
            self.log("❌ Cannot proceed without admin authentication", "ERROR")
            return False
        
        if not self.get_test_customer():
            self.log("❌ Cannot proceed without test customer", "ERROR")
            return False
        
        # Try to get existing standing orders first
        existing_orders = self.get_standing_orders()
        if existing_orders and len(existing_orders) > 0:
            # Use existing standing order for testing
            self.test_standing_order_id = existing_orders[0]["id"]
            self.log(f"📋 Using existing standing order for testing: {self.test_standing_order_id}")
        else:
            # Create new standing order for testing
            if not self.create_test_standing_order():
                self.log("❌ Cannot proceed without test standing order", "ERROR")
                return False
        
        # Run tests
        tests = [
            ("Authentication Required", self.test_authentication_required),
            ("Update Products", self.test_update_products),
            ("Update Recurrence Type", self.test_update_recurrence_type),
            ("Update Recurrence Config", self.test_update_recurrence_config),
            ("Update Duration Type", self.test_update_duration_type),
            ("Update End Date", self.test_update_end_date),
            ("Update Notes", self.test_update_notes),
            ("Validation Response", self.test_validation_response),
        ]
        
        passed_tests = 0
        total_tests = len(tests)
        
        for test_name, test_func in tests:
            self.log("-" * 40)
            try:
                if test_func():
                    passed_tests += 1
                else:
                    self.log(f"Test '{test_name}' failed", "ERROR")
            except Exception as e:
                self.log(f"Test '{test_name}' crashed: {str(e)}", "ERROR")
        
        # Cleanup (only if we created the test order)
        if existing_orders is None or len(existing_orders) == 0:
            self.cleanup_test_data()
        
        # Summary
        self.log("=" * 60)
        self.log(f"🏁 TESTING COMPLETE: {passed_tests}/{total_tests} tests passed")
        
        if passed_tests == total_tests:
            self.log("🎉 ALL TESTS PASSED! Edit Standing Order feature is working correctly.")
            return True
        else:
            self.log(f"❌ {total_tests - passed_tests} tests failed. Edit Standing Order feature needs attention.", "ERROR")
            return False


if __name__ == "__main__":
    tester = BackendTester()
    success = tester.run_all_tests()
    exit(0 if success else 1)