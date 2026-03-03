"""
Backend API Tests for Section Tasks Feature
Tests for the 6 staff checklist sections:
- dough_section, packing_section, angels_prep, cleaning_facilities, supervisor, sales_team
"""
import pytest
import requests
import os

# Get BASE_URL from environment
BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    raise ValueError("EXPO_PUBLIC_BACKEND_URL environment variable is not set")

# Admin credentials
ADMIN_USERNAME = "Soman"
ADMIN_PASSWORD = "Demo"

# Valid section keys
VALID_SECTIONS = [
    "dough_section", 
    "packing_section", 
    "angels_prep",
    "cleaning_facilities", 
    "supervisor", 
    "sales_team"
]


@pytest.fixture(scope="module")
def auth_token():
    """Get admin authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
    )
    if response.status_code != 200:
        pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")
    return response.json().get("access_token")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Return headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestSectionTasksAPI:
    """Tests for section-tasks endpoints"""

    # Test 1: GET returns empty tasks for new sections
    @pytest.mark.parametrize("section_key", VALID_SECTIONS)
    def test_get_section_tasks_returns_default_structure(self, auth_headers, section_key):
        """GET /api/admin/section-tasks/{section_key} returns proper default structure"""
        response = requests.get(
            f"{BASE_URL}/api/admin/section-tasks/{section_key}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "daily_tasks" in data, "Response should contain daily_tasks"
        assert "weekly_tasks" in data, "Response should contain weekly_tasks"
        assert isinstance(data["daily_tasks"], list), "daily_tasks should be a list"
        assert isinstance(data["weekly_tasks"], dict), "weekly_tasks should be a dict"
        
        # Verify weekly_tasks has all days
        expected_days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
        for day in expected_days:
            assert day in data["weekly_tasks"], f"weekly_tasks should contain {day}"
        
        print(f"✓ GET section-tasks for '{section_key}' returns valid structure")

    # Test 2: PUT saves daily_tasks and weekly_tasks
    def test_put_section_tasks_saves_data(self, auth_headers):
        """PUT /api/admin/section-tasks/{section_key} saves daily_tasks and weekly_tasks"""
        section_key = "dough_section"
        test_data = {
            "daily_tasks": ["TEST_Task1", "TEST_Task2", "TEST_Task3"],
            "weekly_tasks": {
                "monday": "TEST_Monday task",
                "tuesday": "TEST_Tuesday task",
                "wednesday": "",
                "thursday": "",
                "friday": "",
                "saturday": "",
                "sunday": ""
            }
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/section-tasks/{section_key}",
            headers=auth_headers,
            json=test_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should contain message"
        assert "updated successfully" in data["message"].lower(), f"Expected success message, got: {data['message']}"
        
        print(f"✓ PUT section-tasks saves data successfully")

    # Test 3: GET returns saved data after PUT
    def test_get_returns_saved_data_after_put(self, auth_headers):
        """GET /api/admin/section-tasks/{section_key} returns saved data after PUT"""
        section_key = "dough_section"
        
        # First PUT some data
        test_data = {
            "daily_tasks": ["TEST_Verify1", "TEST_Verify2"],
            "weekly_tasks": {
                "monday": "TEST_Mon verify",
                "tuesday": "TEST_Tue verify",
                "wednesday": "",
                "thursday": "",
                "friday": "",
                "saturday": "",
                "sunday": ""
            }
        }
        
        put_response = requests.put(
            f"{BASE_URL}/api/admin/section-tasks/{section_key}",
            headers=auth_headers,
            json=test_data
        )
        assert put_response.status_code == 200, f"PUT failed: {put_response.text}"
        
        # Then GET to verify persistence
        get_response = requests.get(
            f"{BASE_URL}/api/admin/section-tasks/{section_key}",
            headers=auth_headers
        )
        assert get_response.status_code == 200, f"GET failed: {get_response.text}"
        
        data = get_response.json()
        assert data["daily_tasks"] == test_data["daily_tasks"], \
            f"daily_tasks mismatch: expected {test_data['daily_tasks']}, got {data['daily_tasks']}"
        assert data["weekly_tasks"]["monday"] == test_data["weekly_tasks"]["monday"], \
            f"weekly monday mismatch: expected {test_data['weekly_tasks']['monday']}, got {data['weekly_tasks']['monday']}"
        
        print(f"✓ GET returns saved data correctly after PUT")

    # Test 4: Invalid section key returns 400 error
    def test_invalid_section_returns_400(self, auth_headers):
        """Invalid section key returns 400 error"""
        invalid_sections = ["invalid_section", "wrong_key", "top_room", "random"]
        
        for section_key in invalid_sections:
            # Test GET with invalid section
            get_response = requests.get(
                f"{BASE_URL}/api/admin/section-tasks/{section_key}",
                headers=auth_headers
            )
            assert get_response.status_code == 400, \
                f"GET with invalid section '{section_key}' should return 400, got {get_response.status_code}"
            
            # Test PUT with invalid section
            put_response = requests.put(
                f"{BASE_URL}/api/admin/section-tasks/{section_key}",
                headers=auth_headers,
                json={"daily_tasks": ["test"]}
            )
            assert put_response.status_code == 400, \
                f"PUT with invalid section '{section_key}' should return 400, got {put_response.status_code}"
            
        print(f"✓ Invalid section keys correctly return 400 error")

    # Test 5: All 6 section keys work
    @pytest.mark.parametrize("section_key", VALID_SECTIONS)
    def test_all_sections_accept_put(self, auth_headers, section_key):
        """All 6 valid section keys work for PUT operations"""
        test_data = {
            "daily_tasks": [f"TEST_{section_key}_task"],
            "weekly_tasks": {
                "monday": f"TEST_{section_key}_monday",
                "tuesday": "",
                "wednesday": "",
                "thursday": "",
                "friday": "",
                "saturday": "",
                "sunday": ""
            }
        }
        
        # PUT data
        put_response = requests.put(
            f"{BASE_URL}/api/admin/section-tasks/{section_key}",
            headers=auth_headers,
            json=test_data
        )
        assert put_response.status_code == 200, \
            f"PUT to section '{section_key}' failed: {put_response.status_code} - {put_response.text}"
        
        # GET to verify
        get_response = requests.get(
            f"{BASE_URL}/api/admin/section-tasks/{section_key}",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        
        data = get_response.json()
        assert test_data["daily_tasks"][0] in data["daily_tasks"], \
            f"PUT data not found in GET for section '{section_key}'"
        
        print(f"✓ Section '{section_key}' accepts PUT and persists data")


class TestExistingEndpoints:
    """Tests for existing staff-list and cleaning-tasks endpoints"""

    # Test 6: staff-list endpoint still works
    def test_staff_list_endpoint_works(self, auth_headers):
        """GET /api/admin/staff-list returns staff members"""
        response = requests.get(
            f"{BASE_URL}/api/admin/staff-list",
            headers=auth_headers
        )
        assert response.status_code == 200, f"staff-list failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "staff" in data, "Response should contain 'staff' key"
        assert isinstance(data["staff"], list), "staff should be a list"
        
        print(f"✓ staff-list endpoint works, found {len(data['staff'])} staff members")

    # Test 7: cleaning-tasks endpoint still works
    def test_cleaning_tasks_endpoint_works(self, auth_headers):
        """GET /api/admin/cleaning-tasks returns tasks configuration"""
        response = requests.get(
            f"{BASE_URL}/api/admin/cleaning-tasks",
            headers=auth_headers
        )
        assert response.status_code == 200, f"cleaning-tasks failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "daily_tasks" in data, "Response should contain 'daily_tasks'"
        assert "weekly_tasks" in data, "Response should contain 'weekly_tasks'"
        
        print(f"✓ cleaning-tasks endpoint works, found {len(data.get('daily_tasks', []))} daily tasks")


class TestPreviouslySavedData:
    """Test that previously saved test data for dough_section is retrievable"""

    def test_dough_section_returns_previously_saved_data(self, auth_headers):
        """GET /api/admin/section-tasks/dough_section returns previously saved test data"""
        response = requests.get(
            f"{BASE_URL}/api/admin/section-tasks/dough_section",
            headers=auth_headers
        )
        assert response.status_code == 200, f"GET failed: {response.status_code} - {response.text}"
        
        data = response.json()
        print(f"dough_section data: daily_tasks={data.get('daily_tasks')}, weekly_monday={data.get('weekly_tasks', {}).get('monday')}")
        
        # Verify structure (actual values may vary based on previous test runs)
        assert "daily_tasks" in data
        assert "weekly_tasks" in data
        
        print(f"✓ dough_section data retrieved successfully")


class TestAuthenticationRequired:
    """Test that endpoints require authentication"""

    def test_section_tasks_requires_auth(self):
        """Section tasks endpoints require authentication"""
        # Test without auth header
        response = requests.get(f"{BASE_URL}/api/admin/section-tasks/dough_section")
        assert response.status_code == 401, \
            f"Expected 401 without auth, got {response.status_code}"
        
        print("✓ Section tasks endpoint correctly requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
