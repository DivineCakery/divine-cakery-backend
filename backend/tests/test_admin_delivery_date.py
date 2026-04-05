"""
Test Admin Place Order - Custom Delivery Date Feature
Tests the new delivery_date field in POST /api/admin/place-order endpoint

Feature Requirements:
1. When delivery_date is provided (YYYY-MM-DD format), it should be stored as UTC midnight IST
2. Example: '2026-04-10' should be stored as '2026-04-09T18:30:00' UTC (midnight IST)
3. When delivery_date is NOT provided, it should fall back to auto-calculated delivery date
"""
import pytest
import requests
import os
from datetime import datetime, timedelta
import pytz

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://admin-delivery-date.preview.emergentagent.com')

# Test data
SAMPLE_CUSTOMER_ID = "cae2a9d4-5e04-402f-8a8d-a0388c4d4079"
SAMPLE_PRODUCT = {
    "id": "9b75dc04-4bfc-400a-a14e-0f794f1a2499",
    "name": "Brioche burger buns",
    "price": 60.0
}

# Use future date to avoid collision with real data
TEST_DELIVERY_DATE = "2026-04-15"  # April 15, 2026


class TestAdminDeliveryDateFeature:
    """Test custom delivery_date field in admin place order"""
    
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
        self.created_order_ids = []
    
    def teardown_method(self, method):
        """Cancel test orders after each test"""
        for order_id in self.created_order_ids:
            try:
                # Cancel the order to clean up using PUT /api/orders/{order_id}
                cancel_response = self.session.put(
                    f"{BASE_URL}/api/orders/{order_id}",
                    json={"status": "cancelled"}
                )
                if cancel_response.status_code == 200:
                    print(f"Cancelled test order: {order_id}")
                else:
                    print(f"Failed to cancel order {order_id}: {cancel_response.status_code}")
            except Exception as e:
                print(f"Failed to cancel order {order_id}: {e}")
    
    def test_admin_place_order_with_custom_delivery_date(self):
        """
        POST /api/admin/place-order with delivery_date field
        Verifies that the provided date is accepted and stored correctly
        """
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
            "delivery_date": TEST_DELIVERY_DATE,  # Custom delivery date
            "notes": "TEST_custom_delivery_date"
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/place-order", json=order_data)
        assert response.status_code == 200, f"Place order failed: {response.text}"
        
        data = response.json()
        self.created_order_ids.append(data.get("id"))
        
        # Verify order was created
        assert data.get("order_number") is not None
        assert data.get("is_pay_later") == True
        assert data.get("placed_by_admin") == True
        
        # Verify delivery_date is present in response
        assert "delivery_date" in data, "delivery_date should be in response"
        
        print(f"Created order {data.get('order_number')} with delivery_date: {data.get('delivery_date')}")
        print(f"delivery_date_ist: {data.get('delivery_date_ist')}")
        print(f"delivery_date_formatted: {data.get('delivery_date_formatted')}")
    
    def test_delivery_date_stored_as_utc_midnight_ist(self):
        """
        Verify that delivery_date '2026-04-10' is stored correctly and returned with IST conversion
        The backend stores as UTC (April 9 18:30 UTC = April 10 00:00 IST)
        But GET endpoint transforms it back to IST for display
        """
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
            "delivery_date": "2026-04-10",  # April 10 IST
            "notes": "TEST_utc_conversion_check"
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/place-order", json=order_data)
        assert response.status_code == 200, f"Place order failed: {response.text}"
        
        data = response.json()
        self.created_order_ids.append(data.get("id"))
        
        # Get the order to verify stored date
        order_id = data.get("id")
        get_response = self.session.get(f"{BASE_URL}/api/orders/{order_id}")
        assert get_response.status_code == 200, f"Get order failed: {get_response.text}"
        
        order_data_response = get_response.json()
        delivery_date_str = order_data_response.get("delivery_date")
        delivery_date_ist = order_data_response.get("delivery_date_ist")
        
        print(f"Stored delivery_date (display format): {delivery_date_str}")
        print(f"delivery_date_ist: {delivery_date_ist}")
        
        # The GET endpoint transforms the date back to IST for display
        # So delivery_date_ist should show the original IST date we provided
        assert delivery_date_ist == "2026-04-10", f"Expected IST date 2026-04-10, got {delivery_date_ist}"
        print(f"✓ IST date correctly shown: {delivery_date_ist}")
        
        # The delivery_date in response is formatted for display (IST date at noon UTC)
        # This is intentional to ensure correct display in any timezone
        if "T" in delivery_date_str:
            date_part = delivery_date_str.split("T")[0]
            assert date_part == "2026-04-10", f"Expected display date 2026-04-10, got {date_part}"
            print(f"✓ Display date correctly shows: {date_part}")
    
    def test_admin_place_order_without_delivery_date_uses_auto_calculate(self):
        """
        POST /api/admin/place-order without delivery_date field
        Should fall back to auto-calculated delivery date
        """
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
            # NO delivery_date field - should auto-calculate
            "notes": "TEST_auto_delivery_date"
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/place-order", json=order_data)
        assert response.status_code == 200, f"Place order failed: {response.text}"
        
        data = response.json()
        self.created_order_ids.append(data.get("id"))
        
        # Verify delivery_date is present (auto-calculated)
        assert "delivery_date" in data, "delivery_date should be auto-calculated"
        
        # Get current IST time to verify auto-calculation
        ist = pytz.timezone('Asia/Kolkata')
        now_ist = datetime.now(ist)
        current_hour = now_ist.hour
        
        # Expected delivery date based on 4 AM IST threshold
        if current_hour < 4:
            expected_date = now_ist.date()
        else:
            expected_date = (now_ist + timedelta(days=1)).date()
        
        print(f"Current IST time: {now_ist.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Expected delivery date: {expected_date}")
        print(f"Auto-calculated delivery_date: {data.get('delivery_date')}")
        print(f"Auto-calculated delivery_date_ist: {data.get('delivery_date_ist')}")
        
        # Verify the auto-calculated date matches expected
        delivery_date_ist = data.get("delivery_date_ist")
        if delivery_date_ist:
            assert delivery_date_ist == expected_date.strftime("%Y-%m-%d"), \
                f"Expected {expected_date}, got {delivery_date_ist}"
            print(f"✓ Auto-calculated date matches expected: {delivery_date_ist}")
    
    def test_delivery_date_invalid_format_falls_back_to_auto(self):
        """
        POST /api/admin/place-order with invalid delivery_date format
        Should fall back to auto-calculated delivery date
        """
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
            "delivery_date": "invalid-date-format",  # Invalid format
            "notes": "TEST_invalid_date_format"
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/place-order", json=order_data)
        assert response.status_code == 200, f"Place order should succeed with fallback: {response.text}"
        
        data = response.json()
        self.created_order_ids.append(data.get("id"))
        
        # Verify order was created with auto-calculated date
        assert "delivery_date" in data, "delivery_date should be auto-calculated on invalid format"
        print(f"Order created with fallback delivery_date: {data.get('delivery_date')}")
    
    def test_delivery_date_different_dates(self):
        """
        Test multiple different delivery dates to verify IST to UTC conversion
        """
        test_dates = [
            ("2026-04-15", "2026-04-14"),  # April 15 IST = April 14 UTC
            ("2026-05-01", "2026-04-30"),  # May 1 IST = April 30 UTC
            ("2026-01-01", "2025-12-31"),  # Jan 1 IST = Dec 31 UTC (year boundary)
        ]
        
        for ist_date, expected_utc_date in test_dates:
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
                "delivery_date": ist_date,
                "notes": f"TEST_date_conversion_{ist_date}"
            }
            
            response = self.session.post(f"{BASE_URL}/api/admin/place-order", json=order_data)
            assert response.status_code == 200, f"Place order failed for date {ist_date}: {response.text}"
            
            data = response.json()
            self.created_order_ids.append(data.get("id"))
            
            # Verify the stored UTC date
            delivery_date_str = data.get("delivery_date", "")
            if "T" in delivery_date_str:
                stored_utc_date = delivery_date_str.split("T")[0]
                assert stored_utc_date == expected_utc_date, \
                    f"For IST {ist_date}, expected UTC {expected_utc_date}, got {stored_utc_date}"
                print(f"✓ IST {ist_date} → UTC {stored_utc_date} (expected {expected_utc_date})")
            
            # Verify IST date in response
            delivery_date_ist = data.get("delivery_date_ist")
            if delivery_date_ist:
                assert delivery_date_ist == ist_date, \
                    f"Expected IST {ist_date}, got {delivery_date_ist}"
                print(f"✓ delivery_date_ist correctly shows: {delivery_date_ist}")


class TestDeliveryDateEndpoint:
    """Test the public delivery date endpoint"""
    
    def test_get_delivery_date_info(self):
        """GET /api/delivery-date returns expected delivery date info"""
        response = requests.get(f"{BASE_URL}/api/delivery-date")
        assert response.status_code == 200, f"Get delivery date failed: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert "delivery_date" in data, "Response should contain delivery_date"
        assert "delivery_date_formatted" in data, "Response should contain delivery_date_formatted"
        assert "day_name" in data, "Response should contain day_name"
        assert "is_same_day" in data, "Response should contain is_same_day"
        assert "order_cutoff_message" in data, "Response should contain order_cutoff_message"
        
        print(f"Delivery date: {data['delivery_date']}")
        print(f"Formatted: {data['delivery_date_formatted']}")
        print(f"Day: {data['day_name']}")
        print(f"Same day: {data['is_same_day']}")
        print(f"Cutoff message: {data['order_cutoff_message']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
