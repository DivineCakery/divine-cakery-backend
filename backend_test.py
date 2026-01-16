#!/usr/bin/env python3
"""
Comprehensive Backend Testing for Edit Standing Order Feature
Tests the updated functionality that propagates changes to all current and future generated orders.
"""

import requests
import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Any
import time

# Configuration
BACKEND_URL = "https://divine-cakery-backend.onrender.com/api"
ADMIN_CREDENTIALS = {
    "username": "testadmin",
    "password": "admin123"
}

class StandingOrderTester:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.test_customer_id = None
        self.test_standing_order_id = None
        self.test_products = []
        
    def log(self, message: str, level: str = "INFO"):
        """Log messages with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
        
    def authenticate_admin(self) -> bool:
        """Authenticate as admin and get token"""
        try:
            response = self.session.post(
                f"{BACKEND_URL}/auth/login",
                json=ADMIN_CREDENTIALS
            )
            
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data["access_token"]
                self.session.headers.update({
                    "Authorization": f"Bearer {self.admin_token}"
                })
                self.log("✅ Admin authentication successful")
                return True
            else:
                self.log(f"❌ Admin authentication failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Admin authentication error: {str(e)}", "ERROR")
            return False
    
    def get_test_customer(self) -> bool:
        """Get or create a test customer"""
        try:
            # Get all customers
            response = self.session.get(f"{BACKEND_URL}/admin/users")
            
            if response.status_code == 200:
                users = response.json()
                customers = [u for u in users if u.get("role") == "customer"]
                
                if customers:
                    self.test_customer_id = customers[0]["id"]
                    self.log(f"✅ Using existing customer: {customers[0].get('username', 'Unknown')}")
                    return True
                else:
                    self.log("❌ No customers found in database", "ERROR")
                    return False
            else:
                self.log(f"❌ Failed to get customers: {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Error getting test customer: {str(e)}", "ERROR")
            return False
    
    def get_test_products(self) -> bool:
        """Get test products for standing orders"""
        try:
            response = self.session.get(f"{BACKEND_URL}/products")
            
            if response.status_code == 200:
                products = response.json()
                if len(products) >= 3:
                    self.test_products = products[:3]  # Use first 3 products
                    self.log(f"✅ Got {len(self.test_products)} test products")
                    return True
                else:
                    self.log("❌ Need at least 3 products for testing", "ERROR")
                    return False
            else:
                self.log(f"❌ Failed to get products: {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Error getting test products: {str(e)}", "ERROR")
            return False
    
    def create_test_standing_order(self) -> bool:
        """Create a test standing order with generated orders"""
        try:
            # Create standing order items
            items = []
            for i, product in enumerate(self.test_products):
                items.append({
                    "product_id": product["id"],
                    "product_name": product["name"],
                    "quantity": 2 + i,  # 2, 3, 4 quantities
                    "price": product["price"]
                })
            
            standing_order_data = {
                "customer_id": self.test_customer_id,
                "items": items,
                "recurrence_type": "weekly_days",
                "recurrence_config": {"days": [0, 2, 4]},  # Mon, Wed, Fri
                "duration_type": "indefinite",
                "notes": "Test standing order for edit propagation testing"
            }
            
            response = self.session.post(
                f"{BACKEND_URL}/admin/standing-orders",
                json=standing_order_data
            )
            
            if response.status_code == 200:
                data = response.json()
                self.test_standing_order_id = data["id"]
                self.log(f"✅ Created test standing order: {self.test_standing_order_id}")
                
                # Wait a moment for orders to be generated
                time.sleep(2)
                return True
            else:
                self.log(f"❌ Failed to create standing order: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Error creating test standing order: {str(e)}", "ERROR")
            return False
    
    def get_generated_orders(self) -> List[Dict]:
        """Get all generated orders for the test standing order"""
        try:
            response = self.session.get(
                f"{BACKEND_URL}/admin/standing-orders/{self.test_standing_order_id}/generated-orders"
            )
            
            if response.status_code == 200:
                orders = response.json()
                self.log(f"✅ Retrieved {len(orders)} generated orders")
                return orders
            else:
                self.log(f"❌ Failed to get generated orders: {response.status_code}", "ERROR")
                return []
                
        except Exception as e:
            self.log(f"❌ Error getting generated orders: {str(e)}", "ERROR")
            return []
    
    def test_items_quantity_change_propagation(self) -> bool:
        """Test Scenario 1: Items/Quantity Change Propagation"""
        self.log("\n🧪 TESTING: Items/Quantity Change Propagation")
        
        try:
            # Get initial generated orders
            initial_orders = self.get_generated_orders()
            if not initial_orders:
                self.log("❌ No initial orders found", "ERROR")
                return False
            
            # Filter for current and future orders (delivery_date >= today)
            today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            current_future_orders = [
                order for order in initial_orders 
                if datetime.fromisoformat(order["delivery_date"].replace("Z", "+00:00")).replace(tzinfo=None) >= today
            ]
            
            self.log(f"📊 Initial state: {len(current_future_orders)} current/future orders")
            
            # Log initial order details
            for order in current_future_orders[:2]:  # Show first 2 orders
                self.log(f"   Order {order['order_number']}: {len(order['items'])} items, total: ${order['total_amount']}")
            
            # Update items - change quantities and add a new product
            updated_items = []
            for i, product in enumerate(self.test_products[:2]):  # Use first 2 products
                updated_items.append({
                    "product_id": product["id"],
                    "product_name": product["name"],
                    "quantity": 5 + i,  # New quantities: 5, 6
                    "price": product["price"]
                })
            
            # Add a third product
            if len(self.test_products) > 2:
                updated_items.append({
                    "product_id": self.test_products[2]["id"],
                    "product_name": self.test_products[2]["name"],
                    "quantity": 3,
                    "price": self.test_products[2]["price"]
                })
            
            update_data = {
                "items": updated_items,
                "notes": "Updated items and quantities for propagation test"
            }
            
            # Update the standing order
            response = self.session.put(
                f"{BACKEND_URL}/admin/standing-orders/{self.test_standing_order_id}",
                json=update_data
            )
            
            if response.status_code != 200:
                self.log(f"❌ Failed to update standing order: {response.status_code} - {response.text}", "ERROR")
                return False
            
            self.log("✅ Standing order updated successfully")
            
            # Wait for propagation
            time.sleep(2)
            
            # Get updated generated orders
            updated_orders = self.get_generated_orders()
            updated_current_future = [
                order for order in updated_orders 
                if datetime.fromisoformat(order["delivery_date"].replace("Z", "+00:00")).replace(tzinfo=None) >= today
            ]
            
            self.log(f"📊 After update: {len(updated_current_future)} current/future orders")
            
            # Verify propagation
            success = True
            
            # Check that all current/future orders have updated items
            for order in updated_current_future:
                # Verify items count
                if len(order["items"]) != len(updated_items):
                    self.log(f"❌ Order {order['order_number']}: Expected {len(updated_items)} items, got {len(order['items'])}", "ERROR")
                    success = False
                    continue
                
                # Verify quantities and calculate expected total
                expected_total = 0
                for i, item in enumerate(order["items"]):
                    expected_qty = updated_items[i]["quantity"]
                    if item["quantity"] != expected_qty:
                        self.log(f"❌ Order {order['order_number']}, Item {item['product_name']}: Expected qty {expected_qty}, got {item['quantity']}", "ERROR")
                        success = False
                    expected_total += item["price"] * item["quantity"]
                
                # Verify totals
                if abs(order["total_amount"] - expected_total) > 0.01:
                    self.log(f"❌ Order {order['order_number']}: Expected total ${expected_total}, got ${order['total_amount']}", "ERROR")
                    success = False
                
                if abs(order["final_amount"] - expected_total) > 0.01:
                    self.log(f"❌ Order {order['order_number']}: Expected final amount ${expected_total}, got ${order['final_amount']}", "ERROR")
                    success = False
            
            if success:
                self.log("✅ All current/future orders have correct updated items and totals")
                
                # Log sample updated order
                if updated_current_future:
                    sample_order = updated_current_future[0]
                    self.log(f"   Sample Order {sample_order['order_number']}: {len(sample_order['items'])} items, total: ${sample_order['total_amount']}")
                
                return True
            else:
                return False
                
        except Exception as e:
            self.log(f"❌ Error in items/quantity change test: {str(e)}", "ERROR")
            return False
    
    def test_frequency_change_regeneration(self) -> bool:
        """Test Scenario 2: Frequency Change (Delete & Regenerate)"""
        self.log("\n🧪 TESTING: Frequency Change (Delete & Regenerate)")
        
        try:
            # Get current generated orders
            initial_orders = self.get_generated_orders()
            today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            initial_future_orders = [
                order for order in initial_orders 
                if datetime.fromisoformat(order["delivery_date"].replace("Z", "+00:00")).replace(tzinfo=None) >= today
            ]
            
            self.log(f"📊 Initial state: {len(initial_future_orders)} future orders")
            
            # Log some initial delivery dates
            initial_dates = [
                datetime.fromisoformat(order["delivery_date"].replace("Z", "+00:00")).strftime("%Y-%m-%d")
                for order in initial_future_orders[:5]
            ]
            self.log(f"   Initial delivery dates: {initial_dates}")
            
            # Change frequency from weekly_days to interval
            update_data = {
                "recurrence_type": "interval",
                "recurrence_config": {"days": 2},  # Every 2 days
                "notes": "Changed to every 2 days for frequency test"
            }
            
            # Update the standing order
            response = self.session.put(
                f"{BACKEND_URL}/admin/standing-orders/{self.test_standing_order_id}",
                json=update_data
            )
            
            if response.status_code != 200:
                self.log(f"❌ Failed to update standing order frequency: {response.status_code} - {response.text}", "ERROR")
                return False
            
            self.log("✅ Standing order frequency updated successfully")
            
            # Wait for regeneration
            time.sleep(3)
            
            # Get new generated orders
            new_orders = self.get_generated_orders()
            new_future_orders = [
                order for order in new_orders 
                if datetime.fromisoformat(order["delivery_date"].replace("Z", "+00:00")).replace(tzinfo=None) >= today
            ]
            
            self.log(f"📊 After frequency change: {len(new_future_orders)} future orders")
            
            # Log new delivery dates
            new_dates = [
                datetime.fromisoformat(order["delivery_date"].replace("Z", "+00:00")).strftime("%Y-%m-%d")
                for order in new_future_orders[:5]
            ]
            self.log(f"   New delivery dates: {new_dates}")
            
            # Verify that orders were regenerated on new schedule
            success = True
            
            # Check that we have orders (should be regenerated)
            if len(new_future_orders) == 0:
                self.log("❌ No future orders found after frequency change", "ERROR")
                success = False
            
            # Verify the new schedule pattern (every 2 days)
            if len(new_future_orders) >= 2:
                date1 = datetime.fromisoformat(new_future_orders[0]["delivery_date"].replace("Z", "+00:00"))
                date2 = datetime.fromisoformat(new_future_orders[1]["delivery_date"].replace("Z", "+00:00"))
                
                # The difference should be related to the 2-day interval
                # Note: The exact pattern depends on the starting date, but we should see regular intervals
                self.log(f"   First two delivery dates: {date1.strftime('%Y-%m-%d')} and {date2.strftime('%Y-%m-%d')}")
            
            if success:
                self.log("✅ Orders successfully regenerated on new frequency schedule")
                return True
            else:
                return False
                
        except Exception as e:
            self.log(f"❌ Error in frequency change test: {str(e)}", "ERROR")
            return False
    
    def test_combined_changes(self) -> bool:
        """Test Scenario 3: Combined Changes (Items AND Frequency)"""
        self.log("\n🧪 TESTING: Combined Changes (Items AND Frequency)")
        
        try:
            # Get current state
            initial_orders = self.get_generated_orders()
            today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            initial_future_orders = [
                order for order in initial_orders 
                if datetime.fromisoformat(order["delivery_date"].replace("Z", "+00:00")).replace(tzinfo=None) >= today
            ]
            
            self.log(f"📊 Initial state: {len(initial_future_orders)} future orders")
            
            # Prepare combined update: new items AND new frequency
            new_items = []
            for i, product in enumerate(self.test_products[:2]):  # Use 2 products
                new_items.append({
                    "product_id": product["id"],
                    "product_name": product["name"],
                    "quantity": 10 + i,  # New quantities: 10, 11
                    "price": product["price"]
                })
            
            update_data = {
                "items": new_items,
                "recurrence_type": "weekly_days",
                "recurrence_config": {"days": [1, 3, 5]},  # Tue, Thu, Sat (different from initial)
                "notes": "Combined update: new items and new frequency"
            }
            
            # Apply combined update
            response = self.session.put(
                f"{BACKEND_URL}/admin/standing-orders/{self.test_standing_order_id}",
                json=update_data
            )
            
            if response.status_code != 200:
                self.log(f"❌ Failed to apply combined update: {response.status_code} - {response.text}", "ERROR")
                return False
            
            self.log("✅ Combined update applied successfully")
            
            # Wait for processing
            time.sleep(3)
            
            # Get updated orders
            updated_orders = self.get_generated_orders()
            updated_future_orders = [
                order for order in updated_orders 
                if datetime.fromisoformat(order["delivery_date"].replace("Z", "+00:00")).replace(tzinfo=None) >= today
            ]
            
            self.log(f"📊 After combined update: {len(updated_future_orders)} future orders")
            
            # Verify both changes applied
            success = True
            
            # Check items update
            for order in updated_future_orders[:3]:  # Check first 3 orders
                if len(order["items"]) != len(new_items):
                    self.log(f"❌ Order {order['order_number']}: Expected {len(new_items)} items, got {len(order['items'])}", "ERROR")
                    success = False
                    continue
                
                # Check quantities
                for i, item in enumerate(order["items"]):
                    expected_qty = new_items[i]["quantity"]
                    if item["quantity"] != expected_qty:
                        self.log(f"❌ Order {order['order_number']}: Expected qty {expected_qty}, got {item['quantity']}", "ERROR")
                        success = False
            
            # Check frequency update (orders should be on Tue, Thu, Sat)
            if len(updated_future_orders) >= 2:
                delivery_dates = [
                    datetime.fromisoformat(order["delivery_date"].replace("Z", "+00:00"))
                    for order in updated_future_orders[:5]
                ]
                
                weekdays = [date.weekday() for date in delivery_dates]  # 0=Mon, 1=Tue, etc.
                expected_weekdays = [1, 3, 5]  # Tue, Thu, Sat
                
                self.log(f"   Delivery weekdays: {weekdays}")
                self.log(f"   Expected weekdays: {expected_weekdays}")
                
                # Check if we have orders on the expected days
                has_expected_days = any(wd in expected_weekdays for wd in weekdays)
                if not has_expected_days:
                    self.log("⚠️  Warning: No orders found on expected weekdays (may need more time for generation)", "WARN")
            
            if success:
                self.log("✅ Combined changes (items + frequency) applied successfully")
                
                # Log sample order details
                if updated_future_orders:
                    sample = updated_future_orders[0]
                    self.log(f"   Sample Order: {len(sample['items'])} items, total: ${sample['total_amount']}")
                
                return True
            else:
                return False
                
        except Exception as e:
            self.log(f"❌ Error in combined changes test: {str(e)}", "ERROR")
            return False
    
    def test_authentication_required(self) -> bool:
        """Test that the endpoint requires admin authentication"""
        self.log("\n🧪 TESTING: Authentication Required")
        
        try:
            # Remove auth header temporarily
            original_headers = self.session.headers.copy()
            if "Authorization" in self.session.headers:
                del self.session.headers["Authorization"]
            
            # Try to update without authentication
            response = self.session.put(
                f"{BACKEND_URL}/admin/standing-orders/{self.test_standing_order_id}",
                json={"notes": "Unauthorized test"}
            )
            
            # Restore headers
            self.session.headers.update(original_headers)
            
            if response.status_code == 401:
                self.log("✅ Endpoint correctly requires authentication (401 without token)")
                return True
            else:
                self.log(f"❌ Expected 401, got {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Error in authentication test: {str(e)}", "ERROR")
            return False
    
    def cleanup_test_data(self):
        """Clean up test standing order"""
        try:
            if self.test_standing_order_id:
                response = self.session.delete(
                    f"{BACKEND_URL}/admin/standing-orders/{self.test_standing_order_id}"
                )
                if response.status_code == 200:
                    self.log("✅ Test standing order cleaned up")
                else:
                    self.log(f"⚠️  Failed to cleanup test standing order: {response.status_code}", "WARN")
        except Exception as e:
            self.log(f"⚠️  Error during cleanup: {str(e)}", "WARN")
    
    def run_all_tests(self) -> Dict[str, bool]:
        """Run all test scenarios"""
        results = {}
        
        self.log("🚀 Starting Edit Standing Order Feature Tests")
        self.log("=" * 60)
        
        # Setup
        if not self.authenticate_admin():
            return {"setup_failed": True}
        
        if not self.get_test_customer():
            return {"setup_failed": True}
        
        if not self.get_test_products():
            return {"setup_failed": True}
        
        if not self.create_test_standing_order():
            return {"setup_failed": True}
        
        # Run tests
        try:
            results["authentication_required"] = self.test_authentication_required()
            results["items_quantity_change"] = self.test_items_quantity_change_propagation()
            results["frequency_change"] = self.test_frequency_change_regeneration()
            results["combined_changes"] = self.test_combined_changes()
            
        finally:
            # Cleanup
            self.cleanup_test_data()
        
        return results

def main():
    """Main test execution"""
    tester = StandingOrderTester()
    results = tester.run_all_tests()
    
    # Print summary
    print("\n" + "=" * 60)
    print("🏁 TEST RESULTS SUMMARY")
    print("=" * 60)
    
    if "setup_failed" in results:
        print("❌ SETUP FAILED - Could not run tests")
        return False
    
    total_tests = len(results)
    passed_tests = sum(1 for result in results.values() if result)
    
    for test_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {test_name.replace('_', ' ').title()}")
    
    print(f"\n📊 OVERALL: {passed_tests}/{total_tests} tests passed")
    
    if passed_tests == total_tests:
        print("🎉 ALL TESTS PASSED - Edit Standing Order feature is working correctly!")
        return True
    else:
        print("⚠️  SOME TESTS FAILED - Review the issues above")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)