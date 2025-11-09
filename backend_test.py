#!/usr/bin/env python3
"""
Backend Testing Suite for Divine Cakery API
Focus: Preparation List Filter Feature Testing
"""

import requests
import json
import os
from datetime import datetime, timedelta
import sys

# Get backend URL from environment
BACKEND_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://standing-orders-app.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

# Admin credentials
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"

class TestResults:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.test_results = []
        
    def log_result(self, test_name, success, message, details=None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "timestamp": datetime.now().isoformat(),
            "details": details or {}
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name} - {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def authenticate_admin(self):
        """Authenticate as admin and get token"""
        try:
            login_data = {
                "username": ADMIN_USERNAME,
                "password": ADMIN_PASSWORD
            }
            
            response = self.session.post(f"{BASE_URL}/auth/login", json=login_data)
            
            if response.status_code == 200:
                token_data = response.json()
                self.admin_token = token_data.get("access_token")
                self.session.headers.update({"Authorization": f"Bearer {self.admin_token}"})
                self.log_result("Admin Authentication", True, "Successfully authenticated as admin")
                return True
            else:
                self.log_result("Admin Authentication", False, f"Failed to authenticate: {response.status_code}", 
                              {"response": response.text})
                return False
                
        except Exception as e:
            self.log_result("Admin Authentication", False, f"Authentication error: {str(e)}")
            return False
    
    def test_product_retrieval_all(self):
        """Test GET /api/products - verify all 113 products are returned"""
        try:
            response = self.session.get(f"{BASE_URL}/products")
            
            if response.status_code == 200:
                products = response.json()
                product_count = len(products)
                
                if product_count == 113:
                    self.log_result("Product Retrieval - All Products", True, 
                                  f"Successfully retrieved all {product_count} products")
                    
                    # Check product structure
                    if products:
                        sample_product = products[0]
                        required_fields = ["id", "name", "category", "price", "mrp", "description"]
                        missing_fields = [field for field in required_fields if field not in sample_product]
                        
                        if not missing_fields:
                            self.log_result("Product Structure Validation", True, 
                                          "All required fields present in product structure")
                        else:
                            self.log_result("Product Structure Validation", False, 
                                          f"Missing required fields: {missing_fields}")
                    
                    return products
                else:
                    self.log_result("Product Retrieval - All Products", False, 
                                  f"Expected 113 products, got {product_count}")
                    return products
            else:
                self.log_result("Product Retrieval - All Products", False, 
                              f"API request failed: {response.status_code}", 
                              {"response": response.text})
                return []
                
        except Exception as e:
            self.log_result("Product Retrieval - All Products", False, f"Error: {str(e)}")
            return []
    
    def test_category_filtering(self):
        """Test category filtering functionality"""
        expected_categories = {
            "Premium": 11,
            "Packing": 69,
            "Slicing": 41
        }
        
        for category, expected_count in expected_categories.items():
            try:
                response = self.session.get(f"{BASE_URL}/products", params={"category": category})
                
                if response.status_code == 200:
                    products = response.json()
                    actual_count = len(products)
                    
                    if actual_count == expected_count:
                        self.log_result(f"Category Filter - {category}", True, 
                                      f"Correctly returned {actual_count} products for {category}")
                    else:
                        self.log_result(f"Category Filter - {category}", False, 
                                      f"Expected {expected_count} products, got {actual_count}")
                        
                    # Verify products actually belong to the category
                    if products:
                        category_mismatch = []
                        for product in products[:5]:  # Check first 5 products
                            product_categories = product.get("categories", [])
                            if category not in product_categories and product.get("category") != category:
                                category_mismatch.append(product.get("name", "Unknown"))
                        
                        if not category_mismatch:
                            self.log_result(f"Category Filter Accuracy - {category}", True, 
                                          "Products correctly match category filter")
                        else:
                            self.log_result(f"Category Filter Accuracy - {category}", False, 
                                          f"Products don't match category: {category_mismatch[:3]}")
                else:
                    self.log_result(f"Category Filter - {category}", False, 
                                  f"API request failed: {response.status_code}")
                    
            except Exception as e:
                self.log_result(f"Category Filter - {category}", False, f"Error: {str(e)}")
    
    def test_product_data_validation(self, products):
        """Test product data validation and integrity"""
        if not products:
            self.log_result("Product Data Validation", False, "No products available for validation")
            return
        
        # Test sample of products for data integrity
        sample_size = min(10, len(products))
        sample_products = products[:sample_size]
        
        validation_results = {
            "valid_names": 0,
            "valid_prices": 0,
            "valid_mrp": 0,
            "valid_food_type": 0,
            "products_with_images": 0,
            "products_without_images": 0,
            "valid_categories": 0
        }
        
        for product in sample_products:
            # Check name
            if product.get("name") and len(product["name"].strip()) > 0:
                validation_results["valid_names"] += 1
            
            # Check price and MRP
            try:
                price = float(product.get("price", 0))
                mrp = float(product.get("mrp", 0))
                if price > 0:
                    validation_results["valid_prices"] += 1
                if mrp > 0:
                    validation_results["valid_mrp"] += 1
            except (ValueError, TypeError):
                pass
            
            # Check food type
            food_type = product.get("food_type")
            if food_type in ["veg", "non-veg"]:
                validation_results["valid_food_type"] += 1
            
            # Check images
            image_base64 = product.get("image_base64")
            if image_base64 and image_base64.strip():
                validation_results["products_with_images"] += 1
                # Validate base64 format (handle data URL format)
                try:
                    if image_base64.startswith("data:image"):
                        # Extract base64 part after the comma
                        base64_part = image_base64.split(",", 1)[1] if "," in image_base64 else image_base64
                        base64.b64decode(base64_part)
                    else:
                        base64.b64decode(image_base64)
                except Exception as e:
                    self.log_result("Image Base64 Validation", False, 
                                  f"Invalid base64 image for product: {product.get('name')}: {str(e)}")
            else:
                validation_results["products_without_images"] += 1
            
            # Check categories
            categories = product.get("categories", [])
            if isinstance(categories, list) and len(categories) > 0:
                validation_results["valid_categories"] += 1
        
        # Log validation results
        success_rate = (validation_results["valid_names"] / sample_size) * 100
        if success_rate >= 90:
            self.log_result("Product Name Validation", True, 
                          f"{validation_results['valid_names']}/{sample_size} products have valid names")
        else:
            self.log_result("Product Name Validation", False, 
                          f"Only {validation_results['valid_names']}/{sample_size} products have valid names")
        
        price_success = (validation_results["valid_prices"] / sample_size) * 100
        if price_success >= 90:
            self.log_result("Product Price Validation", True, 
                          f"{validation_results['valid_prices']}/{sample_size} products have valid prices")
        else:
            self.log_result("Product Price Validation", False, 
                          f"Only {validation_results['valid_prices']}/{sample_size} products have valid prices")
        
        food_type_success = (validation_results["valid_food_type"] / sample_size) * 100
        if food_type_success >= 80:  # Allow some flexibility for food type
            self.log_result("Food Type Validation", True, 
                          f"{validation_results['valid_food_type']}/{sample_size} products have valid food types")
        else:
            self.log_result("Food Type Validation", False, 
                          f"Only {validation_results['valid_food_type']}/{sample_size} products have valid food types")
        
        # Log image statistics
        self.log_result("Image Distribution Check", True, 
                      f"Products with images: {validation_results['products_with_images']}, "
                      f"without images: {validation_results['products_without_images']}")
    
    def test_products_with_multiple_categories(self, products):
        """Test products that have multiple categories"""
        multi_category_products = []
        
        for product in products:
            categories = product.get("categories", [])
            if isinstance(categories, list) and len(categories) > 1:
                multi_category_products.append({
                    "name": product.get("name"),
                    "categories": categories
                })
        
        if multi_category_products:
            self.log_result("Multiple Categories Support", True, 
                          f"Found {len(multi_category_products)} products with multiple categories")
            
            # Test that these products appear in multiple category filters
            sample_product = multi_category_products[0]
            categories_to_test = sample_product["categories"][:2]  # Test first 2 categories
            
            for category in categories_to_test:
                try:
                    response = self.session.get(f"{BASE_URL}/products", params={"category": category})
                    if response.status_code == 200:
                        filtered_products = response.json()
                        product_names = [p.get("name") for p in filtered_products]
                        
                        if sample_product["name"] in product_names:
                            self.log_result(f"Multi-Category Filter - {category}", True, 
                                          f"Product '{sample_product['name']}' correctly appears in {category} filter")
                        else:
                            self.log_result(f"Multi-Category Filter - {category}", False, 
                                          f"Product '{sample_product['name']}' missing from {category} filter")
                except Exception as e:
                    self.log_result(f"Multi-Category Filter - {category}", False, f"Error: {str(e)}")
        else:
            self.log_result("Multiple Categories Support", False, "No products found with multiple categories")
    
    def test_public_endpoint_access(self):
        """Test that GET /api/products works without authentication"""
        try:
            # Create new session without auth headers
            public_session = requests.Session()
            response = public_session.get(f"{BASE_URL}/products")
            
            if response.status_code == 200:
                products = response.json()
                self.log_result("Public Endpoint Access", True, 
                              f"Products endpoint accessible without auth, returned {len(products)} products")
            else:
                self.log_result("Public Endpoint Access", False, 
                              f"Products endpoint failed without auth: {response.status_code}")
                
        except Exception as e:
            self.log_result("Public Endpoint Access", False, f"Error: {str(e)}")
    
    def test_specific_product_details(self, products):
        """Test specific product details and edge cases"""
        if not products:
            return
        
        # Test products with and without images
        products_with_images = [p for p in products if p.get("image_base64")]
        products_without_images = [p for p in products if not p.get("image_base64")]
        
        expected_with_images = 51
        expected_without_images = 62
        
        if len(products_with_images) == expected_with_images:
            self.log_result("Products With Images Count", True, 
                          f"Correctly found {len(products_with_images)} products with images")
        else:
            self.log_result("Products With Images Count", False, 
                          f"Expected {expected_with_images} products with images, found {len(products_with_images)}")
        
        if len(products_without_images) == expected_without_images:
            self.log_result("Products Without Images Count", True, 
                          f"Correctly found {len(products_without_images)} products without images")
        else:
            self.log_result("Products Without Images Count", False, 
                          f"Expected {expected_without_images} products without images, found {len(products_without_images)}")
        
        # Test category distribution
        all_categories = set()
        for product in products:
            categories = product.get("categories", [])
            if isinstance(categories, list):
                all_categories.update(categories)
            elif product.get("category"):
                all_categories.add(product.get("category"))
        
        expected_categories = {"Premium", "Packing", "Slicing", "Fixed Orders", "Economy", 
                             "Flaky Bakes", "Sourdough", "Prep", "Others"}
        
        if len(all_categories) == 9 and all_categories == expected_categories:
            self.log_result("Category Distribution", True, 
                          f"All 9 expected categories found: {sorted(all_categories)}")
        else:
            missing = expected_categories - all_categories
            extra = all_categories - expected_categories
            self.log_result("Category Distribution", False, 
                          f"Category mismatch. Missing: {missing}, Extra: {extra}")
    
    def run_all_tests(self):
        """Run all test scenarios"""
        print("🧪 Starting Product Bulk Upload Feature Testing...")
        print("=" * 60)
        
        # Step 1: Authenticate
        if not self.authenticate_admin():
            print("❌ Cannot proceed without admin authentication")
            return False
        
        # Step 2: Test product retrieval
        products = self.test_product_retrieval_all()
        
        # Step 3: Test category filtering
        self.test_category_filtering()
        
        # Step 4: Test product data validation
        self.test_product_data_validation(products)
        
        # Step 5: Test multiple categories support
        self.test_products_with_multiple_categories(products)
        
        # Step 6: Test public endpoint access
        self.test_public_endpoint_access()
        
        # Step 7: Test specific product details
        self.test_specific_product_details(products)
        
        # Summary
        self.print_summary()
        
        return True
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r["success"]])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n🔍 FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"   • {result['test']}: {result['message']}")
        
        print("\n" + "=" * 60)

def main():
    """Main test execution"""
    tester = ProductBulkUploadTester()
    success = tester.run_all_tests()
    
    if success:
        failed_count = len([r for r in tester.test_results if not r["success"]])
        if failed_count == 0:
            print("🎉 All tests passed! Product bulk upload feature is working correctly.")
            return True
        else:
            print(f"⚠️  {failed_count} test(s) failed. Please review the issues above.")
            return False
    else:
        print("💥 Testing failed to complete.")
        return False

if __name__ == "__main__":
    main()