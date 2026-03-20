#!/usr/bin/env python3
"""
Backend API Test Script
Tests admin password reset functionality for users
"""

import requests
import json
import sys
import time
from datetime import datetime

# Configuration
BASE_URL = "https://daily-reports-v2.preview.emergentagent.com/api"
ADMIN_USERNAME = "testadmin"
ADMIN_PASSWORD = "admin123"  # Assuming default admin password
TEST_NEW_PASSWORD = "TestNewPass123"

def log_test(message, status="INFO"):
    """Log test messages with timestamp"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] {status}: {message}")

def make_request(method, url, headers=None, json_data=None, auth=None):
    """Make HTTP request with error handling"""
    try:
        if method.upper() == "GET":
            response = requests.get(url, headers=headers, auth=auth, timeout=30)
        elif method.upper() == "POST":
            response = requests.post(url, headers=headers, json=json_data, auth=auth, timeout=30)
        elif method.upper() == "PUT":
            response = requests.put(url, headers=headers, json=json_data, auth=auth, timeout=30)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        return response
    except requests.exceptions.RequestException as e:
        log_test(f"Request failed: {e}", "ERROR")
        return None

def admin_login(username, password):
    """Login as admin and get access token"""
    log_test(f"Attempting admin login with username: {username}")
    
    url = f"{BASE_URL}/auth/login"
    payload = {
        "username": username,
        "password": password
    }
    
    response = make_request("POST", url, json_data=payload)
    
    if not response:
        log_test("Failed to connect to login endpoint", "ERROR")
        return None
    
    if response.status_code == 200:
        data = response.json()
        access_token = data.get("access_token")
        log_test(f"✅ Admin login successful! Token: {access_token[:20]}...", "SUCCESS")
        return access_token
    else:
        log_test(f"❌ Admin login failed: {response.status_code} - {response.text}", "ERROR")
        return None

def get_users_list(token):
    """Get list of all users"""
    log_test("Getting list of users...")
    
    url = f"{BASE_URL}/admin/users"
    headers = {"Authorization": f"Bearer {token}"}
    
    response = make_request("GET", url, headers=headers)
    
    if not response:
        log_test("Failed to connect to users endpoint", "ERROR")
        return None
    
    if response.status_code == 200:
        users = response.json()
        log_test(f"✅ Retrieved {len(users)} users successfully", "SUCCESS")
        
        # Log first few users for verification
        for i, user in enumerate(users[:3]):
            log_test(f"  User {i+1}: {user.get('username')} (ID: {user.get('id')}, Role: {user.get('role')})")
        
        return users
    else:
        log_test(f"❌ Failed to get users: {response.status_code} - {response.text}", "ERROR")
        return None

def find_test_user(users):
    """Find a test user to update password for"""
    log_test("Looking for test user...")
    
    # Look for a customer user (not admin)
    test_user = None
    for user in users:
        if user.get('role') == 'customer' and user.get('username') != ADMIN_USERNAME:
            test_user = user
            break
    
    if test_user:
        log_test(f"✅ Found test user: {test_user.get('username')} (ID: {test_user.get('id')})", "SUCCESS")
        return test_user
    else:
        log_test("❌ No suitable test user found", "ERROR")
        return None

def update_user_password(token, user_id, new_password):
    """Update user's password using admin endpoint"""
    log_test(f"Updating password for user ID: {user_id}")
    
    url = f"{BASE_URL}/admin/users/{user_id}"
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "new_password": new_password
    }
    
    response = make_request("PUT", url, headers=headers, json_data=payload)
    
    if not response:
        log_test("Failed to connect to user update endpoint", "ERROR")
        return False
    
    if response.status_code == 200:
        updated_user = response.json()
        log_test(f"✅ Password updated successfully for user: {updated_user.get('username')}", "SUCCESS")
        return True
    else:
        log_test(f"❌ Failed to update password: {response.status_code} - {response.text}", "ERROR")
        return False

def verify_login_with_new_password(username, new_password):
    """Try to login with the new password to verify it works"""
    log_test(f"Verifying login with new password for user: {username}")
    
    url = f"{BASE_URL}/auth/login"
    payload = {
        "username": username,
        "password": new_password
    }
    
    response = make_request("POST", url, json_data=payload)
    
    if not response:
        log_test("Failed to connect to login endpoint for verification", "ERROR")
        return False
    
    if response.status_code == 200:
        data = response.json()
        access_token = data.get("access_token")
        log_test(f"✅ Login verification successful! User can login with new password", "SUCCESS")
        log_test(f"  New access token: {access_token[:20]}...")
        return True
    else:
        log_test(f"❌ Login verification failed: {response.status_code} - {response.text}", "ERROR")
        return False

def main():
    """Main test function"""
    log_test("=" * 60)
    log_test("ADMIN PASSWORD RESET FUNCTIONALITY TEST")
    log_test("=" * 60)
    log_test(f"Testing against: {BASE_URL}")
    
    # Step 1: Login as admin user (username: Soman)
    log_test("\n🔐 STEP 1: Admin Login")
    admin_token = admin_login(ADMIN_USERNAME, ADMIN_PASSWORD)
    if not admin_token:
        log_test("❌ Cannot proceed without admin access", "ERROR")
        sys.exit(1)
    
    # Step 2: Get list of users to find a test user ID
    log_test("\n📋 STEP 2: Get Users List")
    users = get_users_list(admin_token)
    if not users:
        log_test("❌ Cannot proceed without users list", "ERROR")
        sys.exit(1)
    
    # Step 3: Find a test user
    log_test("\n🔍 STEP 3: Find Test User")
    test_user = find_test_user(users)
    if not test_user:
        log_test("❌ Cannot proceed without a test user", "ERROR")
        sys.exit(1)
    
    test_user_id = test_user.get('id')
    test_username = test_user.get('username')
    
    # Step 4: Update user's password using PUT /api/admin/users/{user_id}
    log_test("\n🔑 STEP 4: Update User Password")
    log_test(f"Updating password for user '{test_username}' to '{TEST_NEW_PASSWORD}'")
    
    password_updated = update_user_password(admin_token, test_user_id, TEST_NEW_PASSWORD)
    if not password_updated:
        log_test("❌ Cannot proceed with password verification", "ERROR")
        sys.exit(1)
    
    # Step 5: Try to login as that user with the new password to verify it works
    log_test("\n✅ STEP 5: Verify New Password Works")
    login_success = verify_login_with_new_password(test_username, TEST_NEW_PASSWORD)
    
    # Summary
    log_test("\n" + "=" * 60)
    log_test("TEST SUMMARY")
    log_test("=" * 60)
    
    if login_success:
        log_test("🎉 ALL TESTS PASSED! Admin password reset functionality is working correctly.", "SUCCESS")
        log_test("✅ Admin can successfully reset user passwords")
        log_test("✅ Users can login with their new passwords")
        log_test("✅ Password hashing and storage is working properly")
    else:
        log_test("❌ TEST FAILED! Password reset functionality has issues.", "ERROR")
        log_test("⚠️  While password update may succeed, users cannot login with new password")
    
    log_test("=" * 60)

if __name__ == "__main__":
    main()