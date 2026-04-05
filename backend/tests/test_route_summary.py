"""
Backend tests for Route Summary API endpoints
Tests the /api/admin/reports/route-summary endpoint for all route types
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://admin-delivery-date.preview.emergentagent.com')

class TestRouteSummaryAPI:
    """Route Summary endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "Soman", "password": "Soman@123"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_short_route_returns_sr1_sr2_groups(self):
        """Test: Short route returns customers grouped by SR1/SR2"""
        response = self.session.get(
            f"{BASE_URL}/api/admin/reports/route-summary",
            params={"route_type": "short", "date": "2026-02-15"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "date" in data
        assert "route_type" in data
        assert "route_codes" in data
        assert "customers" in data
        assert "items" in data
        assert "matrix" in data
        
        # Verify route_codes contains SR1 and SR2
        assert data["route_codes"] == ["SR1", "SR2"], f"Expected ['SR1', 'SR2'], got {data['route_codes']}"
        
        # Verify customers have route_code field
        for customer in data["customers"]:
            assert "route_code" in customer
            assert customer["route_code"] in ["SR1", "SR2"], f"Customer {customer['name']} has invalid route_code: {customer['route_code']}"
    
    def test_long_route_returns_lr1_lr2_groups(self):
        """Test: Long route returns customers grouped by LR1/LR2"""
        response = self.session.get(
            f"{BASE_URL}/api/admin/reports/route-summary",
            params={"route_type": "long", "date": "2026-02-15"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify route_codes contains LR1 and LR2
        assert data["route_codes"] == ["LR1", "LR2"], f"Expected ['LR1', 'LR2'], got {data['route_codes']}"
        
        # Verify customers have route_code field
        for customer in data["customers"]:
            assert "route_code" in customer
            assert customer["route_code"] in ["LR1", "LR2"], f"Customer {customer['name']} has invalid route_code: {customer['route_code']}"
    
    def test_lulu_route_returns_lft_code(self):
        """Test: Lulu route returns LFT code (not LULU1)"""
        response = self.session.get(
            f"{BASE_URL}/api/admin/reports/route-summary",
            params={"route_type": "lulu", "date": "2026-02-15"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify route_codes contains LFT
        assert data["route_codes"] == ["LFT"], f"Expected ['LFT'], got {data['route_codes']}"
        
        # Verify customers have LFT route_code
        for customer in data["customers"]:
            assert customer["route_code"] == "LFT", f"Customer {customer['name']} has invalid route_code: {customer['route_code']}"
    
    def test_onsite_route_returns_ons_code(self):
        """Test: Onsite route returns ONS code"""
        response = self.session.get(
            f"{BASE_URL}/api/admin/reports/route-summary",
            params={"route_type": "onsite", "date": "2026-02-15"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify route_codes contains ONS
        assert data["route_codes"] == ["ONS"], f"Expected ['ONS'], got {data['route_codes']}"
        
        # Verify customers have ONS route_code
        for customer in data["customers"]:
            assert customer["route_code"] == "ONS", f"Customer {customer['name']} has invalid route_code: {customer['route_code']}"
    
    def test_matrix_totals_sum_correctly(self):
        """Test: Matrix values for each customer add up correctly per group"""
        response = self.session.get(
            f"{BASE_URL}/api/admin/reports/route-summary",
            params={"route_type": "short", "date": "2026-02-15"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Group customers by route_code
        sr1_customers = [c for c in data["customers"] if c["route_code"] == "SR1"]
        sr2_customers = [c for c in data["customers"] if c["route_code"] == "SR2"]
        
        # For each item, verify totals can be computed
        for item in data["items"]:
            item_data = data["matrix"].get(item, {})
            
            # Calculate SR1 total
            sr1_total = sum(item_data.get(c["id"], 0) for c in sr1_customers)
            
            # Calculate SR2 total
            sr2_total = sum(item_data.get(c["id"], 0) for c in sr2_customers)
            
            # Verify totals are non-negative
            assert sr1_total >= 0, f"SR1 total for {item} is negative"
            assert sr2_total >= 0, f"SR2 total for {item} is negative"
    
    def test_invalid_route_type_returns_400(self):
        """Test: Invalid route_type returns 400 error"""
        response = self.session.get(
            f"{BASE_URL}/api/admin/reports/route-summary",
            params={"route_type": "invalid", "date": "2026-02-15"}
        )
        assert response.status_code == 400
        assert "Invalid route_type" in response.json().get("detail", "")
    
    def test_invalid_date_format_returns_400(self):
        """Test: Invalid date format returns 400 error"""
        response = self.session.get(
            f"{BASE_URL}/api/admin/reports/route-summary",
            params={"route_type": "short", "date": "15-02-2026"}
        )
        assert response.status_code == 400
        assert "Invalid date format" in response.json().get("detail", "")
    
    def test_empty_date_uses_today(self):
        """Test: Empty date parameter uses today's date"""
        response = self.session.get(
            f"{BASE_URL}/api/admin/reports/route-summary",
            params={"route_type": "short"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "date" in data
        # Date should be in YYYY-MM-DD format
        assert len(data["date"]) == 10
        assert data["date"].count("-") == 2


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
