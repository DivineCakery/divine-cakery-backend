#!/usr/bin/env python3
"""
Backend Test Suite for Edit Standing Order Propagation Feature
Tests the FIXED "Edit Standing Order" propagation feature after removing duplicate code.
"""

import asyncio
import aiohttp
import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Any

# Get backend URL from environment
BACKEND_URL = "https://reports-timezone-bug.preview.emergentagent.com/api"

# Admin credentials
ADMIN_USERNAME = "testadmin"
ADMIN_PASSWORD = "admin123"

class BackendTester:
    def __init__(self):
        self.session = None
        self.admin_token = None
        self.test_results = []
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    def log_result(self, test_name: str, success: bool, message: str, details: Dict = None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "details": details or {},
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name} - {message}")
        if details:
            print(f"   Details: {json.dumps(details, indent=2)}")
    
    async def authenticate_admin(self) -> bool:
        """Authenticate as admin and get token"""
        try:
            login_data = {
                "username": ADMIN_USERNAME,
                "password": ADMIN_PASSWORD
            }
            
            async with self.session.post(f"{BACKEND_URL}/auth/login", json=login_data) as response:
                if response.status == 200:
                    data = await response.json()
                    self.admin_token = data["access_token"]
                    self.log_result("Admin Authentication", True, "Successfully authenticated as admin")
                    return True
                else:
                    error_text = await response.text()
                    self.log_result("Admin Authentication", False, f"Failed to authenticate: {response.status} - {error_text}")
                    return False
        except Exception as e:
            self.log_result("Admin Authentication", False, f"Authentication error: {str(e)}")
            return False
    
    def get_auth_headers(self) -> Dict[str, str]:
        """Get authorization headers"""
        return {"Authorization": f"Bearer {self.admin_token}"}
    
    async def create_test_customer(self) -> str:
        """Create a test customer for standing orders"""
        try:
            customer_data = {
                "username": f"testcustomer_{int(datetime.now().timestamp())}",
                "email": f"test_{int(datetime.now().timestamp())}@example.com",
                "phone": "+919876543210",
                "business_name": "Test Bakery Business",
                "address": "123 Test Street, Test City",
                "password": "testpassword123",
                "role": "customer",
                "is_approved": True,
                "can_topup_wallet": True,
                "user_type": "owner"
            }
            
            async with self.session.post(
                f"{BACKEND_URL}/admin/users",
                json=customer_data,
                headers=self.get_auth_headers()
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    customer_id = data["id"]
                    self.log_result("Create Test Customer", True, f"Created customer with ID: {customer_id}")
                    return customer_id
                else:
                    error_text = await response.text()
                    self.log_result("Create Test Customer", False, f"Failed to create customer: {response.status} - {error_text}")
                    return None
        except Exception as e:
            self.log_result("Create Test Customer", False, f"Error creating customer: {str(e)}")
            return None
    
    async def create_test_standing_order(self, customer_id: str) -> str:
        """Create a test standing order with specific items"""
        try:
            standing_order_data = {
                "customer_id": customer_id,
                "items": [
                    {
                        "product_id": "test_product_1",
                        "product_name": "Test Bread Loaf",
                        "quantity": 5,
                        "price": 25.0
                    },
                    {
                        "product_id": "test_product_2", 
                        "product_name": "Test Burger Buns",
                        "quantity": 10,
                        "price": 15.0
                    }
                ],
                "recurrence_type": "weekly_days",
                "recurrence_config": {
                    "days": [0, 2, 4]  # Monday, Wednesday, Friday
                },
                "duration_type": "indefinite",
                "notes": "Test standing order for propagation testing"
            }
            
            async with self.session.post(
                f"{BACKEND_URL}/admin/standing-orders",
                json=standing_order_data,
                headers=self.get_auth_headers()
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    standing_order_id = data["id"]
                    self.log_result("Create Test Standing Order", True, f"Created standing order with ID: {standing_order_id}")
                    return standing_order_id
                else:
                    error_text = await response.text()
                    self.log_result("Create Test Standing Order", False, f"Failed to create standing order: {response.status} - {error_text}")
                    return None
        except Exception as e:
            self.log_result("Create Test Standing Order", False, f"Error creating standing order: {str(e)}")
            return None
    
    async def get_standing_order_with_generated_orders(self, standing_order_id: str) -> Dict:
        """Get standing order details with generated orders"""
        try:
            # Get standing order details
            async with self.session.get(
                f"{BACKEND_URL}/admin/standing-orders/{standing_order_id}",
                headers=self.get_auth_headers()
            ) as response:
                if response.status == 200:
                    standing_order = await response.json()
                else:
                    return None
            
            # Get generated orders
            async with self.session.get(
                f"{BACKEND_URL}/admin/standing-orders/{standing_order_id}/generated-orders",
                headers=self.get_auth_headers()
            ) as response:
                if response.status == 200:
                    generated_orders = await response.json()
                    standing_order["generated_orders"] = generated_orders
                    return standing_order
                else:
                    return None
        except Exception as e:
            self.log_result("Get Standing Order", False, f"Error getting standing order: {str(e)}")
            return None
    
    async def update_standing_order_items(self, standing_order_id: str, new_items: List[Dict]) -> Dict:
        """Update standing order items and return response"""
        try:
            update_data = {
                "items": new_items
            }
            
            async with self.session.put(
                f"{BACKEND_URL}/admin/standing-orders/{standing_order_id}",
                json=update_data,
                headers=self.get_auth_headers()
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    self.log_result("Update Standing Order Items", True, "Successfully updated standing order items")
                    return data
                else:
                    error_text = await response.text()
                    self.log_result("Update Standing Order Items", False, f"Failed to update: {response.status} - {error_text}")
                    return None
        except Exception as e:
            self.log_result("Update Standing Order Items", False, f"Error updating standing order: {str(e)}")
            return None
    
    async def test_items_quantity_change_propagation(self):
        """Test Scenario 1: Items/Quantity Change Propagation"""
        print("\n🔍 Testing Items/Quantity Change Propagation...")
        
        # Step 1: Create test customer
        customer_id = await self.create_test_customer()
        if not customer_id:
            return False
        
        # Step 2: Create test standing order
        standing_order_id = await self.create_test_standing_order(customer_id)
        if not standing_order_id:
            return False
        
        # Step 3: Wait a moment for orders to be generated
        await asyncio.sleep(2)
        
        # Step 4: Get initial standing order with generated orders
        initial_data = await self.get_standing_order_with_generated_orders(standing_order_id)
        if not initial_data:
            self.log_result("Get Initial Data", False, "Failed to get initial standing order data")
            return False
        
        initial_orders = initial_data.get("generated_orders", [])
        self.log_result("Initial Generated Orders", True, f"Found {len(initial_orders)} generated orders")
        
        # Log initial quantities for verification
        if initial_orders:
            first_order = initial_orders[0]
            initial_quantities = [item["quantity"] for item in first_order.get("items", [])]
            self.log_result("Initial Quantities", True, f"Initial quantities: {initial_quantities}")
        
        # Step 5: Update standing order with new quantities (clearly different)
        new_items = [
            {
                "product_id": "test_product_1",
                "product_name": "Test Bread Loaf",
                "quantity": 15,  # Changed from 5 to 15 (+10)
                "price": 25.0
            },
            {
                "product_id": "test_product_2",
                "product_name": "Test Burger Buns", 
                "quantity": 20,  # Changed from 10 to 20 (+10)
                "price": 15.0
            }
        ]
        
        updated_standing_order = await self.update_standing_order_items(standing_order_id, new_items)
        if not updated_standing_order:
            return False
        
        # Step 6: Wait for propagation to complete
        await asyncio.sleep(3)
        
        # Step 7: Verify debug_info contains expected fields
        debug_info = updated_standing_order.get("debug_info", {})
        expected_debug_fields = {
            "function_called": True,
            "items_changed": True,
            "update_logic_executed": "items_change"
        }
        
        debug_success = True
        for field, expected_value in expected_debug_fields.items():
            if debug_info.get(field) != expected_value:
                self.log_result(f"Debug Info - {field}", False, f"Expected {expected_value}, got {debug_info.get(field)}")
                debug_success = False
            else:
                self.log_result(f"Debug Info - {field}", True, f"Correct value: {expected_value}")
        
        # Check orders_found and orders_updated
        orders_found = debug_info.get("orders_found", 0)
        orders_updated = debug_info.get("orders_updated", 0)
        
        if orders_found > 0:
            self.log_result("Debug Info - orders_found", True, f"Found {orders_found} orders to update")
        else:
            self.log_result("Debug Info - orders_found", False, f"No orders found to update: {orders_found}")
            debug_success = False
        
        if orders_updated > 0:
            self.log_result("Debug Info - orders_updated", True, f"Updated {orders_updated} orders")
        else:
            self.log_result("Debug Info - orders_updated", False, f"No orders updated: {orders_updated}")
            debug_success = False
        
        # Step 8: Get updated standing order with generated orders
        updated_data = await self.get_standing_order_with_generated_orders(standing_order_id)
        if not updated_data:
            self.log_result("Get Updated Data", False, "Failed to get updated standing order data")
            return False
        
        updated_orders = updated_data.get("generated_orders", [])
        self.log_result("Updated Generated Orders", True, f"Found {len(updated_orders)} generated orders after update")
        
        # Step 9: Verify ALL current and future generated orders have NEW quantities
        propagation_success = True
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        
        for order in updated_orders:
            order_date = datetime.fromisoformat(order["delivery_date"].replace("Z", "+00:00")).replace(tzinfo=None)
            
            # Only check current and future orders
            if order_date >= today:
                order_items = order.get("items", [])
                if len(order_items) >= 2:
                    qty1 = order_items[0]["quantity"]
                    qty2 = order_items[1]["quantity"]
                    
                    if qty1 == 15 and qty2 == 20:
                        self.log_result(f"Order {order['order_number']} Quantities", True, f"Correct new quantities: [{qty1}, {qty2}]")
                    else:
                        self.log_result(f"Order {order['order_number']} Quantities", False, f"Wrong quantities: [{qty1}, {qty2}], expected [15, 20]")
                        propagation_success = False
                else:
                    self.log_result(f"Order {order['order_number']} Items", False, f"Missing items in order")
                    propagation_success = False
        
        return debug_success and propagation_success
    
    async def test_debug_info_response_structure(self):
        """Test Scenario 2: Verify Response Contains debug_info"""
        print("\n🔍 Testing Debug Info Response Structure...")
        
        # Create test customer and standing order
        customer_id = await self.create_test_customer()
        if not customer_id:
            return False
        
        standing_order_id = await self.create_test_standing_order(customer_id)
        if not standing_order_id:
            return False
        
        await asyncio.sleep(2)
        
        # Update with new items
        new_items = [
            {
                "product_id": "test_product_1",
                "product_name": "Test Bread Loaf",
                "quantity": 8,
                "price": 25.0
            }
        ]
        
        updated_standing_order = await self.update_standing_order_items(standing_order_id, new_items)
        if not updated_standing_order:
            return False
        
        # Verify all required debug_info fields are present
        debug_info = updated_standing_order.get("debug_info", {})
        
        required_fields = [
            "function_called",
            "items_changed", 
            "update_logic_executed",
            "orders_found",
            "orders_updated"
        ]
        
        all_fields_present = True
        for field in required_fields:
            if field in debug_info:
                self.log_result(f"Debug Field - {field}", True, f"Present with value: {debug_info[field]}")
            else:
                self.log_result(f"Debug Field - {field}", False, "Missing from response")
                all_fields_present = False
        
        return all_fields_present
    
    async def test_route_registration_and_execution(self):
        """Test that the standing orders routes are properly registered and executing"""
        print("\n🔍 Testing Route Registration and Execution...")
        
        # Test that we can access the standing orders endpoints
        try:
            async with self.session.get(
                f"{BACKEND_URL}/admin/standing-orders",
                headers=self.get_auth_headers()
            ) as response:
                if response.status == 200:
                    self.log_result("Standing Orders Endpoint Access", True, "Successfully accessed /admin/standing-orders")
                    return True
                else:
                    error_text = await response.text()
                    self.log_result("Standing Orders Endpoint Access", False, f"Failed to access endpoint: {response.status} - {error_text}")
                    return False
        except Exception as e:
            self.log_result("Standing Orders Endpoint Access", False, f"Error accessing endpoint: {str(e)}")
            return False
    
    async def run_all_tests(self):
        """Run all test scenarios"""
        print("🚀 Starting Edit Standing Order Propagation Tests...")
        print(f"Backend URL: {BACKEND_URL}")
        
        # Authenticate first
        if not await self.authenticate_admin():
            print("❌ Authentication failed, cannot proceed with tests")
            return
        
        # Run all test scenarios
        test_scenarios = [
            ("Route Registration and Execution", self.test_route_registration_and_execution),
            ("Items/Quantity Change Propagation", self.test_items_quantity_change_propagation),
            ("Debug Info Response Structure", self.test_debug_info_response_structure)
        ]
        
        passed_tests = 0
        total_tests = len(test_scenarios)
        
        for test_name, test_func in test_scenarios:
            print(f"\n{'='*60}")
            print(f"Running: {test_name}")
            print(f"{'='*60}")
            
            try:
                success = await test_func()
                if success:
                    passed_tests += 1
                    print(f"✅ {test_name}: PASSED")
                else:
                    print(f"❌ {test_name}: FAILED")
            except Exception as e:
                print(f"❌ {test_name}: ERROR - {str(e)}")
                self.log_result(test_name, False, f"Test error: {str(e)}")
        
        # Print summary
        print(f"\n{'='*60}")
        print(f"TEST SUMMARY")
        print(f"{'='*60}")
        print(f"Passed: {passed_tests}/{total_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if passed_tests == total_tests:
            print("🎉 ALL TESTS PASSED! Edit Standing Order propagation is working correctly.")
        else:
            print("⚠️  Some tests failed. Check the detailed results above.")
        
        return passed_tests == total_tests

async def main():
    """Main test execution"""
    async with BackendTester() as tester:
        success = await tester.run_all_tests()
        
        # Print detailed results
        print(f"\n{'='*60}")
        print("DETAILED TEST RESULTS")
        print(f"{'='*60}")
        
        for result in tester.test_results:
            status = "✅" if result["success"] else "❌"
            print(f"{status} {result['test']}: {result['message']}")
        
        return success

if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)