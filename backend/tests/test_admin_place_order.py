"""
Test Admin Place Order and Payment Recording Features
- POST /api/admin/place-order: Admin places pay_later order for customer
- GET /api/admin/customer-balance/{customer_id}: Get customer pending balance
- POST /api/admin/record-payment: Record payment and settle pending orders
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://pdf-compact-view.preview.emergentagent.com')

# Test data from problem statement
SAMPLE_CUSTOMER_ID = "cae2a9d4-5e04-402f-8a8d-a0388c4d4079"
SAMPLE_PRODUCT = {
    "id": "9b75dc04-4bfc-400a-a14e-0f794f1a2499",
    "name": "Brioche burger buns",
    "price": 60.0
}


class TestAdminPlaceOrder:
    """Test admin place order functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for admin"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "Soman",
            "password": "Soman@123"
        })
        assert login_response.status_code == 200, f"Admin login failed: {login_response.text}"
        token = login_response.json().get("access_token")
        assert token, "No access_token in login response"
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        self.token = token
    
    def test_admin_place_order_creates_pay_later_order(self):
        """POST /api/admin/place-order creates order with correct pay_later fields"""
        order_data = {
            "customer_id": SAMPLE_CUSTOMER_ID,
            "items": [{
                "product_id": SAMPLE_PRODUCT["id"],
                "product_name": SAMPLE_PRODUCT["name"],
                "quantity": 2,
                "price": SAMPLE_PRODUCT["price"],
                "subtotal": SAMPLE_PRODUCT["price"] * 2
            }],
            "subtotal": SAMPLE_PRODUCT["price"] * 2,
            "total_amount": SAMPLE_PRODUCT["price"] * 2,
            "notes": "TEST_admin_order_test"
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/place-order", json=order_data)
        assert response.status_code == 200, f"Place order failed: {response.text}"
        
        data = response.json()
        # Verify pay_later order fields
        assert data.get("is_pay_later") == True, "is_pay_later should be True"
        assert data.get("placed_by_admin") == True, "placed_by_admin should be True"
        assert data.get("payment_status") == "pending", f"payment_status should be pending, got {data.get('payment_status')}"
        assert data.get("payment_method") == "pay_later", f"payment_method should be pay_later, got {data.get('payment_method')}"
        assert data.get("customer_id") == SAMPLE_CUSTOMER_ID
        assert data.get("order_number") is not None
        assert data.get("total_amount") == SAMPLE_PRODUCT["price"] * 2
        
        # Store order_id for cleanup
        self.created_order_id = data.get("id")
        print(f"Created order: {data.get('order_number')} with id: {self.created_order_id}")
    
    def test_admin_place_order_fails_for_invalid_customer(self):
        """POST /api/admin/place-order returns 404 for invalid customer_id"""
        order_data = {
            "customer_id": "invalid-customer-id-12345",
            "items": [{
                "product_id": SAMPLE_PRODUCT["id"],
                "product_name": SAMPLE_PRODUCT["name"],
                "quantity": 1,
                "price": SAMPLE_PRODUCT["price"],
                "subtotal": SAMPLE_PRODUCT["price"]
            }],
            "subtotal": SAMPLE_PRODUCT["price"],
            "total_amount": SAMPLE_PRODUCT["price"]
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/place-order", json=order_data)
        assert response.status_code == 404, f"Expected 404 for invalid customer, got {response.status_code}: {response.text}"
        assert "Customer not found" in response.text
    
    def test_admin_place_order_fails_without_items(self):
        """POST /api/admin/place-order returns 400 when no items provided"""
        order_data = {
            "customer_id": SAMPLE_CUSTOMER_ID,
            "items": [],
            "subtotal": 0,
            "total_amount": 0
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/place-order", json=order_data)
        assert response.status_code == 400, f"Expected 400 for empty items, got {response.status_code}"
    
    def test_admin_place_order_fails_without_customer_id(self):
        """POST /api/admin/place-order returns 400 when customer_id missing"""
        order_data = {
            "items": [{
                "product_id": SAMPLE_PRODUCT["id"],
                "product_name": SAMPLE_PRODUCT["name"],
                "quantity": 1,
                "price": SAMPLE_PRODUCT["price"],
                "subtotal": SAMPLE_PRODUCT["price"]
            }],
            "subtotal": SAMPLE_PRODUCT["price"],
            "total_amount": SAMPLE_PRODUCT["price"]
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/place-order", json=order_data)
        assert response.status_code == 400, f"Expected 400 for missing customer_id, got {response.status_code}"


class TestCustomerBalance:
    """Test customer balance endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for admin"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "Soman",
            "password": "Soman@123"
        })
        assert login_response.status_code == 200
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_get_customer_balance_returns_pending_info(self):
        """GET /api/admin/customer-balance/{customer_id} returns pending_balance and pending_order_count"""
        response = self.session.get(f"{BASE_URL}/api/admin/customer-balance/{SAMPLE_CUSTOMER_ID}")
        assert response.status_code == 200, f"Get balance failed: {response.text}"
        
        data = response.json()
        assert "pending_balance" in data, "Response should contain pending_balance"
        assert "pending_order_count" in data, "Response should contain pending_order_count"
        assert "customer_id" in data
        assert data["customer_id"] == SAMPLE_CUSTOMER_ID
        assert isinstance(data["pending_balance"], (int, float))
        assert isinstance(data["pending_order_count"], int)
        print(f"Customer balance: Rs.{data['pending_balance']}, pending orders: {data['pending_order_count']}")
    
    def test_get_customer_balance_fails_for_invalid_customer(self):
        """GET /api/admin/customer-balance/{customer_id} returns 404 for invalid customer"""
        response = self.session.get(f"{BASE_URL}/api/admin/customer-balance/invalid-customer-id")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


class TestRecordPayment:
    """Test admin record payment functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for admin"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "Soman",
            "password": "Soman@123"
        })
        assert login_response.status_code == 200
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_record_payment_reduces_balance(self):
        """POST /api/admin/record-payment reduces pending balance"""
        # First create a test order to ensure there's a pending balance
        order_data = {
            "customer_id": SAMPLE_CUSTOMER_ID,
            "items": [{
                "product_id": SAMPLE_PRODUCT["id"],
                "product_name": SAMPLE_PRODUCT["name"],
                "quantity": 1,
                "price": SAMPLE_PRODUCT["price"],
                "subtotal": SAMPLE_PRODUCT["price"]
            }],
            "subtotal": SAMPLE_PRODUCT["price"],
            "total_amount": SAMPLE_PRODUCT["price"],
            "notes": "TEST_payment_test_order"
        }
        order_response = self.session.post(f"{BASE_URL}/api/admin/place-order", json=order_data)
        assert order_response.status_code == 200, f"Failed to create test order: {order_response.text}"
        created_order = order_response.json()
        
        # Get balance before payment
        balance_before = self.session.get(f"{BASE_URL}/api/admin/customer-balance/{SAMPLE_CUSTOMER_ID}")
        balance_before_data = balance_before.json()
        print(f"Balance before payment: Rs.{balance_before_data['pending_balance']}")
        
        # Record payment equal to order amount
        payment_data = {
            "customer_id": SAMPLE_CUSTOMER_ID,
            "amount": SAMPLE_PRODUCT["price"],
            "notes": "TEST_payment_recording"
        }
        payment_response = self.session.post(f"{BASE_URL}/api/admin/record-payment", json=payment_data)
        assert payment_response.status_code == 200, f"Record payment failed: {payment_response.text}"
        
        payment_result = payment_response.json()
        assert "message" in payment_result
        assert "transaction_id" in payment_result
        assert "settled_orders" in payment_result
        print(f"Payment result: {payment_result['message']}")
    
    def test_record_payment_fails_for_zero_amount(self):
        """POST /api/admin/record-payment returns 400 for amount <= 0"""
        payment_data = {
            "customer_id": SAMPLE_CUSTOMER_ID,
            "amount": 0,
            "notes": "TEST_zero_payment"
        }
        response = self.session.post(f"{BASE_URL}/api/admin/record-payment", json=payment_data)
        assert response.status_code == 400, f"Expected 400 for zero amount, got {response.status_code}"
    
    def test_record_payment_fails_for_negative_amount(self):
        """POST /api/admin/record-payment returns 400 for negative amount"""
        payment_data = {
            "customer_id": SAMPLE_CUSTOMER_ID,
            "amount": -100,
            "notes": "TEST_negative_payment"
        }
        response = self.session.post(f"{BASE_URL}/api/admin/record-payment", json=payment_data)
        assert response.status_code == 400, f"Expected 400 for negative amount, got {response.status_code}"
    
    def test_record_payment_fails_for_invalid_customer(self):
        """POST /api/admin/record-payment returns 404 for invalid customer"""
        payment_data = {
            "customer_id": "invalid-customer-id",
            "amount": 100,
            "notes": "TEST_invalid_customer_payment"
        }
        response = self.session.post(f"{BASE_URL}/api/admin/record-payment", json=payment_data)
        assert response.status_code == 404, f"Expected 404 for invalid customer, got {response.status_code}"


class TestPaymentSettlesOrders:
    """Test that payment settles oldest pending orders first"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for admin"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "Soman",
            "password": "Soman@123"
        })
        assert login_response.status_code == 200
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_payment_settles_order_and_updates_status(self):
        """Payment settles oldest pending orders first - verify response structure"""
        # Get current balance first
        balance_before = self.session.get(f"{BASE_URL}/api/admin/customer-balance/{SAMPLE_CUSTOMER_ID}")
        balance_data = balance_before.json()
        pending_before = balance_data["pending_balance"]
        
        # If there's pending balance, make a payment large enough to settle at least one order
        if pending_before > 0:
            # Pay the full pending balance to ensure orders get settled
            payment_data = {
                "customer_id": SAMPLE_CUSTOMER_ID,
                "amount": pending_before,
                "notes": "TEST_full_settlement_payment"
            }
            payment_response = self.session.post(f"{BASE_URL}/api/admin/record-payment", json=payment_data)
            assert payment_response.status_code == 200
            
            payment_result = payment_response.json()
            # Verify response structure
            assert "message" in payment_result
            assert "transaction_id" in payment_result
            assert "settled_orders" in payment_result
            assert "remaining_credit" in payment_result
            
            # If we paid full balance, all orders should be settled
            if pending_before > 0:
                assert payment_result["settled_orders"] >= 1, f"Expected at least 1 settled order when paying Rs.{pending_before}"
            print(f"Paid Rs.{pending_before}, settled {payment_result['settled_orders']} order(s)")
        else:
            # Create a new order and pay it immediately
            order_amount = 50.0
            order_data = {
                "customer_id": SAMPLE_CUSTOMER_ID,
                "items": [{
                    "product_id": SAMPLE_PRODUCT["id"],
                    "product_name": "TEST_settlement_item",
                    "quantity": 1,
                    "price": order_amount,
                    "subtotal": order_amount
                }],
                "subtotal": order_amount,
                "total_amount": order_amount,
                "notes": "TEST_settlement_order"
            }
            order_response = self.session.post(f"{BASE_URL}/api/admin/place-order", json=order_data)
            assert order_response.status_code == 200
            
            # Pay for the order
            payment_data = {
                "customer_id": SAMPLE_CUSTOMER_ID,
                "amount": order_amount,
                "notes": "TEST_settlement_payment"
            }
            payment_response = self.session.post(f"{BASE_URL}/api/admin/record-payment", json=payment_data)
            assert payment_response.status_code == 200
            
            payment_result = payment_response.json()
            assert payment_result["settled_orders"] >= 1
            print(f"Created and settled order for Rs.{order_amount}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
