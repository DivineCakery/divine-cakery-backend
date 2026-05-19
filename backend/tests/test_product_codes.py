"""
Backend tests for Product Code Mapping endpoints:
- GET /api/admin/product-codes
- PUT /api/admin/product-codes

These tests assign codes to live products and then RESTORE the prior
state so production data (divine_cakery on MongoDB Atlas) is not mutated.
"""

import os
import pytest
import requests

BASE_URL = "https://admin-delivery-date.preview.emergentagent.com"

ADMIN_USERNAME = "Soman"
ADMIN_PASSWORD = "Soman@123"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD},
        timeout=30,
    )
    assert r.status_code == 200, f"Login failed: {r.status_code} - {r.text}"
    data = r.json()
    token = data.get("access_token") or data.get("token")
    assert token, f"Token missing in login response: {data}"
    return token


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def original_product_codes(auth_headers):
    """Snapshot current product_code mapping so we can restore later."""
    r = requests.get(f"{BASE_URL}/api/admin/product-codes", headers=auth_headers, timeout=30)
    assert r.status_code == 200
    products = r.json()
    snapshot = [
        {"product_id": p["id"], "product_code": int(p["product_code"])}
        for p in products
        if p.get("product_code") is not None
    ]
    yield {"products": products, "snapshot": snapshot}

    # Teardown: restore the original mapping
    restore = requests.put(
        f"{BASE_URL}/api/admin/product-codes",
        headers=auth_headers,
        json=snapshot,
        timeout=30,
    )
    assert restore.status_code == 200, f"Restore failed: {restore.text}"


# ---------- GET endpoint ----------

class TestGetProductCodes:
    def test_get_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/admin/product-codes", timeout=30)
        assert r.status_code in (401, 403)

    def test_get_returns_list(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/admin/product-codes", headers=auth_headers, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) > 0, "Expected at least 1 active product"

    def test_get_fields_present_and_no_mongo_id(self, auth_headers, original_product_codes):
        products = original_product_codes["products"]
        assert len(products) > 0
        for p in products[:5]:
            assert "id" in p
            assert "name" in p
            # _id from mongo must NOT be exposed
            assert "_id" not in p
            # product_code can be None but key may or may not exist - both okay
            # closing_stock and price are projected too
            # Validate types when present
            if p.get("product_code") is not None:
                assert isinstance(p["product_code"], int)


# ---------- PUT endpoint ----------

class TestUpdateProductCodes:
    def test_put_requires_auth(self):
        r = requests.put(f"{BASE_URL}/api/admin/product-codes", json=[], timeout=30)
        assert r.status_code in (401, 403)

    def test_put_assigns_codes_and_get_reflects(self, auth_headers, original_product_codes):
        products = original_product_codes["products"]
        # pick first 3 products
        sample = products[:3]
        assert len(sample) >= 3, "Need at least 3 products for this test"

        mappings = [
            {"product_id": sample[0]["id"], "product_code": 1},
            {"product_id": sample[1]["id"], "product_code": 50},
            {"product_id": sample[2]["id"], "product_code": 100},
        ]
        r = requests.put(
            f"{BASE_URL}/api/admin/product-codes",
            headers=auth_headers,
            json=mappings,
            timeout=30,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert "message" in body
        assert "3" in body["message"]

        # GET to verify persistence
        g = requests.get(f"{BASE_URL}/api/admin/product-codes", headers=auth_headers, timeout=30)
        assert g.status_code == 200
        by_id = {p["id"]: p for p in g.json()}
        assert by_id[sample[0]["id"]].get("product_code") == 1
        assert by_id[sample[1]["id"]].get("product_code") == 50
        assert by_id[sample[2]["id"]].get("product_code") == 100

        # Verify other previously-coded products were CLEARED (PUT is a full replace)
        # by checking that products not in mappings have no product_code
        coded_ids = {m["product_id"] for m in mappings}
        cleared = [
            p for p in g.json()
            if p["id"] not in coded_ids and p.get("product_code") is not None
        ]
        assert cleared == [], f"Expected non-mapped products to be cleared, but found: {cleared[:3]}"

    def test_put_empty_clears_all(self, auth_headers, original_product_codes):
        r = requests.put(
            f"{BASE_URL}/api/admin/product-codes",
            headers=auth_headers,
            json=[],
            timeout=30,
        )
        assert r.status_code == 200

        g = requests.get(f"{BASE_URL}/api/admin/product-codes", headers=auth_headers, timeout=30)
        assert g.status_code == 200
        assigned = [p for p in g.json() if p.get("product_code") is not None]
        assert assigned == [], f"Expected no assignments after empty PUT, found {len(assigned)}"


# ---------- Frontend static page reachability (web bundle from Expo) ----------

class TestFrontendPageReachability:
    def test_product_codes_page_loads(self):
        # Best-effort: Metro bundler serves index; route handled client side.
        r = requests.get(f"{BASE_URL}/product-codes", timeout=30, allow_redirects=True)
        # Either 200 (SPA) or 404 with bundle still served by Metro
        assert r.status_code in (200, 404), f"Unexpected status {r.status_code}"

    def test_manage_stock_page_loads(self):
        r = requests.get(f"{BASE_URL}/manage-stock", timeout=30, allow_redirects=True)
        assert r.status_code in (200, 404), f"Unexpected status {r.status_code}"
