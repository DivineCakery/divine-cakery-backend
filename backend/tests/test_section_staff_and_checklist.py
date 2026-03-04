"""
Backend API Tests for Section-Specific Staff and Checklist Items Features
Tests for:
1. Section-specific staff endpoints (GET/POST/DELETE) - each section has independent staff list
2. Checklist items in section-tasks (new field for editable numbered tasks 1-4)
3. top_room included as a valid section key
4. All 7 sections work independently

Sections tested: top_room, dough_section, packing_section, angels_prep, cleaning_facilities, supervisor, sales_team
"""
import pytest
import requests
import os
import uuid

# Get BASE_URL from environment
BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    raise ValueError("EXPO_PUBLIC_BACKEND_URL environment variable is not set")

# Admin credentials - updated per the review request
ADMIN_USERNAME = "Soman"
ADMIN_PASSWORD = "Soman@123"

# All 7 valid section keys including top_room
VALID_SECTIONS = [
    "top_room",
    "dough_section", 
    "packing_section", 
    "angels_prep",
    "cleaning_facilities", 
    "supervisor", 
    "sales_team"
]

# Default checklist items structure (4 items as per PRD)
EXPECTED_DEFAULT_CHECKLIST_ITEMS = [
    {"id": "default_1", "label": "Daily Production completed", "notes_when": "unchecked", "notes_placeholder": "Items not completed..."},
    {"id": "default_2", "label": "Daily Cleaning completed", "notes_when": "unchecked", "notes_placeholder": "Which task not completed..."},
    {"id": "default_3", "label": "Weekly Deep Cleaning completed", "notes_when": "unchecked", "notes_placeholder": "Which task not completed..."},
    {"id": "default_4", "label": "Wastage reported", "notes_when": "checked", "notes_placeholder": "Items wasted..."}
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


# ==================== SECTION-STAFF TESTS ====================

class TestSectionStaffAPI:
    """Tests for section-specific staff endpoints - each section has independent staff"""

    # Test 1: GET section-staff returns empty for new sections
    @pytest.mark.parametrize("section_key", VALID_SECTIONS)
    def test_get_section_staff_returns_structure(self, auth_headers, section_key):
        """GET /api/admin/section-staff/{section_key} returns proper structure"""
        response = requests.get(
            f"{BASE_URL}/api/admin/section-staff/{section_key}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "staff" in data, "Response should contain 'staff' key"
        assert isinstance(data["staff"], list), "staff should be a list"
        
        print(f"✓ GET section-staff for '{section_key}' returns valid structure with {len(data['staff'])} staff")

    # Test 2: POST adds staff ONLY to specific section (independence test)
    def test_add_staff_to_dough_section_only(self, auth_headers):
        """POST /api/admin/section-staff/dough_section/add adds staff ONLY to dough_section"""
        unique_name = f"TEST_Staff_{uuid.uuid4().hex[:6]}"
        
        # Add staff to dough_section
        response = requests.post(
            f"{BASE_URL}/api/admin/section-staff/dough_section/add",
            headers=auth_headers,
            json={"name": unique_name}
        )
        assert response.status_code == 200, f"Add staff failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "member" in data, "Response should contain 'member'"
        assert data["member"]["name"] == unique_name, f"Name mismatch: expected {unique_name}, got {data['member']['name']}"
        staff_id = data["member"]["id"]
        
        # Verify staff is in dough_section
        dough_response = requests.get(
            f"{BASE_URL}/api/admin/section-staff/dough_section",
            headers=auth_headers
        )
        assert dough_response.status_code == 200
        dough_staff = [s["name"] for s in dough_response.json()["staff"]]
        assert unique_name in dough_staff, f"Staff not found in dough_section"
        
        # Verify staff is NOT in packing_section (independence test)
        packing_response = requests.get(
            f"{BASE_URL}/api/admin/section-staff/packing_section",
            headers=auth_headers
        )
        assert packing_response.status_code == 200
        packing_staff = [s["name"] for s in packing_response.json()["staff"]]
        assert unique_name not in packing_staff, f"Staff should NOT appear in packing_section"
        
        # Cleanup - remove the test staff
        requests.delete(
            f"{BASE_URL}/api/admin/section-staff/dough_section/{staff_id}",
            headers=auth_headers
        )
        
        print(f"✓ Staff added to dough_section is independent (not in packing_section)")

    # Test 3: GET packing_section returns empty when only dough has staff
    def test_section_staff_independence(self, auth_headers):
        """GET /api/admin/section-staff/packing_section is independent from dough_section"""
        unique_name = f"TEST_Independence_{uuid.uuid4().hex[:6]}"
        
        # First, clear any existing test data by getting current staff in both sections
        dough_before = requests.get(
            f"{BASE_URL}/api/admin/section-staff/dough_section",
            headers=auth_headers
        ).json()["staff"]
        
        packing_before = requests.get(
            f"{BASE_URL}/api/admin/section-staff/packing_section",
            headers=auth_headers
        ).json()["staff"]
        
        # Add staff ONLY to dough_section
        add_response = requests.post(
            f"{BASE_URL}/api/admin/section-staff/dough_section/add",
            headers=auth_headers,
            json={"name": unique_name}
        )
        assert add_response.status_code == 200
        staff_id = add_response.json()["member"]["id"]
        
        # Get packing_section staff - should NOT contain the new staff
        packing_response = requests.get(
            f"{BASE_URL}/api/admin/section-staff/packing_section",
            headers=auth_headers
        )
        assert packing_response.status_code == 200
        packing_staff_names = [s["name"] for s in packing_response.json()["staff"]]
        
        assert unique_name not in packing_staff_names, \
            f"Staff '{unique_name}' should NOT be in packing_section (independence violated)"
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/admin/section-staff/dough_section/{staff_id}",
            headers=auth_headers
        )
        
        print(f"✓ Section staff independence verified (packing_section unaffected by dough_section changes)")

    # Test 4: DELETE removes staff from specific section
    def test_delete_staff_from_section(self, auth_headers):
        """DELETE /api/admin/section-staff/{section_key}/{staff_id} removes staff from specific section"""
        unique_name = f"TEST_Delete_{uuid.uuid4().hex[:6]}"
        section_key = "angels_prep"
        
        # Add staff
        add_response = requests.post(
            f"{BASE_URL}/api/admin/section-staff/{section_key}/add",
            headers=auth_headers,
            json={"name": unique_name}
        )
        assert add_response.status_code == 200
        staff_id = add_response.json()["member"]["id"]
        
        # Verify staff exists
        get_response = requests.get(
            f"{BASE_URL}/api/admin/section-staff/{section_key}",
            headers=auth_headers
        )
        staff_names = [s["name"] for s in get_response.json()["staff"]]
        assert unique_name in staff_names, "Staff should exist before delete"
        
        # Delete staff
        delete_response = requests.delete(
            f"{BASE_URL}/api/admin/section-staff/{section_key}/{staff_id}",
            headers=auth_headers
        )
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        
        # Verify staff no longer exists
        get_after_response = requests.get(
            f"{BASE_URL}/api/admin/section-staff/{section_key}",
            headers=auth_headers
        )
        staff_names_after = [s["name"] for s in get_after_response.json()["staff"]]
        assert unique_name not in staff_names_after, "Staff should not exist after delete"
        
        print(f"✓ Staff successfully deleted from '{section_key}'")

    # Test 5: All 7 sections work for section-staff
    @pytest.mark.parametrize("section_key", VALID_SECTIONS)
    def test_all_7_sections_staff_endpoints_work(self, auth_headers, section_key):
        """All 7 sections work for section-staff endpoints"""
        unique_name = f"TEST_{section_key}_{uuid.uuid4().hex[:4]}"
        
        # Add staff
        add_response = requests.post(
            f"{BASE_URL}/api/admin/section-staff/{section_key}/add",
            headers=auth_headers,
            json={"name": unique_name}
        )
        assert add_response.status_code == 200, f"Add staff to '{section_key}' failed: {add_response.text}"
        staff_id = add_response.json()["member"]["id"]
        
        # Get and verify
        get_response = requests.get(
            f"{BASE_URL}/api/admin/section-staff/{section_key}",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        staff_names = [s["name"] for s in get_response.json()["staff"]]
        assert unique_name in staff_names, f"Staff not found in '{section_key}'"
        
        # Delete (cleanup)
        delete_response = requests.delete(
            f"{BASE_URL}/api/admin/section-staff/{section_key}/{staff_id}",
            headers=auth_headers
        )
        assert delete_response.status_code == 200
        
        print(f"✓ Section '{section_key}' staff endpoints work correctly")

    # Test 6: top_room is valid for section-staff
    def test_top_room_valid_for_staff(self, auth_headers):
        """top_room is a valid section key for section-staff endpoints"""
        unique_name = f"TEST_TopRoom_{uuid.uuid4().hex[:6]}"
        
        # Add staff to top_room
        add_response = requests.post(
            f"{BASE_URL}/api/admin/section-staff/top_room/add",
            headers=auth_headers,
            json={"name": unique_name}
        )
        assert add_response.status_code == 200, f"top_room should be valid: {add_response.text}"
        staff_id = add_response.json()["member"]["id"]
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/admin/section-staff/top_room/{staff_id}",
            headers=auth_headers
        )
        
        print(f"✓ top_room is valid for section-staff")

    # Test 7: Invalid section returns 400
    def test_invalid_section_staff_returns_400(self, auth_headers):
        """Invalid section key returns 400 for section-staff endpoints"""
        invalid_sections = ["invalid_section", "wrong_key", "random"]
        
        for section_key in invalid_sections:
            # Test GET
            get_response = requests.get(
                f"{BASE_URL}/api/admin/section-staff/{section_key}",
                headers=auth_headers
            )
            assert get_response.status_code == 400, \
                f"GET with invalid '{section_key}' should return 400, got {get_response.status_code}"
            
            # Test POST
            post_response = requests.post(
                f"{BASE_URL}/api/admin/section-staff/{section_key}/add",
                headers=auth_headers,
                json={"name": "Test"}
            )
            assert post_response.status_code == 400, \
                f"POST with invalid '{section_key}' should return 400, got {post_response.status_code}"
        
        print(f"✓ Invalid section keys correctly return 400 for section-staff")


# ==================== CHECKLIST ITEMS TESTS ====================

class TestChecklistItemsAPI:
    """Tests for checklist_items in section-tasks endpoints"""

    # Test 8: GET returns checklist_items with correct structure for all sections
    @pytest.mark.parametrize("section_key", VALID_SECTIONS)
    def test_get_returns_checklist_items_with_structure(self, auth_headers, section_key):
        """GET /api/admin/section-tasks/{section_key} returns checklist_items with correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/admin/section-tasks/{section_key}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"GET failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "checklist_items" in data, "Response should contain 'checklist_items'"
        
        checklist = data["checklist_items"]
        assert isinstance(checklist, list), "checklist_items should be a list"
        assert len(checklist) >= 1, f"Expected at least 1 checklist item, got {len(checklist)}"
        
        # Verify each item has required fields
        for item in checklist:
            assert "id" in item, f"Item missing 'id': {item}"
            assert "label" in item, f"Item missing 'label': {item}"
            assert "notes_when" in item, f"Item missing 'notes_when': {item}"
            assert "notes_placeholder" in item, f"Item missing 'notes_placeholder': {item}"
        
        print(f"✓ GET '{section_key}' returns checklist_items ({len(checklist)} items) with correct structure")

    # Test 9: PUT saves checklist_items
    def test_put_saves_checklist_items(self, auth_headers):
        """PUT /api/admin/section-tasks/{section_key} with checklist_items saves them"""
        section_key = "supervisor"
        custom_checklist = [
            {"id": "custom_1", "label": "TEST_Custom Task 1", "notes_when": "checked", "notes_placeholder": "Notes for task 1..."},
            {"id": "custom_2", "label": "TEST_Custom Task 2", "notes_when": "unchecked", "notes_placeholder": "Notes for task 2..."},
            {"id": "custom_3", "label": "TEST_Custom Task 3", "notes_when": "always", "notes_placeholder": "Always required notes..."},
            {"id": "custom_4", "label": "TEST_Custom Task 4", "notes_when": "checked", "notes_placeholder": "Notes when checked..."}
        ]
        
        # PUT with custom checklist_items
        put_response = requests.put(
            f"{BASE_URL}/api/admin/section-tasks/{section_key}",
            headers=auth_headers,
            json={"checklist_items": custom_checklist}
        )
        assert put_response.status_code == 200, f"PUT failed: {put_response.status_code} - {put_response.text}"
        
        # GET to verify persistence
        get_response = requests.get(
            f"{BASE_URL}/api/admin/section-tasks/{section_key}",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        
        saved_checklist = get_response.json()["checklist_items"]
        assert len(saved_checklist) == 4, f"Expected 4 items, got {len(saved_checklist)}"
        assert saved_checklist[0]["label"] == custom_checklist[0]["label"], \
            f"First item label mismatch: expected '{custom_checklist[0]['label']}', got '{saved_checklist[0]['label']}'"
        
        print(f"✓ PUT saves checklist_items successfully for '{section_key}'")

    # Test 10: GET returns saved checklist_items after PUT
    def test_get_returns_saved_checklist_after_put(self, auth_headers):
        """GET returns saved checklist_items after PUT"""
        section_key = "sales_team"
        unique_label = f"TEST_Unique_{uuid.uuid4().hex[:6]}"
        
        custom_checklist = [
            {"id": "test_1", "label": unique_label, "notes_when": "unchecked", "notes_placeholder": "Test notes"},
            {"id": "test_2", "label": "Task 2", "notes_when": "checked", "notes_placeholder": "Notes 2"},
            {"id": "test_3", "label": "Task 3", "notes_when": "unchecked", "notes_placeholder": "Notes 3"},
            {"id": "test_4", "label": "Task 4", "notes_when": "checked", "notes_placeholder": "Notes 4"}
        ]
        
        # PUT
        put_response = requests.put(
            f"{BASE_URL}/api/admin/section-tasks/{section_key}",
            headers=auth_headers,
            json={"checklist_items": custom_checklist}
        )
        assert put_response.status_code == 200
        
        # GET
        get_response = requests.get(
            f"{BASE_URL}/api/admin/section-tasks/{section_key}",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        
        saved_items = get_response.json()["checklist_items"]
        saved_labels = [item["label"] for item in saved_items]
        
        assert unique_label in saved_labels, f"Saved checklist should contain '{unique_label}'"
        
        print(f"✓ GET returns saved checklist_items after PUT")

    # Test 11: Different sections have different checklist_items (independence)
    def test_checklist_items_independence(self, auth_headers):
        """Different sections can have different checklist_items (independence test)"""
        unique_dough = f"TEST_Dough_{uuid.uuid4().hex[:6]}"
        unique_packing = f"TEST_Packing_{uuid.uuid4().hex[:6]}"
        
        dough_checklist = [
            {"id": "d1", "label": unique_dough, "notes_when": "checked", "notes_placeholder": "Dough notes"},
            {"id": "d2", "label": "Dough Task 2", "notes_when": "unchecked", "notes_placeholder": "Notes"},
            {"id": "d3", "label": "Dough Task 3", "notes_when": "unchecked", "notes_placeholder": "Notes"},
            {"id": "d4", "label": "Dough Task 4", "notes_when": "unchecked", "notes_placeholder": "Notes"}
        ]
        
        packing_checklist = [
            {"id": "p1", "label": unique_packing, "notes_when": "unchecked", "notes_placeholder": "Packing notes"},
            {"id": "p2", "label": "Packing Task 2", "notes_when": "checked", "notes_placeholder": "Notes"},
            {"id": "p3", "label": "Packing Task 3", "notes_when": "checked", "notes_placeholder": "Notes"},
            {"id": "p4", "label": "Packing Task 4", "notes_when": "checked", "notes_placeholder": "Notes"}
        ]
        
        # PUT to dough_section
        requests.put(
            f"{BASE_URL}/api/admin/section-tasks/dough_section",
            headers=auth_headers,
            json={"checklist_items": dough_checklist}
        )
        
        # PUT to packing_section
        requests.put(
            f"{BASE_URL}/api/admin/section-tasks/packing_section",
            headers=auth_headers,
            json={"checklist_items": packing_checklist}
        )
        
        # GET both sections
        dough_response = requests.get(
            f"{BASE_URL}/api/admin/section-tasks/dough_section",
            headers=auth_headers
        )
        packing_response = requests.get(
            f"{BASE_URL}/api/admin/section-tasks/packing_section",
            headers=auth_headers
        )
        
        dough_labels = [item["label"] for item in dough_response.json()["checklist_items"]]
        packing_labels = [item["label"] for item in packing_response.json()["checklist_items"]]
        
        # Verify independence
        assert unique_dough in dough_labels, "dough_section should have its unique item"
        assert unique_packing in packing_labels, "packing_section should have its unique item"
        assert unique_dough not in packing_labels, "packing_section should NOT have dough's unique item"
        assert unique_packing not in dough_labels, "dough_section should NOT have packing's unique item"
        
        print(f"✓ Checklist items independence verified between dough_section and packing_section")

    # Test 12: top_room is valid for section-tasks with checklist_items
    def test_top_room_valid_for_tasks(self, auth_headers):
        """top_room is a valid section key for section-tasks endpoints"""
        unique_label = f"TEST_TopRoom_{uuid.uuid4().hex[:6]}"
        
        custom_checklist = [
            {"id": "tr1", "label": unique_label, "notes_when": "checked", "notes_placeholder": "Top Room notes"},
            {"id": "tr2", "label": "Top Room Task 2", "notes_when": "unchecked", "notes_placeholder": "Notes"},
            {"id": "tr3", "label": "Top Room Task 3", "notes_when": "unchecked", "notes_placeholder": "Notes"},
            {"id": "tr4", "label": "Top Room Task 4", "notes_when": "unchecked", "notes_placeholder": "Notes"}
        ]
        
        # PUT to top_room
        put_response = requests.put(
            f"{BASE_URL}/api/admin/section-tasks/top_room",
            headers=auth_headers,
            json={"checklist_items": custom_checklist}
        )
        assert put_response.status_code == 200, f"top_room should be valid: {put_response.text}"
        
        # GET from top_room
        get_response = requests.get(
            f"{BASE_URL}/api/admin/section-tasks/top_room",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        
        saved_labels = [item["label"] for item in get_response.json()["checklist_items"]]
        assert unique_label in saved_labels, "top_room should save and return checklist_items"
        
        print(f"✓ top_room is valid for section-tasks with checklist_items")


# ==================== BACKWARD COMPATIBILITY TESTS ====================

class TestBackwardCompatibility:
    """Tests for existing staff-list and cleaning-tasks endpoints"""

    # Test 13: staff-list endpoint still works
    def test_staff_list_endpoint_works(self, auth_headers):
        """GET /api/admin/staff-list returns staff members (backward compat)"""
        response = requests.get(
            f"{BASE_URL}/api/admin/staff-list",
            headers=auth_headers
        )
        assert response.status_code == 200, f"staff-list failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "staff" in data, "Response should contain 'staff' key"
        assert isinstance(data["staff"], list), "staff should be a list"
        
        print(f"✓ staff-list endpoint works (backward compat), found {len(data['staff'])} staff")

    # Test 14: cleaning-tasks endpoint still works
    def test_cleaning_tasks_endpoint_works(self, auth_headers):
        """GET /api/admin/cleaning-tasks returns tasks (backward compat)"""
        response = requests.get(
            f"{BASE_URL}/api/admin/cleaning-tasks",
            headers=auth_headers
        )
        assert response.status_code == 200, f"cleaning-tasks failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "daily_tasks" in data, "Response should contain 'daily_tasks'"
        assert "weekly_tasks" in data, "Response should contain 'weekly_tasks'"
        
        print(f"✓ cleaning-tasks endpoint works (backward compat)")


# ==================== AUTHENTICATION TESTS ====================

class TestAuthentication:
    """Tests for authentication requirements"""

    # Test 15: section-staff requires authentication
    def test_section_staff_requires_auth(self):
        """section-staff endpoints require authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/section-staff/dough_section")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        
        print("✓ section-staff endpoint correctly requires authentication")

    # Test 16: section-tasks requires authentication
    def test_section_tasks_requires_auth(self):
        """section-tasks endpoints require authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/section-tasks/dough_section")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        
        print("✓ section-tasks endpoint correctly requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
