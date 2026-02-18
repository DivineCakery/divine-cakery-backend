#!/usr/bin/env python3
"""
Backend Test Suite for Divine Cakery - Forgot Password (Admin-Assisted OTP) Flow Testing
Testing the complete forgot password flow as requested in the review.
"""

import requests
import json
from datetime import datetime
import time

# Configuration
BASE_URL = "https://reports-timezone-bug.preview.emergentagent.com/api"
TEST_USER_IDENTIFIER = "OLDSKOOLOWNER"  # Username to test with
TEST_NEW_PASSWORD = "NewTestPassword123"

# Global variables for test data
test_data = {
    'otp': None,
    'reset_token': None,
    'otp_id': None,
    'original_password': None
}

def log_test(step, message, status="INFO"):
    """Log test steps with timestamp"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] [{status}] {step}: {message}")

def test_step_1_request_password_reset():
    """
    Step 1: POST /api/auth/request-password-reset
    Test requesting password reset OTP generation
    """
    log_test("STEP 1", "Testing Password Reset Request")
    
    try:
        # Prepare request data
        payload = {"identifier": TEST_USER_IDENTIFIER}
        
        log_test("STEP 1", f"Sending POST request to {BASE_URL}/auth/request-password-reset")
        log_test("STEP 1", f"Payload: {json.dumps(payload, indent=2)}")
        
        # Make request
        response = requests.post(
            f"{BASE_URL}/auth/request-password-reset",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        log_test("STEP 1", f"Response Status Code: {response.status_code}")
        log_test("STEP 1", f"Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            log_test("STEP 1", f"Response Data: {json.dumps(data, indent=2)}")
            
            # Validate required fields in response
            required_fields = ['otp', 'whatsapp_url', 'phone', 'otp_id', 'username']
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                log_test("STEP 1", f"❌ MISSING REQUIRED FIELDS: {missing_fields}", "ERROR")
                return False
            
            # Store OTP and other data for next steps
            test_data['otp'] = data.get('otp')
            test_data['otp_id'] = data.get('otp_id')
            
            log_test("STEP 1", f"✅ OTP Generated Successfully: {test_data['otp']}")
            log_test("STEP 1", f"✅ OTP ID: {test_data['otp_id']}")
            log_test("STEP 1", f"✅ WhatsApp URL Generated: {data.get('whatsapp_url')}")
            log_test("STEP 1", f"✅ Phone Number: {data.get('phone')}")
            log_test("STEP 1", f"✅ Username: {data.get('username')}")
            
            return True
        else:
            log_test("STEP 1", f"❌ REQUEST FAILED - Status: {response.status_code}", "ERROR")
            log_test("STEP 1", f"❌ Error Response: {response.text}", "ERROR")
            return False
            
    except requests.exceptions.RequestException as e:
        log_test("STEP 1", f"❌ NETWORK ERROR: {str(e)}", "ERROR")
        return False
    except Exception as e:
        log_test("STEP 1", f"❌ UNEXPECTED ERROR: {str(e)}", "ERROR")
        return False

def test_step_2_verify_otp():
    """
    Step 2: POST /api/auth/verify-otp
    Test OTP verification and reset token generation
    """
    log_test("STEP 2", "Testing OTP Verification")
    
    if not test_data['otp']:
        log_test("STEP 2", "❌ No OTP available from Step 1", "ERROR")
        return False
    
    try:
        # Prepare request data
        payload = {
            "identifier": TEST_USER_IDENTIFIER,
            "otp": test_data['otp']
        }
        
        log_test("STEP 2", f"Sending POST request to {BASE_URL}/auth/verify-otp")
        log_test("STEP 2", f"Payload: {json.dumps(payload, indent=2)}")
        
        # Make request
        response = requests.post(
            f"{BASE_URL}/auth/verify-otp",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        log_test("STEP 2", f"Response Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            log_test("STEP 2", f"Response Data: {json.dumps(data, indent=2)}")
            
            # Validate required fields in response
            required_fields = ['reset_token']
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                log_test("STEP 2", f"❌ MISSING REQUIRED FIELDS: {missing_fields}", "ERROR")
                return False
            
            # Store reset token for next step
            test_data['reset_token'] = data.get('reset_token')
            
            log_test("STEP 2", f"✅ OTP Verified Successfully")
            log_test("STEP 2", f"✅ Reset Token Generated: {test_data['reset_token']}")
            
            return True
        else:
            log_test("STEP 2", f"❌ OTP VERIFICATION FAILED - Status: {response.status_code}", "ERROR")
            log_test("STEP 2", f"❌ Error Response: {response.text}", "ERROR")
            return False
            
    except requests.exceptions.RequestException as e:
        log_test("STEP 2", f"❌ NETWORK ERROR: {str(e)}", "ERROR")
        return False
    except Exception as e:
        log_test("STEP 2", f"❌ UNEXPECTED ERROR: {str(e)}", "ERROR")
        return False

def test_step_3_reset_password():
    """
    Step 3: POST /api/auth/reset-password
    Test password reset with new password
    """
    log_test("STEP 3", "Testing Password Reset")
    
    if not test_data['reset_token']:
        log_test("STEP 3", "❌ No reset token available from Step 2", "ERROR")
        return False
    
    try:
        # Prepare request data
        payload = {
            "reset_token": test_data['reset_token'],
            "new_password": TEST_NEW_PASSWORD
        }
        
        log_test("STEP 3", f"Sending POST request to {BASE_URL}/auth/reset-password")
        log_test("STEP 3", f"Payload: {json.dumps({'reset_token': test_data['reset_token'], 'new_password': '***HIDDEN***'}, indent=2)}")
        
        # Make request
        response = requests.post(
            f"{BASE_URL}/auth/reset-password",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        log_test("STEP 3", f"Response Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            log_test("STEP 3", f"Response Data: {json.dumps(data, indent=2)}")
            
            # Check for success message
            if data.get('message') == 'Password reset successful':
                log_test("STEP 3", f"✅ Password Reset Successful")
                return True
            else:
                log_test("STEP 3", f"❌ Unexpected response message: {data.get('message')}", "ERROR")
                return False
        else:
            log_test("STEP 3", f"❌ PASSWORD RESET FAILED - Status: {response.status_code}", "ERROR")
            log_test("STEP 3", f"❌ Error Response: {response.text}", "ERROR")
            return False
            
    except requests.exceptions.RequestException as e:
        log_test("STEP 3", f"❌ NETWORK ERROR: {str(e)}", "ERROR")
        return False
    except Exception as e:
        log_test("STEP 3", f"❌ UNEXPECTED ERROR: {str(e)}", "ERROR")
        return False

def test_step_4_login_with_new_password():
    """
    Step 4: POST /api/auth/login
    Test login with the new password to verify it works
    """
    log_test("STEP 4", "Testing Login with New Password")
    
    try:
        # Prepare request data
        payload = {
            "username": TEST_USER_IDENTIFIER,
            "password": TEST_NEW_PASSWORD
        }
        
        log_test("STEP 4", f"Sending POST request to {BASE_URL}/auth/login")
        log_test("STEP 4", f"Payload: {json.dumps({'username': TEST_USER_IDENTIFIER, 'password': '***HIDDEN***'}, indent=2)}")
        
        # Make request
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        log_test("STEP 4", f"Response Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            # Don't log the full response as it contains the access token
            log_test("STEP 4", f"Login successful - received access token")
            
            # Check for access_token in response
            if data.get('access_token'):
                log_test("STEP 4", f"✅ Login with New Password Successful")
                log_test("STEP 4", f"✅ Access Token Received: {data.get('access_token')[:20]}...")
                return True
            else:
                log_test("STEP 4", f"❌ No access_token in response", "ERROR")
                return False
        else:
            log_test("STEP 4", f"❌ LOGIN FAILED - Status: {response.status_code}", "ERROR")
            log_test("STEP 4", f"❌ Error Response: {response.text}", "ERROR")
            return False
            
    except requests.exceptions.RequestException as e:
        log_test("STEP 4", f"❌ NETWORK ERROR: {str(e)}", "ERROR")
        return False
    except Exception as e:
        log_test("STEP 4", f"❌ UNEXPECTED ERROR: {str(e)}", "ERROR")
        return False

def test_edge_cases():
    """
    Test edge cases and error conditions
    """
    log_test("EDGE CASES", "Testing Error Conditions")
    
    # Test 1: Invalid user identifier
    log_test("EDGE CASES", "Testing invalid user identifier")
    try:
        payload = {"identifier": "NONEXISTENTUSER123"}
        response = requests.post(
            f"{BASE_URL}/auth/request-password-reset",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        if response.status_code == 404:
            log_test("EDGE CASES", "✅ Correctly returns 404 for non-existent user")
        else:
            log_test("EDGE CASES", f"❌ Expected 404, got {response.status_code}", "ERROR")
    except Exception as e:
        log_test("EDGE CASES", f"❌ Error testing invalid user: {str(e)}", "ERROR")
    
    # Test 2: Invalid OTP
    log_test("EDGE CASES", "Testing invalid OTP")
    try:
        payload = {
            "identifier": TEST_USER_IDENTIFIER,
            "otp": "000000"
        }
        response = requests.post(
            f"{BASE_URL}/auth/verify-otp",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        if response.status_code == 400:
            log_test("EDGE CASES", "✅ Correctly returns 400 for invalid OTP")
        else:
            log_test("EDGE CASES", f"❌ Expected 400, got {response.status_code}", "ERROR")
    except Exception as e:
        log_test("EDGE CASES", f"❌ Error testing invalid OTP: {str(e)}", "ERROR")
    
    # Test 3: Invalid reset token
    log_test("EDGE CASES", "Testing invalid reset token")
    try:
        payload = {
            "reset_token": "invalid-token-12345",
            "new_password": "TestPassword123"
        }
        response = requests.post(
            f"{BASE_URL}/auth/reset-password",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        if response.status_code == 400:
            log_test("EDGE CASES", "✅ Correctly returns 400 for invalid reset token")
        else:
            log_test("EDGE CASES", f"❌ Expected 400, got {response.status_code}", "ERROR")
    except Exception as e:
        log_test("EDGE CASES", f"❌ Error testing invalid reset token: {str(e)}", "ERROR")

def main():
    """
    Run the complete forgot password flow test
    """
    print("=" * 80)
    print("DIVINE CAKERY - FORGOT PASSWORD (ADMIN-ASSISTED OTP) FLOW TEST")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"Test User: {TEST_USER_IDENTIFIER}")
    print(f"Test Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80)
    
    # Initialize test results
    results = {
        'step_1': False,
        'step_2': False,
        'step_3': False,
        'step_4': False
    }
    
    # Execute tests in sequence
    try:
        # Step 1: Request password reset
        results['step_1'] = test_step_1_request_password_reset()
        
        if results['step_1']:
            # Step 2: Verify OTP
            results['step_2'] = test_step_2_verify_otp()
            
            if results['step_2']:
                # Step 3: Reset password
                results['step_3'] = test_step_3_reset_password()
                
                if results['step_3']:
                    # Step 4: Login with new password
                    results['step_4'] = test_step_4_login_with_new_password()
    
        # Test edge cases
        test_edge_cases()
        
    except KeyboardInterrupt:
        log_test("MAIN", "Test interrupted by user", "WARNING")
    except Exception as e:
        log_test("MAIN", f"Unexpected error during testing: {str(e)}", "ERROR")
    
    # Print final results
    print("\n" + "=" * 80)
    print("FINAL TEST RESULTS")
    print("=" * 80)
    
    total_steps = len(results)
    passed_steps = sum(results.values())
    
    for step, passed in results.items():
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{step.replace('_', ' ').upper()}: {status}")
    
    print(f"\nOVERALL RESULT: {passed_steps}/{total_steps} steps passed")
    
    if passed_steps == total_steps:
        print("🎉 ALL TESTS PASSED - Forgot Password Flow is Working Correctly!")
    else:
        print("⚠️ SOME TESTS FAILED - Issues Found in Forgot Password Flow")
    
    print("=" * 80)
    
    return passed_steps == total_steps

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)