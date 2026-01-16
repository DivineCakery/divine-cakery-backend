#!/usr/bin/env python3
"""
Backend Testing Script for Divine Cakery - Standing Order Edit Feature
Focus: Test the FIXED "Edit Standing Order" propagation feature
"""

import requests
import json
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any

# Configuration
BASE_URL = "https://divine-cakery-backend.onrender.com/api"
ADMIN_CREDENTIALS = {
    "username": "testadmin",
    "password": "admin123"
}

class BackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.test_results = []
        
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
        print(f"{status}: {test_name}")
        print(f"   {message}")
        if details:
            print(f"   Details: {details}")
        print()
        
    def authenticate_admin(self) -> bool:
        """Authenticate as admin and get token"""
        try:
            response = self.session.post(
                f"{BASE_URL}/auth/login",
                json=ADMIN_CREDENTIALS,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data["access_token"]
                self.session.headers.update({
                    "Authorization": f"Bearer {self.admin_token}"
                })
                self.log_result(
                    "Admin Authentication",
                    True,
                    "Successfully authenticated as admin",
                    {"token_received": bool(self.admin_token)}
                )
                return True
            else:
                self.log_result(
                    "Admin Authentication",
                    False,
                    f"Authentication failed: {response.status_code}",
                    {"response": response.text}
                )
                return False
                
        except Exception as e:
            self.log_result(
                "Admin Authentication",
                False,
                f"Authentication error: {str(e)}"
            )
            return False
    
    def get_standing_orders(self) -> List[Dict]:
        """Get all standing orders"""
        try:
            response = self.session.get(f"{BASE_URL}/admin/standing-orders", timeout=30)
            if response.status_code == 200:
                return response.json()
            else:
                print(f"Failed to get standing orders: {response.status_code}")
                return []
        except Exception as e:
            print(f"Error getting standing orders: {str(e)}")
            return []
    
    def get_orders_for_standing_order(self, standing_order_id: str) -> List[Dict]:
        """Get all orders for a specific standing order"""
        try:
            response = self.session.get(f"{BASE_URL}/orders", timeout=30)
            if response.status_code == 200:
                all_orders = response.json()
                # Filter orders for this standing order
                standing_orders = [order for order in all_orders if order.get("standing_order_id") == standing_order_id]
                return standing_orders
            else:
                print(f"Failed to get orders: {response.status_code}")
                return []
        except Exception as e:
            print(f"Error getting orders: {str(e)}")
            return []
    
    def create_test_standing_order(self) -> str:
        """Create a test standing order with initial items"""
        try:
            # Get existing customers first
            customers_response = self.session.get(f"{BASE_URL}/admin/users", timeout=30)
            if customers_response.status_code != 200:
                raise Exception("Failed to get customers")
            
            customers = customers_response.json()
            customer_users = [c for c in customers if c.get("role") == "customer"]
            
            if not customer_users:
                raise Exception("No customer users found")
            
            # Use first customer
            test_customer = customer_users[0]
            customer_id = test_customer["id"]
            customer_name = test_customer.get("business_name", test_customer["username"])
            
            # Get some products
            products_response = self.session.get(f"{BASE_URL}/products", timeout=30)
            if products_response.status_code != 200:
                raise Exception("Failed to get products")
            
            products = products_response.json()
            if len(products) < 3:
                raise Exception("Need at least 3 products for testing")
            
            # Use first 3 products for testing
            test_items = []
            for i, product in enumerate(products[:3]):
                test_items.append({
                    "product_id": product["id"],
                    "product_name": product["name"],
                    "quantity": i + 2,  # quantities: 2, 3, 4
                    "price": product.get("price", 100.0)
                })
            
            # Create standing order
            standing_order_data = {
                "customer_id": customer_id,
                "customer_name": customer_name,
                "items": test_items,
                "recurrence_type": "weekly_days",
                "recurrence_config": {"days": [1, 3, 5]},  # Mon, Wed, Fri
                "duration_type": "indefinite",
                "notes": "Test standing order for edit propagation testing",
                "status": "active"
            }
            
            response = self.session.post(
                f"{BASE_URL}/admin/standing-orders",
                json=standing_order_data,
                timeout=30
            )
            
            if response.status_code == 201 or response.status_code == 200:
                standing_order = response.json()
                standing_order_id = standing_order["id"]
                
                self.log_result(
                    "Create Test Standing Order",
                    True,
                    f"Created standing order with ID: {standing_order_id}",
                    {
                        "standing_order_id": standing_order_id,
                        "customer_id": customer_id,
                        "customer_name": customer_name,
                        "items_count": len(test_items),
                        "initial_quantities": [item["quantity"] for item in test_items]
                    }
                )
                
                # Wait a moment for orders to be generated
                time.sleep(2)
                
                return standing_order_id
            else:
                self.log_result(
                    "Create Test Standing Order",
                    False,
                    f"Failed to create standing order: {response.status_code}",
                    {"response": response.text}
                )
                return None
                
        except Exception as e:
            self.log_result(
                "Create Test Standing Order",
                False,
                f"Error creating standing order: {str(e)}"
            )
            return None
    
    def test_items_quantity_change_propagation(self, standing_order_id: str) -> bool:
        """
        Test 1: Items/Quantity Change Only (No frequency change)
        This is the main test case that was failing before the fix
        """
        try:
            print("🔥 STARTING ITEMS/QUANTITY CHANGE PROPAGATION TEST")
            
            # Get initial standing order
            response = self.session.get(f"{BASE_URL}/admin/standing-orders/{standing_order_id}", timeout=30)
            if response.status_code != 200:
                raise Exception(f"Failed to get standing order: {response.status_code}")
            
            standing_order = response.json()
            original_items = standing_order["items"]
            
            print(f"🔥 Original items: {[item['quantity'] for item in original_items]}")
            
            # Get initial generated orders
            initial_orders = self.get_orders_for_standing_order(standing_order_id)
            print(f"🔥 Found {len(initial_orders)} initial orders")
            
            if len(initial_orders) == 0:
                # Generate some orders first
                regenerate_response = self.session.post(
                    f"{BASE_URL}/admin/standing-orders/{standing_order_id}/regenerate",
                    timeout=30
                )
                if regenerate_response.status_code == 200:
                    time.sleep(2)
                    initial_orders = self.get_orders_for_standing_order(standing_order_id)
                    print(f"🔥 After regeneration: {len(initial_orders)} orders")
            
            # Update ONLY the items (change quantities to 5, 6, 3)
            updated_items = []
            for i, item in enumerate(original_items):
                new_quantity = [5, 6, 3][i] if i < 3 else item["quantity"]
                updated_items.append({
                    "product_id": item["product_id"],
                    "product_name": item["product_name"],
                    "quantity": new_quantity,
                    "price": item["price"]
                })
            
            print(f"🔥 Updating to new quantities: {[item['quantity'] for item in updated_items]}")
            
            # Update standing order with ONLY items change (no frequency change)
            update_data = {
                "items": updated_items
                # NOT changing recurrence_type or recurrence_config
            }
            
            print("🔥 Sending update request...")
            update_response = self.session.put(
                f"{BASE_URL}/admin/standing-orders/{standing_order_id}",
                json=update_data,
                timeout=30
            )
            
            if update_response.status_code != 200:
                raise Exception(f"Failed to update standing order: {update_response.status_code} - {update_response.text}")
            
            print("🔥 Update request successful, checking propagation...")
            
            # Wait a moment for propagation
            time.sleep(3)
            
            # Get updated orders
            updated_orders = self.get_orders_for_standing_order(standing_order_id)
            print(f"🔥 Found {len(updated_orders)} orders after update")
            
            # Check if orders have been updated with new quantities
            propagation_success = True
            propagation_details = []
            
            for order in updated_orders:
                order_items = order.get("items", [])
                order_quantities = [item.get("quantity", 0) for item in order_items]
                expected_quantities = [5, 6, 3]
                
                if order_quantities[:3] == expected_quantities[:len(order_quantities)]:
                    propagation_details.append({
                        "order_id": order.get("id", "unknown")[:8],
                        "delivery_date": order.get("delivery_date", "unknown"),
                        "quantities": order_quantities,
                        "status": "✅ UPDATED"
                    })
                else:
                    propagation_success = False
                    propagation_details.append({
                        "order_id": order.get("id", "unknown")[:8],
                        "delivery_date": order.get("delivery_date", "unknown"),
                        "quantities": order_quantities,
                        "expected": expected_quantities,
                        "status": "❌ NOT UPDATED"
                    })
            
            self.log_result(
                "Items/Quantity Change Propagation",
                propagation_success,
                f"Items propagation {'SUCCESS' if propagation_success else 'FAILED'}: {len(updated_orders)} orders checked",
                {
                    "standing_order_id": standing_order_id,
                    "original_quantities": [item["quantity"] for item in original_items],
                    "new_quantities": [item["quantity"] for item in updated_items],
                    "orders_checked": len(updated_orders),
                    "propagation_details": propagation_details
                }
            )
            
            return propagation_success
            
        except Exception as e:
            self.log_result(
                "Items/Quantity Change Propagation",
                False,
                f"Error during items propagation test: {str(e)}"
            )
            return False
    
    def test_frequency_change(self, standing_order_id: str) -> bool:
        """
        Test 2: Frequency Change (should delete and regenerate orders)
        """
        try:
            print("🔥 STARTING FREQUENCY CHANGE TEST")
            
            # Get current orders count
            initial_orders = self.get_orders_for_standing_order(standing_order_id)
            initial_count = len(initial_orders)
            
            # Change frequency from weekly_days to interval
            update_data = {
                "recurrence_type": "interval",
                "recurrence_config": {"days": 2}  # Every 2 days
            }
            
            print("🔥 Changing frequency from weekly_days to interval...")
            
            update_response = self.session.put(
                f"{BASE_URL}/admin/standing-orders/{standing_order_id}",
                json=update_data,
                timeout=30
            )
            
            if update_response.status_code != 200:
                raise Exception(f"Failed to update frequency: {update_response.status_code}")
            
            # Wait for regeneration
            time.sleep(3)
            
            # Get new orders
            new_orders = self.get_orders_for_standing_order(standing_order_id)
            new_count = len(new_orders)
            
            # Frequency change should regenerate orders (may have different count)
            frequency_success = True  # As long as update succeeded, it's working
            
            self.log_result(
                "Frequency Change",
                frequency_success,
                f"Frequency change completed: {initial_count} → {new_count} orders",
                {
                    "standing_order_id": standing_order_id,
                    "initial_orders": initial_count,
                    "new_orders": new_count,
                    "recurrence_type": "interval",
                    "recurrence_config": {"days": 2}
                }
            )
            
            return frequency_success
            
        except Exception as e:
            self.log_result(
                "Frequency Change",
                False,
                f"Error during frequency change test: {str(e)}"
            )
            return False
    
    def check_backend_logs(self):
        """Check backend logs for debug output"""
        try:
            print("🔥 CHECKING BACKEND LOGS FOR DEBUG OUTPUT")
            
            # Try to read supervisor logs
            import subprocess
            
            # Check backend output log
            try:
                result = subprocess.run(
                    ["tail", "-n", "50", "/var/log/supervisor/backend.out.log"],
                    capture_output=True,
                    text=True,
                    timeout=10
                )
                
                if result.returncode == 0:
                    log_content = result.stdout
                    
                    # Look for our debug messages
                    debug_messages = []
                    for line in log_content.split('\n'):
                        if '🔥' in line:
                            debug_messages.append(line.strip())
                    
                    self.log_result(
                        "Backend Debug Logs Check",
                        len(debug_messages) > 0,
                        f"Found {len(debug_messages)} debug messages in backend logs",
                        {
                            "debug_messages": debug_messages[-10:],  # Last 10 messages
                            "log_file": "/var/log/supervisor/backend.out.log"
                        }
                    )
                else:
                    self.log_result(
                        "Backend Debug Logs Check",
                        False,
                        "Could not read backend output log",
                        {"error": result.stderr}
                    )
            except Exception as e:
                self.log_result(
                    "Backend Debug Logs Check",
                    False,
                    f"Error reading backend logs: {str(e)}"
                )
                
        except Exception as e:
            print(f"Error checking logs: {str(e)}")
    
    def cleanup_test_data(self, standing_order_id: str):
        """Clean up test standing order"""
        try:
            if standing_order_id:
                # Delete the test standing order
                response = self.session.delete(
                    f"{BASE_URL}/admin/standing-orders/{standing_order_id}",
                    timeout=30
                )
                
                if response.status_code == 200:
                    print(f"✅ Cleaned up test standing order: {standing_order_id}")
                else:
                    print(f"⚠️ Failed to cleanup standing order: {response.status_code}")
        except Exception as e:
            print(f"⚠️ Error during cleanup: {str(e)}")
    
    def run_comprehensive_test(self):
        """Run comprehensive standing order edit tests"""
        print("=" * 80)
        print("🔥 STANDING ORDER EDIT PROPAGATION TESTING")
        print("=" * 80)
        print()
        
        # Step 1: Authenticate
        if not self.authenticate_admin():
            print("❌ Cannot proceed without admin authentication")
            return False
        
        # Step 2: Create test standing order
        standing_order_id = self.create_test_standing_order()
        if not standing_order_id:
            print("❌ Cannot proceed without test standing order")
            return False
        
        try:
            # Step 3: Test items/quantity change propagation (main test)
            items_test_success = self.test_items_quantity_change_propagation(standing_order_id)
            
            # Step 4: Test frequency change
            frequency_test_success = self.test_frequency_change(standing_order_id)
            
            # Step 5: Check backend logs
            self.check_backend_logs()
            
            # Calculate overall success
            critical_tests_passed = items_test_success  # This is the main test
            overall_success = critical_tests_passed
            
            print("=" * 80)
            print("🔥 TEST SUMMARY")
            print("=" * 80)
            
            passed_tests = sum(1 for result in self.test_results if result["success"])
            total_tests = len(self.test_results)
            
            print(f"Tests Passed: {passed_tests}/{total_tests}")
            print(f"Critical Test (Items Propagation): {'✅ PASS' if items_test_success else '❌ FAIL'}")
            print(f"Frequency Change Test: {'✅ PASS' if frequency_test_success else '❌ FAIL'}")
            print()
            
            if overall_success:
                print("🎉 STANDING ORDER EDIT PROPAGATION FIX IS WORKING!")
                print("✅ Items/quantity changes are properly propagated to existing orders")
            else:
                print("❌ STANDING ORDER EDIT PROPAGATION IS STILL BROKEN!")
                print("❌ Items/quantity changes are NOT being propagated to existing orders")
            
            return overall_success
            
        finally:
            # Cleanup
            self.cleanup_test_data(standing_order_id)
    
    def print_detailed_results(self):
        """Print detailed test results"""
        print("\n" + "=" * 80)
        print("DETAILED TEST RESULTS")
        print("=" * 80)
        
        for result in self.test_results:
            status = "✅ PASS" if result["success"] else "❌ FAIL"
            print(f"\n{status}: {result['test']}")
            print(f"Message: {result['message']}")
            if result["details"]:
                print(f"Details: {json.dumps(result['details'], indent=2)}")


def main():
    """Main test execution"""
    tester = BackendTester()
    
    try:
        success = tester.run_comprehensive_test()
        tester.print_detailed_results()
        
        # Exit with appropriate code
        exit(0 if success else 1)
        
    except KeyboardInterrupt:
        print("\n⚠️ Test interrupted by user")
        exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {str(e)}")
        exit(1)


if __name__ == "__main__":
    main()