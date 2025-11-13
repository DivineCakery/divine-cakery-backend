#!/usr/bin/env python3
"""
Backend Test Suite for Agent-Owner Linking Feature
Tests all CRUD operations for user management with user_type and linked_owner_id fields
"""

import requests
import json
import sys
from datetime import datetime
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "https://cakery-app.preview.emergentagent.com/api"
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"

class BackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.test_results = []
        self.created_users = []  # Track created users for cleanup
        
    def log_test(self, test_name: str, success: bool, message: str, details: Dict = None):
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
        if details and not success:
            print(f"   Details: {details}")
    
    def authenticate_admin(self) -> bool:
        """Authenticate as admin and get token"""
        try:
            response = self.session.post(
                f"{BASE_URL}/auth/login",
                json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
            )
            
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data["access_token"]
                self.session.headers.update({"Authorization": f"Bearer {self.admin_token}"})
                self.log_test("Admin Authentication", True, "Successfully authenticated as admin")
                return True
            else:
                self.log_test("Admin Authentication", False, f"Failed to authenticate: {response.status_code}", 
                            {"response": response.text})
                return False
                
        except Exception as e:
            self.log_test("Admin Authentication", False, f"Authentication error: {str(e)}")
            return False
    
    def create_owner_user(self, username: str, business_name: str = None) -> Optional[Dict]:
        """Test creating a new owner user"""
        try:
            user_data = {
                "username": username,
                "password": "testpass123",
                "email": f"{username}@example.com",
                "phone": f"98765{username[-5:].zfill(5)}",
                "business_name": business_name or f"{username} Business",
                "address": f"{username} Address, City",
                "user_type": "owner",
                "linked_owner_id": None,
                "can_topup_wallet": True,
                "onsite_pickup_only": False,
                "delivery_charge_waived": False
            }
            
            response = self.session.post(f"{BASE_URL}/admin/users", json=user_data)
            
            if response.status_code == 200:
                user = response.json()
                self.created_users.append(user["id"])
                
                # Verify user_type and linked_owner_id
                if user.get("user_type") == "owner" and user.get("linked_owner_id") is None:
                    self.log_test(f"Create Owner User ({username})", True, 
                                "Owner user created successfully with correct user_type and null linked_owner_id")
                    return user
                else:
                    self.log_test(f"Create Owner User ({username})", False, 
                                "User created but user_type or linked_owner_id incorrect",
                                {"user_type": user.get("user_type"), "linked_owner_id": user.get("linked_owner_id")})
                    return None
            else:
                self.log_test(f"Create Owner User ({username})", False, 
                            f"Failed to create user: {response.status_code}", 
                            {"response": response.text})
                return None
                
        except Exception as e:
            self.log_test(f"Create Owner User ({username})", False, f"Error: {str(e)}")
            return None
    
    def create_agent_user(self, username: str, owner_id: str, owner_username: str) -> Optional[Dict]:
        """Test creating a new agent user linked to an owner"""
        try:
            user_data = {
                "username": username,
                "password": "testpass123",
                "email": f"{username}@example.com",
                "phone": f"98765{username[-5:].zfill(5)}",
                "business_name": f"{username} Agent Business",
                "address": f"{username} Agent Address, City",
                "user_type": "order_agent",
                "linked_owner_id": owner_id,
                "can_topup_wallet": False,  # Agents typically can't top up
                "onsite_pickup_only": False,
                "delivery_charge_waived": False
            }
            
            response = self.session.post(f"{BASE_URL}/admin/users", json=user_data)
            
            if response.status_code == 200:
                user = response.json()
                self.created_users.append(user["id"])
                
                # Verify user_type and linked_owner_id
                if (user.get("user_type") == "order_agent" and 
                    user.get("linked_owner_id") == owner_id):
                    self.log_test(f"Create Agent User ({username})", True, 
                                f"Agent user created successfully linked to owner {owner_username}")
                    return user
                else:
                    self.log_test(f"Create Agent User ({username})", False, 
                                "User created but user_type or linked_owner_id incorrect",
                                {"user_type": user.get("user_type"), 
                                 "linked_owner_id": user.get("linked_owner_id"),
                                 "expected_owner_id": owner_id})
                    return None
            else:
                self.log_test(f"Create Agent User ({username})", False, 
                            f"Failed to create agent: {response.status_code}", 
                            {"response": response.text})
                return None
                
        except Exception as e:
            self.log_test(f"Create Agent User ({username})", False, f"Error: {str(e)}")
            return None
    
    def update_user_to_agent(self, user_id: str, owner_id: str, username: str) -> bool:
        """Test updating existing user to become an agent"""
        try:
            update_data = {
                "user_type": "order_agent",
                "linked_owner_id": owner_id,
                "can_topup_wallet": False
            }
            
            response = self.session.put(f"{BASE_URL}/admin/users/{user_id}", json=update_data)
            
            if response.status_code == 200:
                user = response.json()
                
                # Verify update
                if (user.get("user_type") == "order_agent" and 
                    user.get("linked_owner_id") == owner_id):
                    self.log_test(f"Update User to Agent ({username})", True, 
                                "User successfully updated to agent with correct linked_owner_id")
                    return True
                else:
                    self.log_test(f"Update User to Agent ({username})", False, 
                                "User updated but fields incorrect",
                                {"user_type": user.get("user_type"), 
                                 "linked_owner_id": user.get("linked_owner_id")})
                    return False
            else:
                self.log_test(f"Update User to Agent ({username})", False, 
                            f"Failed to update user: {response.status_code}", 
                            {"response": response.text})
                return False
                
        except Exception as e:
            self.log_test(f"Update User to Agent ({username})", False, f"Error: {str(e)}")
            return False
    
    def update_user_to_owner(self, user_id: str, username: str) -> bool:
        """Test updating existing user to become an owner"""
        try:
            update_data = {
                "user_type": "owner",
                "linked_owner_id": None,
                "can_topup_wallet": True
            }
            
            response = self.session.put(f"{BASE_URL}/admin/users/{user_id}", json=update_data)
            
            if response.status_code == 200:
                user = response.json()
                
                # Verify update
                if (user.get("user_type") == "owner" and 
                    user.get("linked_owner_id") is None):
                    self.log_test(f"Update User to Owner ({username})", True, 
                                "User successfully updated to owner with null linked_owner_id")
                    return True
                else:
                    self.log_test(f"Update User to Owner ({username})", False, 
                                "User updated but fields incorrect",
                                {"user_type": user.get("user_type"), 
                                 "linked_owner_id": user.get("linked_owner_id")})
                    return False
            else:
                self.log_test(f"Update User to Owner ({username})", False, 
                            f"Failed to update user: {response.status_code}", 
                            {"response": response.text})
                return False
                
        except Exception as e:
            self.log_test(f"Update User to Owner ({username})", False, f"Error: {str(e)}")
            return False
    
    def get_all_users(self) -> bool:
        """Test getting all users and verify user_type and linked_owner_id fields are included"""
        try:
            response = self.session.get(f"{BASE_URL}/admin/users")
            
            if response.status_code == 200:
                users = response.json()
                
                # Check if response includes user_type and linked_owner_id fields
                users_with_fields = 0
                total_users = len(users)
                
                for user in users:
                    if "user_type" in user and "linked_owner_id" in user:
                        users_with_fields += 1
                
                if users_with_fields == total_users and total_users > 0:
                    self.log_test("Get All Users", True, 
                                f"Successfully retrieved {total_users} users with user_type and linked_owner_id fields")
                    return True
                else:
                    self.log_test("Get All Users", False, 
                                f"Missing fields in some users: {users_with_fields}/{total_users} have required fields")
                    return False
            else:
                self.log_test("Get All Users", False, 
                            f"Failed to get users: {response.status_code}", 
                            {"response": response.text})
                return False
                
        except Exception as e:
            self.log_test("Get All Users", False, f"Error: {str(e)}")
            return False
    
    def test_edge_cases(self) -> bool:
        """Test edge cases and backward compatibility"""
        success_count = 0
        total_tests = 3
        
        # Test 1: Create agent without linked_owner_id (should work from backend)
        try:
            user_data = {
                "username": "agent_no_owner",
                "password": "testpass123",
                "email": "agent_no_owner@example.com",
                "user_type": "order_agent",
                "linked_owner_id": None
            }
            
            response = self.session.post(f"{BASE_URL}/admin/users", json=user_data)
            
            if response.status_code == 200:
                user = response.json()
                self.created_users.append(user["id"])
                self.log_test("Edge Case: Agent without Owner", True, 
                            "Agent created without linked_owner_id (backend allows this)")
                success_count += 1
            else:
                self.log_test("Edge Case: Agent without Owner", False, 
                            f"Failed to create agent without owner: {response.status_code}")
        except Exception as e:
            self.log_test("Edge Case: Agent without Owner", False, f"Error: {str(e)}")
        
        # Test 2: Create user without user_type (should default to owner)
        try:
            user_data = {
                "username": "user_no_type",
                "password": "testpass123",
                "email": "user_no_type@example.com"
                # No user_type specified
            }
            
            response = self.session.post(f"{BASE_URL}/admin/users", json=user_data)
            
            if response.status_code == 200:
                user = response.json()
                self.created_users.append(user["id"])
                
                if user.get("user_type") == "owner":
                    self.log_test("Edge Case: Default User Type", True, 
                                "User without user_type defaults to 'owner'")
                    success_count += 1
                else:
                    self.log_test("Edge Case: Default User Type", False, 
                                f"User type is '{user.get('user_type')}', expected 'owner'")
            else:
                self.log_test("Edge Case: Default User Type", False, 
                            f"Failed to create user: {response.status_code}")
        except Exception as e:
            self.log_test("Edge Case: Default User Type", False, f"Error: {str(e)}")
        
        # Test 3: Verify backward compatibility with existing users
        try:
            response = self.session.get(f"{BASE_URL}/admin/users")
            
            if response.status_code == 200:
                users = response.json()
                
                # Check if existing users have user_type field (backward compatibility)
                users_with_type = sum(1 for user in users if "user_type" in user)
                
                if users_with_type == len(users):
                    self.log_test("Edge Case: Backward Compatibility", True, 
                                "All users have user_type field (backward compatibility maintained)")
                    success_count += 1
                else:
                    self.log_test("Edge Case: Backward Compatibility", False, 
                                f"Some users missing user_type: {users_with_type}/{len(users)}")
            else:
                self.log_test("Edge Case: Backward Compatibility", False, 
                            f"Failed to check users: {response.status_code}")
        except Exception as e:
            self.log_test("Edge Case: Backward Compatibility", False, f"Error: {str(e)}")
        
        return success_count == total_tests
    
    def cleanup_test_users(self):
        """Clean up created test users"""
        cleaned_count = 0
        for user_id in self.created_users:
            try:
                response = self.session.delete(f"{BASE_URL}/admin/users/{user_id}")
                if response.status_code == 200:
                    cleaned_count += 1
            except Exception as e:
                print(f"Failed to cleanup user {user_id}: {str(e)}")
        
        if cleaned_count > 0:
            print(f"🧹 Cleaned up {cleaned_count} test users")
    
    def run_comprehensive_tests(self):
        """Run all Agent-Owner Linking tests"""
        print("🚀 Starting Agent-Owner Linking Backend Tests")
        print("=" * 60)
        
        # Step 1: Authenticate
        if not self.authenticate_admin():
            print("❌ Cannot proceed without admin authentication")
            return False
        
        # Step 2: Test creating owner users
        print("\n📋 Testing Owner User Creation...")
        owner1 = self.create_owner_user("test_owner_1", "Owner Business 1")
        owner2 = self.create_owner_user("test_owner_2", "Owner Business 2")
        
        if not owner1 or not owner2:
            print("❌ Cannot proceed without owner users")
            return False
        
        # Step 3: Test creating agent users
        print("\n👥 Testing Agent User Creation...")
        agent1 = self.create_agent_user("test_agent_1", owner1["id"], owner1["username"])
        agent2 = self.create_agent_user("test_agent_2", owner2["id"], owner2["username"])
        
        # Step 4: Test updating existing user to agent
        print("\n🔄 Testing User Type Updates...")
        temp_owner = self.create_owner_user("temp_owner_for_update")
        if temp_owner:
            self.update_user_to_agent(temp_owner["id"], owner1["id"], temp_owner["username"])
        
        # Step 5: Test updating existing user to owner
        if agent1:
            self.update_user_to_owner(agent1["id"], agent1["username"])
        
        # Step 6: Test getting all users
        print("\n📊 Testing User Retrieval...")
        self.get_all_users()
        
        # Step 7: Test edge cases
        print("\n🧪 Testing Edge Cases...")
        self.test_edge_cases()
        
        # Step 8: Cleanup
        print("\n🧹 Cleaning up test data...")
        self.cleanup_test_users()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
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
                    print(f"  - {result['test']}: {result['message']}")
        
        return failed_tests == 0

def main():
    """Main test execution"""
    tester = BackendTester()
    
    try:
        success = tester.run_comprehensive_tests()
        
        if success:
            print("\n🎉 All Agent-Owner Linking tests passed!")
            sys.exit(0)
        else:
            print("\n💥 Some tests failed. Check the summary above.")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n⚠️ Tests interrupted by user")
        tester.cleanup_test_users()
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Unexpected error: {str(e)}")
        tester.cleanup_test_users()
        sys.exit(1)

if __name__ == "__main__":
    main()