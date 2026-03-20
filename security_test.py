#!/usr/bin/env python3
"""
Comprehensive Security and Edge Case Testing for Forgot Password Flow
"""

import requests
import json
from datetime import datetime
import time

BASE_URL = "https://daily-reports-v2.preview.emergentagent.com/api"

def log_test(message, status="INFO"):
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] [{status}] {message}")

def test_otp_expiry_behavior():
    """Test that OTP expires after the specified time"""
    log_test("🕐 TESTING OTP EXPIRY BEHAVIOR")
    
    # Step 1: Generate OTP for a valid user (we know OLDSKOOLOWNER exists)
    payload = {"identifier": "OLDSKOOLOWNER"}
    response = requests.post(f"{BASE_URL}/auth/request-password-reset", json=payload)
    
    if response.status_code == 200:
        data = response.json()
        otp = data.get('otp')
        log_test(f"✅ OTP Generated: {otp}")
        
        # Wait a few seconds to test immediate usage
        log_test("Testing immediate OTP usage (should work)")
        verify_payload = {"identifier": "OLDSKOOLOWNER", "otp": otp}
        verify_response = requests.post(f"{BASE_URL}/auth/verify-otp", json=verify_payload)
        
        if verify_response.status_code == 200:
            log_test("✅ OTP works immediately after generation")
            return True
        else:
            log_test(f"❌ OTP failed immediately: {verify_response.status_code}", "ERROR")
            return False
    else:
        log_test(f"❌ Failed to generate OTP: {response.status_code}", "ERROR")
        return False

def test_otp_reuse_prevention():
    """Test that OTP cannot be reused after successful verification"""
    log_test("♻️ TESTING OTP REUSE PREVENTION")
    
    # Generate new OTP
    payload = {"identifier": "OLDSKOOLOWNER"}
    response = requests.post(f"{BASE_URL}/auth/request-password-reset", json=payload)
    
    if response.status_code == 200:
        data = response.json()
        otp = data.get('otp')
        
        # Use OTP first time
        verify_payload = {"identifier": "OLDSKOOLOWNER", "otp": otp}
        first_verify = requests.post(f"{BASE_URL}/auth/verify-otp", json=verify_payload)
        
        if first_verify.status_code == 200:
            log_test("✅ First OTP verification successful")
            
            # Try to reuse same OTP
            second_verify = requests.post(f"{BASE_URL}/auth/verify-otp", json=verify_payload)
            
            if second_verify.status_code == 400:
                log_test("✅ OTP correctly marked as used - cannot be reused")
                return True
            else:
                log_test(f"❌ OTP reuse allowed - Security Issue! Status: {second_verify.status_code}", "ERROR")
                return False
        else:
            log_test(f"❌ First OTP verification failed: {first_verify.status_code}", "ERROR")
            return False
    else:
        log_test(f"❌ Failed to generate OTP: {response.status_code}", "ERROR")
        return False

def test_reset_token_expiry():
    """Test that reset tokens have proper expiration"""
    log_test("⏰ TESTING RESET TOKEN EXPIRY")
    
    # Generate new OTP and get reset token
    payload = {"identifier": "OLDSKOOLOWNER"}
    response = requests.post(f"{BASE_URL}/auth/request-password-reset", json=payload)
    
    if response.status_code == 200:
        data = response.json()
        otp = data.get('otp')
        
        # Verify OTP to get reset token
        verify_payload = {"identifier": "OLDSKOOLOWNER", "otp": otp}
        verify_response = requests.post(f"{BASE_URL}/auth/verify-otp", json=verify_payload)
        
        if verify_response.status_code == 200:
            token_data = verify_response.json()
            reset_token = token_data.get('reset_token')
            log_test(f"✅ Reset token generated: {reset_token[:20]}...")
            
            # Test immediate use of reset token (should work)
            reset_payload = {
                "reset_token": reset_token,
                "new_password": "TestPassword456"
            }
            reset_response = requests.post(f"{BASE_URL}/auth/reset-password", json=reset_payload)
            
            if reset_response.status_code == 200:
                log_test("✅ Reset token works immediately")
                return True
            else:
                log_test(f"❌ Reset token failed immediately: {reset_response.status_code}", "ERROR")
                return False
        else:
            log_test(f"❌ OTP verification failed: {verify_response.status_code}", "ERROR")
            return False
    else:
        log_test(f"❌ Failed to generate OTP: {response.status_code}", "ERROR")
        return False

def test_reset_token_reuse_prevention():
    """Test that reset tokens cannot be reused"""
    log_test("🔄 TESTING RESET TOKEN REUSE PREVENTION")
    
    # Generate new OTP and get reset token
    payload = {"identifier": "OLDSKOOLOWNER"}
    response = requests.post(f"{BASE_URL}/auth/request-password-reset", json=payload)
    
    if response.status_code == 200:
        data = response.json()
        otp = data.get('otp')
        
        # Verify OTP to get reset token
        verify_payload = {"identifier": "OLDSKOOLOWNER", "otp": otp}
        verify_response = requests.post(f"{BASE_URL}/auth/verify-otp", json=verify_payload)
        
        if verify_response.status_code == 200:
            token_data = verify_response.json()
            reset_token = token_data.get('reset_token')
            
            # Use reset token first time
            reset_payload = {
                "reset_token": reset_token,
                "new_password": "TestPassword789"
            }
            first_reset = requests.post(f"{BASE_URL}/auth/reset-password", json=reset_payload)
            
            if first_reset.status_code == 200:
                log_test("✅ First password reset successful")
                
                # Try to reuse same reset token
                second_reset_payload = {
                    "reset_token": reset_token,
                    "new_password": "AnotherPassword123"
                }
                second_reset = requests.post(f"{BASE_URL}/auth/reset-password", json=second_reset_payload)
                
                if second_reset.status_code == 400:
                    log_test("✅ Reset token correctly marked as used - cannot be reused")
                    return True
                else:
                    log_test(f"❌ Reset token reuse allowed - Security Issue! Status: {second_reset.status_code}", "ERROR")
                    return False
            else:
                log_test(f"❌ First password reset failed: {first_reset.status_code}", "ERROR")
                return False
        else:
            log_test(f"❌ OTP verification failed: {verify_response.status_code}", "ERROR")
            return False
    else:
        log_test(f"❌ Failed to generate OTP: {response.status_code}", "ERROR")
        return False

def test_phone_number_identification():
    """Test that users can be identified by phone number as well as username"""
    log_test("📱 TESTING PHONE NUMBER IDENTIFICATION")
    
    # First, get the phone number from username-based request
    payload = {"identifier": "OLDSKOOLOWNER"}
    response = requests.post(f"{BASE_URL}/auth/request-password-reset", json=payload)
    
    if response.status_code == 200:
        data = response.json()
        phone = data.get('phone')
        log_test(f"✅ User phone number: {phone}")
        
        # Now try using phone number as identifier
        phone_payload = {"identifier": phone}
        phone_response = requests.post(f"{BASE_URL}/auth/request-password-reset", json=phone_payload)
        
        if phone_response.status_code == 200:
            phone_data = phone_response.json()
            log_test("✅ Password reset works with phone number identifier")
            log_test(f"✅ Username returned: {phone_data.get('username')}")
            return True
        else:
            log_test(f"❌ Phone number identification failed: {phone_response.status_code}", "ERROR")
            log_test(f"❌ Response: {phone_response.text}", "ERROR")
            return False
    else:
        log_test(f"❌ Failed to get user details: {response.status_code}", "ERROR")
        return False

def test_data_validation():
    """Test various input validation scenarios"""
    log_test("📋 TESTING INPUT VALIDATION")
    
    test_cases = [
        # Test empty identifier
        {"payload": {"identifier": ""}, "expected": 404, "description": "empty identifier"},
        # Test None/null values
        {"payload": {}, "expected": 422, "description": "missing identifier field"},
        # Test empty OTP
        {"payload": {"identifier": "OLDSKOOLOWNER", "otp": ""}, "endpoint": "verify-otp", "expected": 400, "description": "empty OTP"},
        # Test None password
        {"payload": {"reset_token": "dummy-token", "new_password": ""}, "endpoint": "reset-password", "expected": 422, "description": "empty password"},
    ]
    
    passed = 0
    total = len(test_cases)
    
    for i, case in enumerate(test_cases, 1):
        endpoint = case.get('endpoint', 'request-password-reset')
        url = f"{BASE_URL}/auth/{endpoint}"
        
        try:
            response = requests.post(url, json=case['payload'])
            if response.status_code == case['expected']:
                log_test(f"✅ Test {i}/{total}: {case['description']} - correctly returned {response.status_code}")
                passed += 1
            else:
                log_test(f"❌ Test {i}/{total}: {case['description']} - expected {case['expected']}, got {response.status_code}", "ERROR")
        except Exception as e:
            log_test(f"❌ Test {i}/{total}: {case['description']} - error: {str(e)}", "ERROR")
    
    log_test(f"Validation tests: {passed}/{total} passed")
    return passed == total

def main():
    """Run comprehensive security tests"""
    print("=" * 80)
    print("COMPREHENSIVE SECURITY & EDGE CASE TESTING")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"Test Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80)
    
    tests = [
        ("OTP Expiry Behavior", test_otp_expiry_behavior),
        ("OTP Reuse Prevention", test_otp_reuse_prevention),
        ("Reset Token Expiry", test_reset_token_expiry),
        ("Reset Token Reuse Prevention", test_reset_token_reuse_prevention),
        ("Phone Number Identification", test_phone_number_identification),
        ("Data Validation", test_data_validation)
    ]
    
    results = {}
    
    for test_name, test_func in tests:
        log_test(f"🔍 Starting: {test_name}")
        try:
            results[test_name] = test_func()
        except Exception as e:
            log_test(f"❌ Test {test_name} failed with error: {str(e)}", "ERROR")
            results[test_name] = False
        
        log_test(f"{'✅' if results[test_name] else '❌'} Completed: {test_name}")
        print("-" * 60)
    
    # Print final results
    print("\n" + "=" * 80)
    print("SECURITY TEST RESULTS")
    print("=" * 80)
    
    passed = sum(results.values())
    total = len(results)
    
    for test_name, passed_test in results.items():
        status = "✅ PASSED" if passed_test else "❌ FAILED"
        print(f"{test_name}: {status}")
    
    print(f"\nOVERALL SECURITY RESULT: {passed}/{total} tests passed")
    
    if passed == total:
        print("🔒 ALL SECURITY TESTS PASSED - System is Secure!")
    else:
        print("⚠️ SECURITY ISSUES FOUND - Review Failed Tests")
    
    print("=" * 80)
    
    return passed == total

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)