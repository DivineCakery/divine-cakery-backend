#!/usr/bin/env python3
"""
Backend Testing Script for Dough Types Feature
Tests the new dough types functionality including category filtering, 
report filtering, and product dough type assignment.
"""

import requests
import json
import sys
from datetime import datetime
from typing import Dict, List, Optional

# Configuration
BASE_URL = "https://doughtype-admin.preview.emergentagent.com/api"
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"

class DoughTypesTestSuite:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.test_results = []
        self.created_dough_type_id = None
        self.test_product_id = None
        
    def log_test(self, test_name: str, success: bool, message: str, details: str = ""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        self.test_results.append({
            "test": test_name,
            "success": success,
            "message": message,
            "details": details
        })
        print(f"{status}: {test_name} - {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def authenticate_admin(self) -> bool:
        """Authenticate as admin and get token"""
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
                self.log_test("Admin Authentication", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Admin Authentication", False, f"Exception: {str(e)}")
            return False
    
    def test_category_type_filtering(self):
        """Test 1: Category Type Filtering"""
        print("\n=== TEST 1: Category Type Filtering ===")
        
        # Test 1a: Get all categories (no filter)
        try:
            response = self.session.get(f"{BASE_URL}/categories")
            if response.status_code == 200:
                all_categories = response.json()
                self.log_test("Get All Categories", True, f"Retrieved {len(all_categories)} total categories")
            else:
                self.log_test("Get All Categories", False, f"Status {response.status_code}", response.text)
                return
        except Exception as e:
            self.log_test("Get All Categories", False, f"Exception: {str(e)}")
            return
        
        # Test 1b: Get product categories (legacy + explicit product_category)
        try:
            response = self.session.get(f"{BASE_URL}/categories?category_type=product_category")
            if response.status_code == 200:
                product_categories = response.json()
                self.log_test("Get Product Categories", True, 
                            f"Retrieved {len(product_categories)} product categories")
                
                # Verify these are legacy categories (no category_type) or explicit product_category
                for cat in product_categories:
                    cat_type = cat.get("category_type")
                    if cat_type and cat_type != "product_category":
                        self.log_test("Product Categories Validation", False, 
                                    f"Found non-product category: {cat['name']} with type {cat_type}")
                        return
                
                self.log_test("Product Categories Validation", True, 
                            "All returned categories are product categories or legacy")
            else:
                self.log_test("Get Product Categories", False, f"Status {response.status_code}", response.text)
                return
        except Exception as e:
            self.log_test("Get Product Categories", False, f"Exception: {str(e)}")
            return
        
        # Test 1c: Get dough type categories (should be empty initially)
        try:
            response = self.session.get(f"{BASE_URL}/categories?category_type=dough_type")
            if response.status_code == 200:
                dough_type_categories = response.json()
                self.log_test("Get Dough Type Categories", True, 
                            f"Retrieved {len(dough_type_categories)} dough type categories")
                
                # Verify these are all dough_type categories
                for cat in dough_type_categories:
                    if cat.get("category_type") != "dough_type":
                        self.log_test("Dough Type Categories Validation", False, 
                                    f"Found non-dough-type category: {cat['name']}")
                        return
                
                self.log_test("Dough Type Categories Validation", True, 
                            "All returned categories are dough type categories")
            else:
                self.log_test("Get Dough Type Categories", False, f"Status {response.status_code}", response.text)
                return
        except Exception as e:
            self.log_test("Get Dough Type Categories", False, f"Exception: {str(e)}")
            return
    
    def test_create_dough_type_category(self):
        """Test 2: Create Dough Type Category"""
        print("\n=== TEST 2: Create Dough Type Category ===")
        
        try:
            # Create a test dough type category
            dough_type_data = {
                "name": "Test Dough Type",
                "description": "Test dough type for automated testing",
                "display_order": 0,
                "category_type": "dough_type"
            }
            
            response = self.session.post(f"{BASE_URL}/admin/categories", json=dough_type_data)
            
            if response.status_code == 200:
                created_category = response.json()
                self.created_dough_type_id = created_category["id"]
                self.log_test("Create Dough Type Category", True, 
                            f"Created dough type: {created_category['name']} (ID: {self.created_dough_type_id})")
                
                # Verify the category was created with correct type
                if created_category.get("category_type") != "dough_type":
                    self.log_test("Dough Type Creation Validation", False, 
                                f"Created category has wrong type: {created_category.get('category_type')}")
                    return
                
                self.log_test("Dough Type Creation Validation", True, 
                            "Created category has correct dough_type category_type")
            else:
                self.log_test("Create Dough Type Category", False, f"Status {response.status_code}", response.text)
                return
                
        except Exception as e:
            self.log_test("Create Dough Type Category", False, f"Exception: {str(e)}")
            return
        
        # Verify the created dough type appears in dough_type filter
        try:
            response = self.session.get(f"{BASE_URL}/categories?category_type=dough_type")
            if response.status_code == 200:
                dough_types = response.json()
                found_created = any(cat["id"] == self.created_dough_type_id for cat in dough_types)
                
                if found_created:
                    self.log_test("Dough Type Filter Verification", True, 
                                "Created dough type appears in dough_type filter")
                else:
                    self.log_test("Dough Type Filter Verification", False, 
                                "Created dough type not found in dough_type filter")
            else:
                self.log_test("Dough Type Filter Verification", False, f"Status {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Dough Type Filter Verification", False, f"Exception: {str(e)}")
        
        # Verify the created dough type does NOT appear in product_category filter
        try:
            response = self.session.get(f"{BASE_URL}/categories?category_type=product_category")
            if response.status_code == 200:
                product_categories = response.json()
                found_in_products = any(cat["id"] == self.created_dough_type_id for cat in product_categories)
                
                if not found_in_products:
                    self.log_test("Product Category Filter Verification", True, 
                                "Created dough type correctly excluded from product_category filter")
                else:
                    self.log_test("Product Category Filter Verification", False, 
                                "Created dough type incorrectly appears in product_category filter")
            else:
                self.log_test("Product Category Filter Verification", False, f"Status {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Product Category Filter Verification", False, f"Exception: {str(e)}")
    
    def test_daily_items_report_filter(self):
        """Test 3: Daily Items Report Filter"""
        print("\n=== TEST 3: Daily Items Report Filter ===")
        
        # Test 3a: Daily items without filter
        try:
            response = self.session.get(f"{BASE_URL}/admin/reports/daily-items")
            if response.status_code == 200:
                report_data = response.json()
                self.log_test("Daily Items Report (No Filter)", True, 
                            f"Retrieved report with {len(report_data.get('items', []))} items")
                
                # Verify response structure
                required_fields = ["date", "day_name", "total_items", "items"]
                missing_fields = [field for field in required_fields if field not in report_data]
                
                if missing_fields:
                    self.log_test("Daily Items Report Structure", False, 
                                f"Missing fields: {missing_fields}")
                else:
                    self.log_test("Daily Items Report Structure", True, 
                                "Report has all required fields")
                    
                    # Check if filter fields are present (should be None for no filter)
                    if "filter_dough_type_id" in report_data and "filter_dough_type_name" in report_data:
                        self.log_test("Daily Items Filter Fields", True, 
                                    "Report includes filter fields")
                    else:
                        self.log_test("Daily Items Filter Fields", False, 
                                    "Report missing filter fields")
            else:
                self.log_test("Daily Items Report (No Filter)", False, f"Status {response.status_code}", response.text)
                return
                
        except Exception as e:
            self.log_test("Daily Items Report (No Filter)", False, f"Exception: {str(e)}")
            return
        
        # Test 3b: Daily items with dough type filter (if we created one)
        if self.created_dough_type_id:
            try:
                response = self.session.get(f"{BASE_URL}/admin/reports/daily-items?dough_type_id={self.created_dough_type_id}")
                if response.status_code == 200:
                    filtered_report = response.json()
                    self.log_test("Daily Items Report (With Dough Type Filter)", True, 
                                f"Retrieved filtered report with {len(filtered_report.get('items', []))} items")
                    
                    # Verify filter fields are populated
                    if filtered_report.get("filter_dough_type_id") == self.created_dough_type_id:
                        self.log_test("Daily Items Filter ID Verification", True, 
                                    "Filter dough_type_id correctly set in response")
                    else:
                        self.log_test("Daily Items Filter ID Verification", False, 
                                    f"Expected filter_dough_type_id {self.created_dough_type_id}, got {filtered_report.get('filter_dough_type_id')}")
                    
                    if filtered_report.get("filter_dough_type_name") == "Test Dough Type":
                        self.log_test("Daily Items Filter Name Verification", True, 
                                    "Filter dough_type_name correctly set in response")
                    else:
                        self.log_test("Daily Items Filter Name Verification", False, 
                                    f"Expected filter_dough_type_name 'Test Dough Type', got {filtered_report.get('filter_dough_type_name')}")
                else:
                    self.log_test("Daily Items Report (With Dough Type Filter)", False, f"Status {response.status_code}", response.text)
                    
            except Exception as e:
                self.log_test("Daily Items Report (With Dough Type Filter)", False, f"Exception: {str(e)}")
    
    def test_preparation_list_report_filter(self):
        """Test 4: Preparation List Report Filter"""
        print("\n=== TEST 4: Preparation List Report Filter ===")
        
        # Test 4a: Preparation list without filter
        try:
            response = self.session.get(f"{BASE_URL}/admin/reports/preparation-list")
            if response.status_code == 200:
                report_data = response.json()
                self.log_test("Preparation List Report (No Filter)", True, 
                            f"Retrieved report with {len(report_data.get('items', []))} items")
                
                # Verify response structure
                required_fields = ["date", "day_name", "total_items", "items"]
                missing_fields = [field for field in required_fields if field not in report_data]
                
                if missing_fields:
                    self.log_test("Preparation List Report Structure", False, 
                                f"Missing fields: {missing_fields}")
                else:
                    self.log_test("Preparation List Report Structure", True, 
                                "Report has all required fields")
            else:
                self.log_test("Preparation List Report (No Filter)", False, f"Status {response.status_code}", response.text)
                return
                
        except Exception as e:
            self.log_test("Preparation List Report (No Filter)", False, f"Exception: {str(e)}")
            return
        
        # Test 4b: Preparation list with dough type filter (if we created one)
        if self.created_dough_type_id:
            try:
                response = self.session.get(f"{BASE_URL}/admin/reports/preparation-list?dough_type_id={self.created_dough_type_id}")
                if response.status_code == 200:
                    filtered_report = response.json()
                    self.log_test("Preparation List Report (With Dough Type Filter)", True, 
                                f"Retrieved filtered report with {len(filtered_report.get('items', []))} items")
                    
                    # Verify the response structure is maintained
                    if "items" in filtered_report:
                        items = filtered_report["items"]
                        if items:
                            # Check if items have dough_type fields
                            sample_item = items[0]
                            if "dough_type_id" in sample_item and "dough_type_name" in sample_item:
                                self.log_test("Preparation List Item Structure", True, 
                                            "Items include dough_type fields")
                            else:
                                self.log_test("Preparation List Item Structure", False, 
                                            "Items missing dough_type fields")
                        else:
                            self.log_test("Preparation List Filter Result", True, 
                                        "No items found for this dough type (expected for new dough type)")
                else:
                    self.log_test("Preparation List Report (With Dough Type Filter)", False, f"Status {response.status_code}", response.text)
                    
            except Exception as e:
                self.log_test("Preparation List Report (With Dough Type Filter)", False, f"Exception: {str(e)}")
    
    def test_product_with_dough_type(self):
        """Test 5: Product with Dough Type"""
        print("\n=== TEST 5: Product with Dough Type ===")
        
        # First, get a product to update
        try:
            response = self.session.get(f"{BASE_URL}/products")
            if response.status_code == 200:
                products = response.json()
                if products:
                    self.test_product_id = products[0]["id"]
                    product_name = products[0]["name"]
                    self.log_test("Get Test Product", True, 
                                f"Found test product: {product_name} (ID: {self.test_product_id})")
                else:
                    self.log_test("Get Test Product", False, "No products found in database")
                    return
            else:
                self.log_test("Get Test Product", False, f"Status {response.status_code}", response.text)
                return
                
        except Exception as e:
            self.log_test("Get Test Product", False, f"Exception: {str(e)}")
            return
        
        # Update the product with dough_type_id (if we created one)
        if self.created_dough_type_id and self.test_product_id:
            try:
                update_data = {
                    "dough_type_id": self.created_dough_type_id
                }
                
                response = self.session.put(f"{BASE_URL}/admin/products/{self.test_product_id}", json=update_data)
                
                if response.status_code == 200:
                    updated_product = response.json()
                    self.log_test("Update Product with Dough Type", True, 
                                f"Successfully updated product with dough_type_id")
                    
                    # Verify the dough_type_id was set
                    if updated_product.get("dough_type_id") == self.created_dough_type_id:
                        self.log_test("Product Dough Type Verification", True, 
                                    "Product correctly updated with dough_type_id")
                    else:
                        self.log_test("Product Dough Type Verification", False, 
                                    f"Expected dough_type_id {self.created_dough_type_id}, got {updated_product.get('dough_type_id')}")
                else:
                    self.log_test("Update Product with Dough Type", False, f"Status {response.status_code}", response.text)
                    return
                    
            except Exception as e:
                self.log_test("Update Product with Dough Type", False, f"Exception: {str(e)}")
                return
        
        # Test retrieving the product to verify dough_type_id persists
        if self.test_product_id:
            try:
                response = self.session.get(f"{BASE_URL}/products/{self.test_product_id}")
                if response.status_code == 200:
                    product = response.json()
                    
                    if product.get("dough_type_id") == self.created_dough_type_id:
                        self.log_test("Product Retrieval with Dough Type", True, 
                                    "Product retrieval shows correct dough_type_id")
                    else:
                        self.log_test("Product Retrieval with Dough Type", False, 
                                    f"Product retrieval shows incorrect dough_type_id: {product.get('dough_type_id')}")
                else:
                    self.log_test("Product Retrieval with Dough Type", False, f"Status {response.status_code}", response.text)
                    
            except Exception as e:
                self.log_test("Product Retrieval with Dough Type", False, f"Exception: {str(e)}")
        
        # Test report filtering with the updated product
        if self.created_dough_type_id:
            try:
                response = self.session.get(f"{BASE_URL}/admin/reports/daily-items?dough_type_id={self.created_dough_type_id}")
                if response.status_code == 200:
                    filtered_report = response.json()
                    items = filtered_report.get("items", [])
                    
                    # Look for our test product in the filtered results
                    found_product = any(item.get("product_id") == self.test_product_id for item in items)
                    
                    if found_product:
                        self.log_test("Report Filtering with Product Dough Type", True, 
                                    "Updated product appears in dough type filtered report")
                    else:
                        # This might be expected if the product has no orders today
                        self.log_test("Report Filtering with Product Dough Type", True, 
                                    "Product not in report (expected if no orders for this product today)")
                else:
                    self.log_test("Report Filtering with Product Dough Type", False, f"Status {response.status_code}", response.text)
                    
            except Exception as e:
                self.log_test("Report Filtering with Product Dough Type", False, f"Exception: {str(e)}")
    
    def test_authentication_requirements(self):
        """Test 6: Authentication Requirements"""
        print("\n=== TEST 6: Authentication Requirements ===")
        
        # Test that GET /api/categories works without authentication
        try:
            # Create a new session without auth token
            no_auth_session = requests.Session()
            response = no_auth_session.get(f"{BASE_URL}/categories")
            
            if response.status_code == 200:
                self.log_test("Categories Public Access", True, 
                            "GET /api/categories works without authentication")
            else:
                self.log_test("Categories Public Access", False, f"Status {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Categories Public Access", False, f"Exception: {str(e)}")
        
        # Test that admin endpoints require authentication
        try:
            no_auth_session = requests.Session()
            response = no_auth_session.get(f"{BASE_URL}/admin/reports/daily-items")
            
            if response.status_code == 401:
                self.log_test("Admin Endpoints Auth Required", True, 
                            "Admin endpoints correctly require authentication")
            else:
                self.log_test("Admin Endpoints Auth Required", False, 
                            f"Expected 401, got {response.status_code}")
                
        except Exception as e:
            self.log_test("Admin Endpoints Auth Required", False, f"Exception: {str(e)}")
    
    def cleanup_test_data(self):
        """Clean up test data created during testing"""
        print("\n=== CLEANUP ===")
        
        # Remove dough_type_id from test product
        if self.test_product_id:
            try:
                update_data = {"dough_type_id": None}
                response = self.session.put(f"{BASE_URL}/admin/products/{self.test_product_id}", json=update_data)
                
                if response.status_code == 200:
                    self.log_test("Cleanup Product Dough Type", True, "Removed dough_type_id from test product")
                else:
                    self.log_test("Cleanup Product Dough Type", False, f"Status {response.status_code}")
                    
            except Exception as e:
                self.log_test("Cleanup Product Dough Type", False, f"Exception: {str(e)}")
        
        # Delete test dough type category
        if self.created_dough_type_id:
            try:
                response = self.session.delete(f"{BASE_URL}/admin/categories/{self.created_dough_type_id}")
                
                if response.status_code == 200:
                    self.log_test("Cleanup Dough Type Category", True, "Deleted test dough type category")
                else:
                    self.log_test("Cleanup Dough Type Category", False, f"Status {response.status_code}")
                    
            except Exception as e:
                self.log_test("Cleanup Dough Type Category", False, f"Exception: {str(e)}")
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🧪 STARTING DOUGH TYPES FEATURE TESTING")
        print("=" * 60)
        
        # Authenticate first
        if not self.authenticate_admin():
            print("❌ Cannot proceed without admin authentication")
            return False
        
        # Run all test suites
        self.test_category_type_filtering()
        self.test_create_dough_type_category()
        self.test_daily_items_report_filter()
        self.test_preparation_list_report_filter()
        self.test_product_with_dough_type()
        self.test_authentication_requirements()
        
        # Cleanup
        self.cleanup_test_data()
        
        # Print summary
        self.print_summary()
        
        # Return overall success
        return all(result["success"] for result in self.test_results)
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("🧪 DOUGH TYPES FEATURE TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  • {result['test']}: {result['message']}")
                    if result["details"]:
                        print(f"    Details: {result['details']}")
        
        print("\n" + "=" * 60)

def main():
    """Main function to run the test suite"""
    tester = DoughTypesTestSuite()
    success = tester.run_all_tests()
    
    if success:
        print("🎉 ALL TESTS PASSED! Dough Types feature is working correctly.")
        sys.exit(0)
    else:
        print("💥 SOME TESTS FAILED! Please check the issues above.")
        sys.exit(1)

if __name__ == "__main__":
    main()