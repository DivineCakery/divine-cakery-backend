#!/usr/bin/env python3

import re

# Helper function to normalize phone numbers with +91 country code
def normalize_phone_number(phone: str) -> str:
    """
    Normalize phone number to include +91 country code.
    - If already has +91, return as is
    - If starts with 91 (without +), add +
    - If 10 digits, add +91
    - Otherwise return as is
    """
    if not phone:
        return phone
    
    # Remove all non-digit characters except +
    cleaned = re.sub(r'[^\d+]', '', phone)
    
    # If already has +91
    if cleaned.startswith('+91'):
        return cleaned
    
    # If starts with 91 (11 or 12 digits total)
    if cleaned.startswith('91') and len(cleaned) in [12, 13]:
        return '+' + cleaned
    
    # If 10 digits (Indian mobile number)
    if len(cleaned) == 10:
        return '+91' + cleaned
    
    # If starts with 0, remove it and add +91 (old format)
    if cleaned.startswith('0') and len(cleaned) == 11:
        return '+91' + cleaned[1:]
    
    # Return as is if we can't determine the format
    return cleaned if cleaned.startswith('+') else '+' + cleaned

# Test cases
test_cases = [
    ("9876543210", "+919876543210"),  # 10 digits
    ("+919876543210", "+919876543210"),  # Already normalized
    ("919876543210", "+919876543210"),  # 11 digits starting with 91
    ("09876543210", "+919876543210"),  # Old format with 0
    ("+91 9876 543 210", "+919876543210"),  # With spaces
    ("91-9876-543-210", "+919876543210"),  # With dashes
    ("", ""),  # Empty string
    (None, None),  # None value
]

print("Testing phone number normalization:")
print("=" * 50)

for i, (input_phone, expected) in enumerate(test_cases, 1):
    try:
        result = normalize_phone_number(input_phone)
        status = "✅ PASS" if result == expected else "❌ FAIL"
        print(f"Test {i}: {status}")
        print(f"  Input:    {repr(input_phone)}")
        print(f"  Expected: {repr(expected)}")
        print(f"  Got:      {repr(result)}")
        print()
    except Exception as e:
        print(f"Test {i}: ❌ ERROR - {e}")
        print(f"  Input: {repr(input_phone)}")
        print()

print("Testing complete!")