#!/usr/bin/env python3
"""
Backend Testing Suite for Divine Cakery Payment Webhook
Tests the critical payment webhook fix to ensure order payments are correctly differentiated from wallet top-ups.
"""

import requests
import json
import uuid
from datetime import datetime, timedelta
import time
import os
from typing import Dict, Any, List

# Configuration
BACKEND_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://cakeryflow.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

# Admin credentials
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"

class BackendTester:
    def __init__(self):
        self.admin_token = None
        self.test_user_id = None
        self.test_user_token = None
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
        print(f"{status}: {test_name} - {message}")
        if details:
            print(f"   Details: {details}")
    
    def authenticate_admin(self) -> bool:
        """Authenticate as admin"""
        try:
            response = requests.post(f"{API_BASE}/auth/login", json={
                "username": ADMIN_USERNAME,
                "password": ADMIN_PASSWORD
            })
            
            if response.status_code == 200:
                self.admin_token = response.json()["access_token"]
                self.log_result("Admin Authentication", True, "Successfully authenticated as admin")
                return True
            else:
                self.log_result("Admin Authentication", False, f"Failed with status {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_result("Admin Authentication", False, f"Exception: {str(e)}")
            return False
    
    def create_test_user(self) -> bool:
        """Create a test user for testing"""
        try:
            test_username = f"testuser_{int(time.time())}"
            user_data = {
                "username": test_username,
                "password": "testpass123",
                "email": f"{test_username}@test.com",
                "phone": "+919876543210",
                "business_name": "Test Business",
                "address": "Test Address, Test City",
                "can_topup_wallet": True
            }
            
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = requests.post(f"{API_BASE}/admin/users", json=user_data, headers=headers)
            
            if response.status_code == 200:
                user = response.json()
                self.test_user_id = user["id"]
                
                # Login as test user to get token
                login_response = requests.post(f"{API_BASE}/auth/login", json={
                    "username": test_username,
                    "password": "testpass123"
                })
                
                if login_response.status_code == 200:
                    self.test_user_token = login_response.json()["access_token"]
                    self.log_result("Test User Creation", True, f"Created test user: {test_username}")
                    return True
                else:
                    self.log_result("Test User Creation", False, f"Failed to login as test user: {login_response.text}")
                    return False
            else:
                self.log_result("Test User Creation", False, f"Failed with status {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_result("Test User Creation", False, f"Exception: {str(e)}")
            return False
    
    def get_wallet_balance(self, user_token: str) -> float:
        """Get current wallet balance for a user"""
        try:
            headers = {"Authorization": f"Bearer {user_token}"}
            response = requests.get(f"{API_BASE}/wallet", headers=headers)
            
            if response.status_code == 200:
                return response.json()["balance"]
            else:
                return 0.0
        except Exception:
            return 0.0
    
    def get_orders_count(self, user_id: str) -> int:
        """Get count of orders for a user"""
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = requests.get(f"{API_BASE}/orders", headers=headers)
            
            if response.status_code == 200:
                orders = response.json()
                user_orders = [order for order in orders if order.get("user_id") == user_id]
                return len(user_orders)
            else:
                return 0
        except Exception:
            return 0
    
    def create_payment_order(self, amount: float, transaction_type: str, notes: Dict = None) -> Dict:
        """Create a payment order"""
        try:
            headers = {"Authorization": f"Bearer {self.test_user_token}"}
            payment_data = {
                "amount": amount,
                "transaction_type": transaction_type,
                "notes": notes or {}
            }
            
            response = requests.post(f"{API_BASE}/payments/create-order", json=payment_data, headers=headers)
            
            if response.status_code == 200:
                return response.json()
            else:
                raise Exception(f"Failed to create payment order: {response.status_code} - {response.text}")
        except Exception as e:
            raise Exception(f"Exception creating payment order: {str(e)}")
    
    def simulate_webhook_callback(self, payment_link_id: str, transaction_id: str) -> bool:
        """Simulate Razorpay webhook callback"""
        try:
            webhook_payload = {
                "event": "payment_link.paid",
                "payload": {
                    "payment_link": {
                        "entity": {
                            "id": payment_link_id,
                            "reference_id": transaction_id,
                            "amount": 10000  # 100.00 in paise
                        }
                    }
                }
            }
            
            response = requests.post(f"{API_BASE}/payments/webhook", json=webhook_payload)
            
            if response.status_code == 200:
                return True
            else:
                print(f"Webhook failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"Exception in webhook: {str(e)}")
            return False
    
    def test_order_payment_flow(self) -> bool:
        """Test 1: Order Payment Flow - Should create order, not update wallet"""
        try:
            print("\n🧪 Testing Order Payment Flow...")
            
            # Get initial state
            initial_wallet = self.get_wallet_balance(self.test_user_token)
            initial_orders = self.get_orders_count(self.test_user_id)
            
            # Create order data
            delivery_date = (datetime.now() + timedelta(days=1)).isoformat()
            order_data = {
                "customer_id": self.test_user_id,
                "items": [
                    {
                        "product_id": "test_product_1",
                        "product_name": "Test Cake",
                        "quantity": 2,
                        "price": 50.0,
                        "subtotal": 100.0
                    }
                ],
                "total_amount": 100.0,
                "delivery_date": delivery_date,
                "delivery_address": "Test Delivery Address",
                "delivery_notes": "Test delivery notes",
                "payment_method": "razorpay",
                "onsite_pickup": False
            }
            
            # Create payment order with order_payment type
            payment_response = self.create_payment_order(
                amount=100.0,
                transaction_type="order_payment",
                notes={"order_data": order_data}
            )
            
            payment_link_id = payment_response["payment_link_id"]
            transaction_id = payment_response["transaction_id"]
            
            # Simulate successful webhook
            webhook_success = self.simulate_webhook_callback(payment_link_id, transaction_id)
            
            if not webhook_success:
                self.log_result("Order Payment Flow", False, "Webhook simulation failed")
                return False
            
            # Wait a moment for processing
            time.sleep(2)
            
            # Check results
            final_wallet = self.get_wallet_balance(self.test_user_token)
            final_orders = self.get_orders_count(self.test_user_id)
            
            # Verify wallet was NOT updated
            wallet_unchanged = abs(final_wallet - initial_wallet) < 0.01
            
            # Verify order was created
            order_created = final_orders > initial_orders
            
            if wallet_unchanged and order_created:
                self.log_result("Order Payment Flow", True, 
                    "✅ Order payment correctly created order without updating wallet",
                    {
                        "wallet_before": initial_wallet,
                        "wallet_after": final_wallet,
                        "orders_before": initial_orders,
                        "orders_after": final_orders,
                        "payment_link_id": payment_link_id
                    })
                return True
            else:
                self.log_result("Order Payment Flow", False,
                    f"❌ Incorrect behavior - Wallet unchanged: {wallet_unchanged}, Order created: {order_created}",
                    {
                        "wallet_before": initial_wallet,
                        "wallet_after": final_wallet,
                        "orders_before": initial_orders,
                        "orders_after": final_orders
                    })
                return False
                
        except Exception as e:
            self.log_result("Order Payment Flow", False, f"Exception: {str(e)}")
            return False
    
    def test_wallet_topup_flow(self) -> bool:
        """Test 2: Wallet Top-up Flow - Should update wallet, not create order"""
        try:
            print("\n🧪 Testing Wallet Top-up Flow...")
            
            # Get initial state
            initial_wallet = self.get_wallet_balance(self.test_user_token)
            initial_orders = self.get_orders_count(self.test_user_id)
            
            # Create payment order with wallet_topup type
            payment_response = self.create_payment_order(
                amount=50.0,
                transaction_type="wallet_topup",
                notes={}
            )
            
            payment_link_id = payment_response["payment_link_id"]
            transaction_id = payment_response["transaction_id"]
            
            # Simulate successful webhook
            webhook_success = self.simulate_webhook_callback(payment_link_id, transaction_id)
            
            if not webhook_success:
                self.log_result("Wallet Top-up Flow", False, "Webhook simulation failed")
                return False
            
            # Wait a moment for processing
            time.sleep(2)
            
            # Check results
            final_wallet = self.get_wallet_balance(self.test_user_token)
            final_orders = self.get_orders_count(self.test_user_id)
            
            # Verify wallet was updated
            wallet_increased = (final_wallet - initial_wallet) >= 49.0  # Allow small floating point differences
            
            # Verify no order was created
            no_order_created = final_orders == initial_orders
            
            if wallet_increased and no_order_created:
                self.log_result("Wallet Top-up Flow", True,
                    "✅ Wallet top-up correctly updated wallet without creating order",
                    {
                        "wallet_before": initial_wallet,
                        "wallet_after": final_wallet,
                        "wallet_increase": final_wallet - initial_wallet,
                        "orders_before": initial_orders,
                        "orders_after": final_orders,
                        "payment_link_id": payment_link_id
                    })
                return True
            else:
                self.log_result("Wallet Top-up Flow", False,
                    f"❌ Incorrect behavior - Wallet increased: {wallet_increased}, No order created: {no_order_created}",
                    {
                        "wallet_before": initial_wallet,
                        "wallet_after": final_wallet,
                        "wallet_increase": final_wallet - initial_wallet,
                        "orders_before": initial_orders,
                        "orders_after": final_orders
                    })
                return False
                
        except Exception as e:
            self.log_result("Wallet Top-up Flow", False, f"Exception: {str(e)}")
            return False
    
    def test_transaction_differentiation(self) -> bool:
        """Test 3: Transaction Differentiation - Multiple transactions should be handled correctly"""
        try:
            print("\n🧪 Testing Transaction Differentiation...")
            
            # Get initial state
            initial_wallet = self.get_wallet_balance(self.test_user_token)
            initial_orders = self.get_orders_count(self.test_user_id)
            
            # Create both types of transactions
            transactions = []
            
            # 1. Wallet top-up
            topup_response = self.create_payment_order(
                amount=25.0,
                transaction_type="wallet_topup",
                notes={}
            )
            transactions.append(("wallet_topup", topup_response))
            
            # 2. Order payment
            delivery_date = (datetime.now() + timedelta(days=1)).isoformat()
            order_data = {
                "customer_id": self.test_user_id,
                "items": [
                    {
                        "product_id": "test_product_2",
                        "product_name": "Test Pastry",
                        "quantity": 1,
                        "price": 75.0,
                        "subtotal": 75.0
                    }
                ],
                "total_amount": 75.0,
                "delivery_date": delivery_date,
                "delivery_address": "Test Address 2",
                "payment_method": "razorpay",
                "onsite_pickup": False
            }
            
            order_response = self.create_payment_order(
                amount=75.0,
                transaction_type="order_payment",
                notes={"order_data": order_data}
            )
            transactions.append(("order_payment", order_response))
            
            # Process both webhooks
            for transaction_type, response in transactions:
                webhook_success = self.simulate_webhook_callback(
                    response["payment_link_id"],
                    response["transaction_id"]
                )
                if not webhook_success:
                    self.log_result("Transaction Differentiation", False, 
                        f"Webhook simulation failed for {transaction_type}")
                    return False
                time.sleep(1)  # Small delay between webhooks
            
            # Wait for processing
            time.sleep(3)
            
            # Check results
            final_wallet = self.get_wallet_balance(self.test_user_token)
            final_orders = self.get_orders_count(self.test_user_id)
            
            # Expected: wallet increased by 25.0, orders increased by 1
            expected_wallet_increase = 25.0
            expected_order_increase = 1
            
            actual_wallet_increase = final_wallet - initial_wallet
            actual_order_increase = final_orders - initial_orders
            
            wallet_correct = abs(actual_wallet_increase - expected_wallet_increase) < 1.0
            orders_correct = actual_order_increase == expected_order_increase
            
            if wallet_correct and orders_correct:
                self.log_result("Transaction Differentiation", True,
                    "✅ Both transaction types processed correctly",
                    {
                        "wallet_increase_expected": expected_wallet_increase,
                        "wallet_increase_actual": actual_wallet_increase,
                        "orders_increase_expected": expected_order_increase,
                        "orders_increase_actual": actual_order_increase,
                        "transactions_processed": len(transactions)
                    })
                return True
            else:
                self.log_result("Transaction Differentiation", False,
                    f"❌ Incorrect processing - Wallet correct: {wallet_correct}, Orders correct: {orders_correct}",
                    {
                        "wallet_increase_expected": expected_wallet_increase,
                        "wallet_increase_actual": actual_wallet_increase,
                        "orders_increase_expected": expected_order_increase,
                        "orders_increase_actual": actual_order_increase
                    })
                return False
                
        except Exception as e:
            self.log_result("Transaction Differentiation", False, f"Exception: {str(e)}")
            return False
    
    def test_order_data_completeness(self) -> bool:
        """Test 4: Order Data Completeness - Verify all order fields are properly saved"""
        try:
            print("\n🧪 Testing Order Data Completeness...")
            
            # Create comprehensive order data
            delivery_date = (datetime.now() + timedelta(days=2)).isoformat()
            order_data = {
                "customer_id": self.test_user_id,
                "items": [
                    {
                        "product_id": "test_product_3",
                        "product_name": "Test Birthday Cake",
                        "quantity": 1,
                        "price": 150.0,
                        "subtotal": 150.0
                    },
                    {
                        "product_id": "test_product_4", 
                        "product_name": "Test Cupcakes",
                        "quantity": 6,
                        "price": 25.0,
                        "subtotal": 150.0
                    }
                ],
                "total_amount": 300.0,
                "delivery_date": delivery_date,
                "delivery_address": "123 Test Street, Test City, 12345",
                "delivery_notes": "Please ring doorbell twice. Handle with care.",
                "payment_method": "razorpay",
                "onsite_pickup": False
            }
            
            # Create payment order
            payment_response = self.create_payment_order(
                amount=300.0,
                transaction_type="order_payment",
                notes={"order_data": order_data}
            )
            
            # Simulate webhook
            webhook_success = self.simulate_webhook_callback(
                payment_response["payment_link_id"],
                payment_response["transaction_id"]
            )
            
            if not webhook_success:
                self.log_result("Order Data Completeness", False, "Webhook simulation failed")
                return False
            
            # Wait for processing
            time.sleep(3)
            
            # Get all orders and find the new one
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = requests.get(f"{API_BASE}/orders", headers=headers)
            
            if response.status_code != 200:
                self.log_result("Order Data Completeness", False, "Failed to fetch orders")
                return False
            
            orders = response.json()
            user_orders = [order for order in orders if order.get("user_id") == self.test_user_id]
            
            if not user_orders:
                self.log_result("Order Data Completeness", False, "No orders found for test user")
                return False
            
            # Get the most recent order (should be our test order)
            latest_order = max(user_orders, key=lambda x: x.get("created_at", ""))
            
            # Verify order fields
            checks = {
                "customer_id_correct": latest_order.get("user_id") == self.test_user_id,
                "total_amount_correct": abs(latest_order.get("total_amount", 0) - 300.0) < 0.01,
                "payment_status_paid": latest_order.get("payment_status") == "paid",
                "order_status_pending": latest_order.get("order_status") == "pending",
                "items_count_correct": len(latest_order.get("items", [])) == 2,
                "delivery_address_saved": bool(latest_order.get("delivery_address")),
                "onsite_pickup_correct": latest_order.get("onsite_pickup") == False,
                "has_order_number": bool(latest_order.get("order_number"))
            }
            
            # Check delivery date conversion
            delivery_date_saved = latest_order.get("delivery_date")
            delivery_date_correct = bool(delivery_date_saved)  # Just check it exists
            checks["delivery_date_saved"] = delivery_date_correct
            
            all_checks_passed = all(checks.values())
            
            if all_checks_passed:
                self.log_result("Order Data Completeness", True,
                    "✅ All order data fields properly saved from transaction notes",
                    {
                        "order_id": latest_order.get("id"),
                        "order_number": latest_order.get("order_number"),
                        "checks_passed": checks,
                        "items_saved": len(latest_order.get("items", [])),
                        "delivery_address": latest_order.get("delivery_address")
                    })
                return True
            else:
                failed_checks = [k for k, v in checks.items() if not v]
                self.log_result("Order Data Completeness", False,
                    f"❌ Some order data fields missing or incorrect: {failed_checks}",
                    {
                        "checks_results": checks,
                        "failed_checks": failed_checks,
                        "order_data": latest_order
                    })
                return False
                
        except Exception as e:
            self.log_result("Order Data Completeness", False, f"Exception: {str(e)}")
            return False
    
    def cleanup_test_user(self):
        """Clean up test user"""
        try:
            if self.test_user_id and self.admin_token:
                headers = {"Authorization": f"Bearer {self.admin_token}"}
                response = requests.delete(f"{API_BASE}/admin/users/{self.test_user_id}", headers=headers)
                if response.status_code == 200:
                    print(f"✅ Cleaned up test user: {self.test_user_id}")
                else:
                    print(f"⚠️ Failed to cleanup test user: {response.status_code}")
        except Exception as e:
            print(f"⚠️ Exception during cleanup: {str(e)}")
    
    def run_all_tests(self):
        """Run all payment webhook tests"""
        print("🚀 Starting Payment Webhook Testing Suite")
        print("=" * 60)
        
        # Setup
        if not self.authenticate_admin():
            print("❌ Cannot proceed without admin authentication")
            return False
        
        if not self.create_test_user():
            print("❌ Cannot proceed without test user")
            return False
        
        # Run tests
        test_results = []
        
        test_results.append(self.test_order_payment_flow())
        test_results.append(self.test_wallet_topup_flow())
        test_results.append(self.test_transaction_differentiation())
        test_results.append(self.test_order_data_completeness())
        
        # Cleanup
        self.cleanup_test_user()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 PAYMENT WEBHOOK TEST RESULTS SUMMARY")
        print("=" * 60)
        
        passed = sum(test_results)
        total = len(test_results)
        
        for result in self.test_results:
            status = "✅ PASS" if result["success"] else "❌ FAIL"
            print(f"{status}: {result['test']}")
            if not result["success"]:
                print(f"   Error: {result['message']}")
        
        print(f"\n🎯 Overall Result: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 ALL TESTS PASSED! Payment webhook is working correctly.")
            print("✅ Order payments create orders without updating wallet")
            print("✅ Wallet top-ups update wallet without creating orders")
            print("✅ Transaction types are correctly differentiated")
            print("✅ Order data is completely saved from transaction notes")
        else:
            print("❌ SOME TESTS FAILED! Payment webhook needs attention.")
            failed_tests = [r["test"] for r in self.test_results if not r["success"]]
            print(f"Failed tests: {', '.join(failed_tests)}")
        
        return passed == total

def main():
    """Main test execution"""
    tester = BackendTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 Payment webhook testing completed successfully!")
        exit(0)
    else:
        print("\n❌ Payment webhook testing failed!")
        exit(1)

if __name__ == "__main__":
    main()