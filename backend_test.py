#!/usr/bin/env python3
"""
Backend Test Suite for Divine Cakery - Edit Standing Order Propagation Feature
Testing the FIXED import issue and items/quantity change propagation
"""

import requests
import json
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any

# Configuration
BACKEND_URL = "https://divine-cakery-backend.onrender.com/api"
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
                f"{BACKEND_URL}/auth/login",
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
                    f"Successfully authenticated as {ADMIN_CREDENTIALS['username']}"
                )
                return True
            else:
                self.log_result(
                    "Admin Authentication",
                    False,
                    f"Authentication failed: {response.status_code} - {response.text}"
                )
                return False
                
        except Exception as e:
            self.log_result(
                "Admin Authentication",
                False,
                f"Authentication error: {str(e)}"
            )
            return False
    
    def get_test_customer(self) -> Dict:
        """Get or create a test customer for standing orders"""
        try:
            # Get all users to find a customer
            response = self.session.get(f"{BACKEND_URL}/admin/users", timeout=30)
            
            if response.status_code == 200:
                users = response.json()
                customers = [u for u in users if u.get("role") == "customer"]
                
                if customers:
                    customer = customers[0]
                    self.log_result(
                        "Get Test Customer",
                        True,
                        f"Found test customer: {customer.get('username')} (ID: {customer.get('id')})"
                    )
                    return customer
                else:
                    self.log_result(
                        "Get Test Customer",
                        False,
                        "No customers found in database"
                    )
                    return None
            else:
                self.log_result(
                    "Get Test Customer",
                    False,
                    f"Failed to get users: {response.status_code}"
                )
                return None
                
        except Exception as e:
            self.log_result(
                "Get Test Customer",
                False,
                f"Error getting test customer: {str(e)}"
            )
            return None
    
    def get_test_products(self) -> List[Dict]:
        """Get test products for standing order items"""
        try:
            response = self.session.get(f"{BACKEND_URL}/products", timeout=30)
            
            if response.status_code == 200:
                products = response.json()
                # Get first 3 products for testing
                test_products = products[:3] if len(products) >= 3 else products
                
                self.log_result(
                    "Get Test Products",
                    True,
                    f"Found {len(test_products)} test products"
                )
                return test_products
            else:
                self.log_result(
                    "Get Test Products",
                    False,
                    f"Failed to get products: {response.status_code}"
                )
                return []
                
        except Exception as e:
            self.log_result(
                "Get Test Products",
                False,
                f"Error getting test products: {str(e)}"
            )
            return []
    
    def create_test_standing_order(self, customer: Dict, products: List[Dict]) -> Dict:
        """Create a test standing order with initial quantities"""
        try:
            # Create items with initial quantities [2, 3, 4]
            items = []
            initial_quantities = [2, 3, 4]
            
            for i, product in enumerate(products[:3]):
                items.append({
                    "product_id": product["id"],
                    "product_name": product["name"],
                    "quantity": initial_quantities[i],
                    "price": float(product.get("price", 100))
                })
            
            standing_order_data = {
                "customer_id": customer["id"],
                "items": items,
                "recurrence_type": "weekly_days",
                "recurrence_config": {"days": [0, 2, 4]},  # Mon, Wed, Fri
                "duration_type": "indefinite",
                "notes": "Test standing order for propagation testing"
            }
            
            response = self.session.post(
                f"{BACKEND_URL}/admin/standing-orders",
                json=standing_order_data,
                timeout=30
            )
            
            if response.status_code == 200:
                standing_order = response.json()
                self.log_result(
                    "Create Test Standing Order",
                    True,
                    f"Created standing order {standing_order['id']} with initial quantities {initial_quantities}",
                    {"standing_order_id": standing_order["id"], "items": items}
                )
                return standing_order
            else:
                self.log_result(
                    "Create Test Standing Order",
                    False,
                    f"Failed to create standing order: {response.status_code} - {response.text}"
                )
                return None
                
        except Exception as e:
            self.log_result(
                "Create Test Standing Order",
                False,
                f"Error creating standing order: {str(e)}"
            )
            return None
    
    def get_generated_orders(self, standing_order_id: str) -> List[Dict]:
        """Get all orders generated from a standing order"""
        try:
            response = self.session.get(
                f"{BACKEND_URL}/admin/standing-orders/{standing_order_id}/generated-orders",
                timeout=30
            )
            
            if response.status_code == 200:
                orders = response.json()
                self.log_result(
                    "Get Generated Orders",
                    True,
                    f"Found {len(orders)} generated orders for standing order {standing_order_id}"
                )
                return orders
            else:
                self.log_result(
                    "Get Generated Orders",
                    False,
                    f"Failed to get generated orders: {response.status_code}"
                )
                return []
                
        except Exception as e:
            self.log_result(
                "Get Generated Orders",
                False,
                f"Error getting generated orders: {str(e)}"
            )
            return []
    
    def update_standing_order_items(self, standing_order_id: str, products: List[Dict]) -> Dict:
        """Update standing order items with new quantities [5, 6, 3]"""
        try:
            # Create items with NEW quantities [5, 6, 3]
            new_items = []
            new_quantities = [5, 6, 3]
            
            for i, product in enumerate(products[:3]):
                new_items.append({
                    "product_id": product["id"],
                    "product_name": product["name"],
                    "quantity": new_quantities[i],
                    "price": float(product.get("price", 100))
                })
            
            update_data = {
                "items": new_items
            }
            
            response = self.session.put(
                f"{BACKEND_URL}/admin/standing-orders/{standing_order_id}",
                json=update_data,
                timeout=30
            )
            
            if response.status_code == 200:
                updated_standing_order = response.json()
                self.log_result(
                    "Update Standing Order Items",
                    True,
                    f"Updated standing order {standing_order_id} with new quantities {new_quantities}",
                    {"new_items": new_items}
                )
                return updated_standing_order
            else:
                self.log_result(
                    "Update Standing Order Items",
                    False,
                    f"Failed to update standing order: {response.status_code} - {response.text}"
                )
                return None
                
        except Exception as e:
            self.log_result(
                "Update Standing Order Items",
                False,
                f"Error updating standing order: {str(e)}"
            )
            return None
    
    def verify_debug_info(self, standing_order_id: str) -> bool:
        """Verify that debug_info shows update was executed"""
        try:
            response = self.session.get(
                f"{BACKEND_URL}/admin/standing-orders/{standing_order_id}",
                timeout=30
            )
            
            if response.status_code == 200:
                standing_order = response.json()
                debug_info = standing_order.get("debug_info", {})
                
                # Check for required debug info fields
                update_logic_executed = debug_info.get("update_logic_executed")
                orders_found = debug_info.get("orders_found")
                orders_updated = debug_info.get("orders_updated")
                
                success = (
                    update_logic_executed == "items_change" and
                    orders_found is not None and
                    orders_updated is not None
                )
                
                if success:
                    self.log_result(
                        "Verify Debug Info",
                        True,
                        f"Debug info confirms update executed: {update_logic_executed}, found {orders_found} orders, updated {orders_updated}",
                        debug_info
                    )
                else:
                    self.log_result(
                        "Verify Debug Info",
                        False,
                        f"Debug info missing or incorrect: {debug_info}",
                        debug_info
                    )
                
                return success
            else:
                self.log_result(
                    "Verify Debug Info",
                    False,
                    f"Failed to get standing order: {response.status_code}"
                )
                return False
                
        except Exception as e:
            self.log_result(
                "Verify Debug Info",
                False,
                f"Error verifying debug info: {str(e)}"
            )
            return False
    
    def verify_order_propagation(self, standing_order_id: str, expected_quantities: List[int]) -> bool:
        """Verify that generated orders have the updated quantities"""
        try:
            orders = self.get_generated_orders(standing_order_id)
            
            if not orders:
                self.log_result(
                    "Verify Order Propagation",
                    False,
                    "No generated orders found to verify"
                )
                return False
            
            # Check future orders (delivery_date >= today)
            today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            future_orders = []
            
            for order in orders:
                delivery_date_str = order.get("delivery_date")
                if delivery_date_str:
                    # Parse delivery date
                    if isinstance(delivery_date_str, str):
                        delivery_date = datetime.fromisoformat(delivery_date_str.replace('Z', '+00:00'))
                    else:
                        delivery_date = delivery_date_str
                    
                    if delivery_date.replace(tzinfo=None) >= today:
                        future_orders.append(order)
            
            if not future_orders:
                self.log_result(
                    "Verify Order Propagation",
                    False,
                    "No future orders found to verify propagation"
                )
                return False
            
            # Check if all future orders have the updated quantities
            propagation_success = True
            propagation_details = []
            
            for order in future_orders:
                order_items = order.get("items", [])
                order_quantities = [item.get("quantity", 0) for item in order_items[:len(expected_quantities)]]
                
                if order_quantities == expected_quantities:
                    propagation_details.append({
                        "order_id": order["id"],
                        "delivery_date": order.get("delivery_date"),
                        "quantities": order_quantities,
                        "status": "✅ CORRECT"
                    })
                else:
                    propagation_success = False
                    propagation_details.append({
                        "order_id": order["id"],
                        "delivery_date": order.get("delivery_date"),
                        "quantities": order_quantities,
                        "expected": expected_quantities,
                        "status": "❌ INCORRECT"
                    })
            
            if propagation_success:
                self.log_result(
                    "Verify Order Propagation",
                    True,
                    f"All {len(future_orders)} future orders have correct quantities {expected_quantities}",
                    {"orders_checked": len(future_orders), "details": propagation_details}
                )
            else:
                self.log_result(
                    "Verify Order Propagation",
                    False,
                    f"Some orders have incorrect quantities. Expected {expected_quantities}",
                    {"orders_checked": len(future_orders), "details": propagation_details}
                )
            
            return propagation_success
            
        except Exception as e:
            self.log_result(
                "Verify Order Propagation",
                False,
                f"Error verifying order propagation: {str(e)}"
            )
            return False
    
    def cleanup_test_data(self, standing_order_id: str):
        """Clean up test standing order"""
        try:
            response = self.session.delete(
                f"{BACKEND_URL}/admin/standing-orders/{standing_order_id}",
                timeout=30
            )
            
            if response.status_code == 200:
                self.log_result(
                    "Cleanup Test Data",
                    True,
                    f"Successfully deleted test standing order {standing_order_id}"
                )
            else:
                self.log_result(
                    "Cleanup Test Data",
                    False,
                    f"Failed to delete standing order: {response.status_code}"
                )
                
        except Exception as e:
            self.log_result(
                "Cleanup Test Data",
                False,
                f"Error during cleanup: {str(e)}"
            )
    
    def run_comprehensive_test(self):
        """Run the comprehensive Edit Standing Order propagation test"""
        print("🧪 STARTING COMPREHENSIVE EDIT STANDING ORDER PROPAGATION TEST")
        print("=" * 80)
        print()
        
        # Step 1: Authenticate
        if not self.authenticate_admin():
            return False
        
        # Step 2: Get test data
        customer = self.get_test_customer()
        if not customer:
            return False
        
        products = self.get_test_products()
        if len(products) < 3:
            self.log_result(
                "Test Prerequisites",
                False,
                f"Need at least 3 products for testing, found {len(products)}"
            )
            return False
        
        # Step 3: Create test standing order with initial quantities [2, 3, 4]
        standing_order = self.create_test_standing_order(customer, products)
        if not standing_order:
            return False
        
        standing_order_id = standing_order["id"]
        
        try:
            # Step 4: Wait a moment for orders to be generated
            print("⏳ Waiting 3 seconds for orders to be generated...")
            time.sleep(3)
            
            # Step 5: Verify initial orders were generated
            initial_orders = self.get_generated_orders(standing_order_id)
            if not initial_orders:
                self.log_result(
                    "Initial Order Generation",
                    False,
                    "No orders were generated after creating standing order"
                )
                return False
            
            # Step 6: Update standing order items with new quantities [5, 6, 3]
            updated_standing_order = self.update_standing_order_items(standing_order_id, products)
            if not updated_standing_order:
                return False
            
            # Step 7: Wait a moment for propagation
            print("⏳ Waiting 2 seconds for propagation to complete...")
            time.sleep(2)
            
            # Step 8: Verify debug info shows update was executed
            debug_success = self.verify_debug_info(standing_order_id)
            
            # Step 9: Verify order propagation - orders should have new quantities [5, 6, 3]
            propagation_success = self.verify_order_propagation(standing_order_id, [5, 6, 3])
            
            # Overall test result
            overall_success = debug_success and propagation_success
            
            if overall_success:
                print("🎉 COMPREHENSIVE TEST RESULT: SUCCESS!")
                print("✅ Edit Standing Order propagation feature is working correctly")
                print("✅ Items/quantity changes are properly propagated to existing orders")
                print("✅ Debug info confirms update logic execution")
            else:
                print("❌ COMPREHENSIVE TEST RESULT: FAILURE!")
                print("❌ Edit Standing Order propagation feature has issues")
                if not debug_success:
                    print("❌ Debug info does not show proper update execution")
                if not propagation_success:
                    print("❌ Order propagation is not working correctly")
            
            return overall_success
            
        finally:
            # Step 10: Cleanup
            print("\n🧹 Cleaning up test data...")
            self.cleanup_test_data(standing_order_id)
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 80)
        print("📊 TEST SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r["success"]])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests} ✅")
        print(f"Failed: {failed_tests} ❌")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test']}: {result['message']}")
        
        print("\n" + "=" * 80)


def main():
    """Main test execution"""
    tester = BackendTester()
    
    try:
        success = tester.run_comprehensive_test()
        tester.print_summary()
        
        # Exit with appropriate code
        exit(0 if success else 1)
        
    except KeyboardInterrupt:
        print("\n\n⚠️ Test interrupted by user")
        tester.print_summary()
        exit(1)
    except Exception as e:
        print(f"\n\n💥 Unexpected error: {str(e)}")
        tester.print_summary()
        exit(1)


if __name__ == "__main__":
    main()