#!/usr/bin/env python3
"""
Backend Testing Suite for Razorpay Payment Flow - Cart Persistence During OTP Verification

This test suite verifies:
1. New GET /api/transactions/{transaction_id} endpoint
2. Webhook properly sets order_created flag when creating orders
3. Complete payment flow from transaction creation to order confirmation

Test Scenarios:
- Transaction status endpoint functionality
- Webhook order creation flag setting
- Complete payment flow integration
- Authentication and authorization checks
"""

import asyncio
import json
import requests
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import sys
import os

# Configuration
BASE_URL = "https://shopbugfix.preview.emergentagent.com/api"
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"

class BackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.test_user_token = None
        self.test_user_id = None
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, message: str, details: Dict = None):
        """Log test results"""
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
        """Authenticate as admin user"""
        try:
            response = self.session.post(f"{BASE_URL}/auth/login", json={
                "username": ADMIN_USERNAME,
                "password": ADMIN_PASSWORD
            })
            
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data["access_token"]
                self.session.headers.update({"Authorization": f"Bearer {self.admin_token}"})
                self.log_test("Admin Authentication", True, "Successfully authenticated as admin")
                return True
            else:
                self.log_test("Admin Authentication", False, f"Failed to authenticate: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Admin Authentication", False, f"Exception during admin auth: {str(e)}")
            return False

    def create_test_customer(self) -> bool:
        """Create a test customer for testing"""
        try:
            # Generate unique test data
            timestamp = int(datetime.now().timestamp())
            test_username = f"testcustomer_{timestamp}"
            test_email = f"test_{timestamp}@example.com"
            test_phone = f"+919876543{timestamp % 1000:03d}"
            
            customer_data = {
                "username": test_username,
                "email": test_email,
                "phone": test_phone,
                "password": "testpass123",
                "business_name": "Test Business",
                "address": "Test Address, Test City",
                "can_topup_wallet": True
            }
            
            response = self.session.post(f"{BASE_URL}/auth/register", json=customer_data)
            
            if response.status_code == 200:
                user_data = response.json()
                self.test_user_id = user_data["id"]
                
                # Approve the customer (admin action) - use admin token
                admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
                approve_response = self.session.put(f"{BASE_URL}/admin/users/{self.test_user_id}/approve", 
                                                  headers=admin_headers)
                
                if approve_response.status_code == 200:
                    # Login as test customer (create new session for customer)
                    customer_session = requests.Session()
                    login_response = customer_session.post(f"{BASE_URL}/auth/login", json={
                        "username": test_username,
                        "password": "testpass123"
                    })
                    
                    if login_response.status_code == 200:
                        login_data = login_response.json()
                        self.test_user_token = login_data["access_token"]
                        self.log_test("Test Customer Creation", True, f"Created and authenticated test customer: {test_username}")
                        return True
                    else:
                        self.log_test("Test Customer Creation", False, f"Failed to login as customer: {login_response.status_code} - {login_response.text}")
                        return False
                else:
                    self.log_test("Test Customer Creation", False, f"Failed to approve customer: {approve_response.status_code} - {approve_response.text}")
                    return False
                
            self.log_test("Test Customer Creation", False, f"Failed to create test customer: {response.status_code} - {response.text}")
            return False
            
        except Exception as e:
            self.log_test("Test Customer Creation", False, f"Exception during customer creation: {str(e)}")
            return False

    def test_transaction_status_endpoint_structure(self) -> bool:
        """Test Scenario 1: New Transaction Status Endpoint Structure"""
        try:
            # First create a test transaction (wallet topup)
            headers = {"Authorization": f"Bearer {self.test_user_token}"}
            
            transaction_data = {
                "amount": 100.0,
                "transaction_type": "wallet_topup",
                "notes": {"test": "transaction_status_test"}
            }
            
            response = self.session.post(f"{BASE_URL}/payments/create-order", 
                                       json=transaction_data, headers=headers)
            
            if response.status_code != 200:
                self.log_test("Transaction Status Endpoint - Create Transaction", False, 
                            f"Failed to create test transaction: {response.status_code} - {response.text}")
                return False
            
            transaction_response = response.json()
            transaction_id = transaction_response.get("transaction_id")
            
            if not transaction_id:
                self.log_test("Transaction Status Endpoint - Transaction ID", False, 
                            "No transaction_id in response")
                return False
            
            # Test GET /api/transactions/{transaction_id}
            status_response = self.session.get(f"{BASE_URL}/transactions/{transaction_id}", 
                                             headers=headers)
            
            if status_response.status_code == 200:
                status_data = status_response.json()
                
                # Verify required fields
                required_fields = ["id", "status", "transaction_type", "amount", "created_at", "order_created"]
                missing_fields = [field for field in required_fields if field not in status_data]
                
                if not missing_fields:
                    self.log_test("Transaction Status Endpoint - Structure", True, 
                                "All required fields present in response", 
                                {"fields": list(status_data.keys()), "transaction_id": transaction_id})
                    return True
                else:
                    self.log_test("Transaction Status Endpoint - Structure", False, 
                                f"Missing required fields: {missing_fields}", 
                                {"response": status_data})
                    return False
            else:
                self.log_test("Transaction Status Endpoint - Structure", False, 
                            f"Failed to get transaction status: {status_response.status_code} - {status_response.text}")
                return False
                
        except Exception as e:
            self.log_test("Transaction Status Endpoint - Structure", False, f"Exception: {str(e)}")
            return False

    def test_transaction_status_authentication(self) -> bool:
        """Test authentication requirements for transaction status endpoint"""
        try:
            # Create a transaction first
            headers = {"Authorization": f"Bearer {self.test_user_token}"}
            
            transaction_data = {
                "amount": 50.0,
                "transaction_type": "wallet_topup",
                "notes": {"test": "auth_test"}
            }
            
            response = self.session.post(f"{BASE_URL}/payments/create-order", 
                                       json=transaction_data, headers=headers)
            
            if response.status_code != 200:
                self.log_test("Transaction Status Auth - Setup", False, "Failed to create test transaction")
                return False
            
            transaction_id = response.json().get("transaction_id")
            
            # Test 1: No auth token (should return 401)
            no_auth_response = self.session.get(f"{BASE_URL}/transactions/{transaction_id}")
            
            if no_auth_response.status_code != 401:
                self.log_test("Transaction Status Auth - No Token", False, 
                            f"Expected 401, got {no_auth_response.status_code}")
                return False
            
            # Test 2: Valid auth token (should return 200)
            valid_auth_response = self.session.get(f"{BASE_URL}/transactions/{transaction_id}", 
                                                 headers=headers)
            
            if valid_auth_response.status_code != 200:
                self.log_test("Transaction Status Auth - Valid Token", False, 
                            f"Expected 200, got {valid_auth_response.status_code}")
                return False
            
            # Test 3: Invalid transaction ID (should return 404)
            invalid_id_response = self.session.get(f"{BASE_URL}/transactions/invalid-id", 
                                                 headers=headers)
            
            if invalid_id_response.status_code != 404:
                self.log_test("Transaction Status Auth - Invalid ID", False, 
                            f"Expected 404, got {invalid_id_response.status_code}")
                return False
            
            self.log_test("Transaction Status Authentication", True, 
                        "All authentication scenarios working correctly")
            return True
            
        except Exception as e:
            self.log_test("Transaction Status Authentication", False, f"Exception: {str(e)}")
            return False

    def test_webhook_order_creation_flag(self) -> bool:
        """Test Scenario 2: Webhook Order Creation Flag"""
        try:
            # Create an order payment transaction
            headers = {"Authorization": f"Bearer {self.test_user_token}"}
            
            # Prepare order data
            order_data = {
                "customer_id": self.test_user_id,
                "items": [
                    {
                        "product_id": "test-product-1",
                        "product_name": "Test Product",
                        "quantity": 2,
                        "unit_price": 50.0,
                        "total_price": 100.0
                    }
                ],
                "total_amount": 100.0,
                "delivery_date": (datetime.now() + timedelta(days=1)).isoformat(),
                "delivery_address": "Test Delivery Address"
            }
            
            transaction_data = {
                "amount": 100.0,
                "transaction_type": "order_payment",
                "notes": {
                    "order_data": order_data,
                    "test": "webhook_test"
                }
            }
            
            # Create payment transaction
            response = self.session.post(f"{BASE_URL}/payments/create-order", 
                                       json=transaction_data, headers=headers)
            
            if response.status_code != 200:
                self.log_test("Webhook Order Flag - Create Transaction", False, 
                            f"Failed to create order payment transaction: {response.status_code} - {response.text}")
                return False
            
            transaction_response = response.json()
            transaction_id = transaction_response.get("transaction_id")
            payment_link_id = transaction_response.get("payment_link_id")
            
            # Check initial transaction status (should have order_created=false)
            status_response = self.session.get(f"{BASE_URL}/transactions/{transaction_id}", 
                                             headers=headers)
            
            if status_response.status_code == 200:
                initial_status = status_response.json()
                if initial_status.get("order_created") != False:
                    self.log_test("Webhook Order Flag - Initial State", False, 
                                f"Expected order_created=false initially, got {initial_status.get('order_created')}")
                    return False
            
            # Simulate webhook payload for payment_link.paid event
            webhook_payload = {
                "event": "payment_link.paid",
                "payload": {
                    "payment_link": {
                        "entity": {
                            "id": payment_link_id,
                            "reference_id": f"txn_{self.test_user_id[:8]}_{int(datetime.now().timestamp())}",
                            "amount": 10000,  # Amount in paise
                            "status": "paid"
                        }
                    }
                }
            }
            
            # Send webhook
            webhook_response = self.session.post(f"{BASE_URL}/payments/webhook", 
                                               json=webhook_payload)
            
            if webhook_response.status_code not in [200, 201]:
                self.log_test("Webhook Order Flag - Webhook Call", False, 
                            f"Webhook failed: {webhook_response.status_code} - {webhook_response.text}")
                return False
            
            # Check transaction status after webhook (should have order_created=true)
            final_status_response = self.session.get(f"{BASE_URL}/transactions/{transaction_id}", 
                                                   headers=headers)
            
            if final_status_response.status_code == 200:
                final_status = final_status_response.json()
                
                if final_status.get("order_created") == True and final_status.get("status") == "success":
                    self.log_test("Webhook Order Creation Flag", True, 
                                "Webhook correctly sets order_created=true for order payments", 
                                {"transaction_id": transaction_id, "final_status": final_status})
                    return True
                else:
                    self.log_test("Webhook Order Creation Flag", False, 
                                f"Expected order_created=true and status=success, got order_created={final_status.get('order_created')}, status={final_status.get('status')}")
                    return False
            else:
                self.log_test("Webhook Order Creation Flag", False, 
                            f"Failed to get final transaction status: {final_status_response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Webhook Order Creation Flag", False, f"Exception: {str(e)}")
            return False

    def test_wallet_topup_no_order_flag(self) -> bool:
        """Test that wallet topup transactions do NOT set order_created flag"""
        try:
            headers = {"Authorization": f"Bearer {self.test_user_token}"}
            
            # Create wallet topup transaction
            transaction_data = {
                "amount": 75.0,
                "transaction_type": "wallet_topup",
                "notes": {"test": "wallet_topup_test"}
            }
            
            response = self.session.post(f"{BASE_URL}/payments/create-order", 
                                       json=transaction_data, headers=headers)
            
            if response.status_code != 200:
                self.log_test("Wallet Topup No Order Flag - Create Transaction", False, 
                            f"Failed to create wallet topup transaction: {response.status_code}")
                return False
            
            transaction_response = response.json()
            transaction_id = transaction_response.get("transaction_id")
            payment_link_id = transaction_response.get("payment_link_id")
            
            # Simulate webhook for wallet topup
            webhook_payload = {
                "event": "payment_link.paid",
                "payload": {
                    "payment_link": {
                        "entity": {
                            "id": payment_link_id,
                            "reference_id": f"txn_{self.test_user_id[:8]}_{int(datetime.now().timestamp())}",
                            "amount": 7500,  # Amount in paise
                            "status": "paid"
                        }
                    }
                }
            }
            
            # Send webhook
            webhook_response = self.session.post(f"{BASE_URL}/payments/webhook", 
                                               json=webhook_payload)
            
            if webhook_response.status_code not in [200, 201]:
                self.log_test("Wallet Topup No Order Flag - Webhook", False, 
                            f"Webhook failed: {webhook_response.status_code}")
                return False
            
            # Check final status
            status_response = self.session.get(f"{BASE_URL}/transactions/{transaction_id}", 
                                             headers=headers)
            
            if status_response.status_code == 200:
                status_data = status_response.json()
                
                if status_data.get("order_created") == False and status_data.get("status") == "success":
                    self.log_test("Wallet Topup No Order Flag", True, 
                                "Wallet topup correctly does NOT set order_created flag", 
                                {"transaction_id": transaction_id, "status": status_data})
                    return True
                else:
                    self.log_test("Wallet Topup No Order Flag", False, 
                                f"Expected order_created=false, got {status_data.get('order_created')}")
                    return False
            else:
                self.log_test("Wallet Topup No Order Flag", False, 
                            f"Failed to get transaction status: {status_response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Wallet Topup No Order Flag", False, f"Exception: {str(e)}")
            return False

    def test_complete_payment_flow_integration(self) -> bool:
        """Test Scenario 3: Complete Payment Flow Integration"""
        try:
            headers = {"Authorization": f"Bearer {self.test_user_token}"}
            
            # Step 1: Create order payment transaction
            order_data = {
                "customer_id": self.test_user_id,
                "items": [
                    {
                        "product_id": "integration-test-product",
                        "product_name": "Integration Test Product",
                        "quantity": 1,
                        "unit_price": 150.0,
                        "total_price": 150.0
                    }
                ],
                "total_amount": 150.0,
                "delivery_date": (datetime.now() + timedelta(days=2)).isoformat(),
                "delivery_address": "Integration Test Address"
            }
            
            transaction_data = {
                "amount": 150.0,
                "transaction_type": "order_payment",
                "notes": {
                    "order_data": order_data,
                    "test": "integration_test"
                }
            }
            
            create_response = self.session.post(f"{BASE_URL}/payments/create-order", 
                                              json=transaction_data, headers=headers)
            
            if create_response.status_code != 200:
                self.log_test("Complete Flow Integration - Create Payment", False, 
                            f"Failed to create payment: {create_response.status_code}")
                return False
            
            payment_data = create_response.json()
            transaction_id = payment_data.get("transaction_id")
            payment_link_id = payment_data.get("payment_link_id")
            
            # Step 2: Verify initial transaction status
            initial_status_response = self.session.get(f"{BASE_URL}/transactions/{transaction_id}", 
                                                     headers=headers)
            
            if initial_status_response.status_code != 200:
                self.log_test("Complete Flow Integration - Initial Status", False, 
                            f"Failed to get initial status: {initial_status_response.status_code}")
                return False
            
            initial_status = initial_status_response.json()
            if initial_status.get("status") != "pending" or initial_status.get("order_created") != False:
                self.log_test("Complete Flow Integration - Initial Status Check", False, 
                            f"Unexpected initial status: {initial_status}")
                return False
            
            # Step 3: Simulate webhook callback
            webhook_payload = {
                "event": "payment_link.paid",
                "payload": {
                    "payment_link": {
                        "entity": {
                            "id": payment_link_id,
                            "reference_id": f"txn_{self.test_user_id[:8]}_{int(datetime.now().timestamp())}",
                            "amount": 15000,  # Amount in paise
                            "status": "paid"
                        }
                    }
                }
            }
            
            webhook_response = self.session.post(f"{BASE_URL}/payments/webhook", 
                                               json=webhook_payload)
            
            if webhook_response.status_code not in [200, 201]:
                self.log_test("Complete Flow Integration - Webhook", False, 
                            f"Webhook failed: {webhook_response.status_code}")
                return False
            
            # Step 4: Verify final transaction status
            final_status_response = self.session.get(f"{BASE_URL}/transactions/{transaction_id}", 
                                                   headers=headers)
            
            if final_status_response.status_code != 200:
                self.log_test("Complete Flow Integration - Final Status", False, 
                            f"Failed to get final status: {final_status_response.status_code}")
                return False
            
            final_status = final_status_response.json()
            
            # Step 5: Verify order was created in database
            orders_response = self.session.get(f"{BASE_URL}/orders", headers=headers)
            
            if orders_response.status_code != 200:
                self.log_test("Complete Flow Integration - Orders Check", False, 
                            f"Failed to get orders: {orders_response.status_code}")
                return False
            
            orders = orders_response.json()
            
            # Find the order created by this transaction
            created_order = None
            for order in orders:
                if order.get("total_amount") == 150.0 and "integration-test-product" in str(order.get("items", [])):
                    created_order = order
                    break
            
            # Verify all conditions
            success_conditions = [
                (final_status.get("status") == "success", "Transaction status is success"),
                (final_status.get("order_created") == True, "Transaction has order_created=true"),
                (created_order is not None, "Order was created in database"),
                (created_order and created_order.get("user_id") == self.test_user_id, "Order belongs to correct user") if created_order else (False, "Order not found")
            ]
            
            all_passed = all(condition[0] for condition in success_conditions)
            
            if all_passed:
                self.log_test("Complete Payment Flow Integration", True, 
                            "Complete payment flow working correctly", 
                            {
                                "transaction_id": transaction_id,
                                "final_status": final_status,
                                "order_created": created_order is not None,
                                "order_id": created_order.get("id") if created_order else None
                            })
                return True
            else:
                failed_conditions = [condition[1] for condition in success_conditions if not condition[0]]
                self.log_test("Complete Payment Flow Integration", False, 
                            f"Failed conditions: {failed_conditions}", 
                            {"final_status": final_status, "orders_count": len(orders)})
                return False
                
        except Exception as e:
            self.log_test("Complete Payment Flow Integration", False, f"Exception: {str(e)}")
            return False

    def cleanup_test_data(self):
        """Clean up test data"""
        try:
            if self.test_user_id and self.admin_token:
                # Delete test user
                headers = {"Authorization": f"Bearer {self.admin_token}"}
                delete_response = self.session.delete(f"{BASE_URL}/admin/users/{self.test_user_id}", 
                                                    headers=headers)
                
                if delete_response.status_code in [200, 204, 404]:
                    self.log_test("Cleanup", True, "Test user cleaned up successfully")
                else:
                    self.log_test("Cleanup", False, f"Failed to cleanup test user: {delete_response.status_code}")
        except Exception as e:
            self.log_test("Cleanup", False, f"Exception during cleanup: {str(e)}")

    def run_all_tests(self):
        """Run all test scenarios"""
        print("🚀 Starting Razorpay Payment Flow Backend Testing")
        print("=" * 60)
        
        # Setup
        if not self.authenticate_admin():
            print("❌ Cannot proceed without admin authentication")
            return False
        
        if not self.create_test_customer():
            print("❌ Cannot proceed without test customer")
            return False
        
        # Test scenarios
        test_methods = [
            self.test_transaction_status_endpoint_structure,
            self.test_transaction_status_authentication,
            self.test_webhook_order_creation_flag,
            self.test_wallet_topup_no_order_flag,
            self.test_complete_payment_flow_integration
        ]
        
        passed_tests = 0
        total_tests = len(test_methods)
        
        for test_method in test_methods:
            try:
                if test_method():
                    passed_tests += 1
            except Exception as e:
                print(f"❌ EXCEPTION in {test_method.__name__}: {str(e)}")
        
        # Cleanup
        self.cleanup_test_data()
        
        # Summary
        print("=" * 60)
        print(f"🎯 TEST SUMMARY: {passed_tests}/{total_tests} tests passed")
        
        if passed_tests == total_tests:
            print("🎉 ALL TESTS PASSED! Razorpay payment flow fix is working correctly.")
            return True
        else:
            print(f"⚠️  {total_tests - passed_tests} tests failed. Review the issues above.")
            return False

def main():
    """Main test execution"""
    tester = BackendTester()
    success = tester.run_all_tests()
    
    # Print detailed results
    print("\n" + "=" * 60)
    print("📋 DETAILED TEST RESULTS:")
    print("=" * 60)
    
    for result in tester.test_results:
        status = "✅" if result["success"] else "❌"
        print(f"{status} {result['test']}")
        print(f"   {result['message']}")
        if result.get("details"):
            print(f"   Details: {result['details']}")
        print()
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())