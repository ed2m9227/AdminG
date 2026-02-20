#!/usr/bin/env python
"""
Quick registration test script
Tests the password validation fix
"""
import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_health():
    """Test health endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            print("✓ Server is running")
            return True
        else:
            print("✗ Server not responding")
            return False
    except Exception as e:
        print(f"✗ Server connection error: {e}")
        return False

def test_registration():
    """Test user registration with valid password"""
    print("\n=== Testing Registration ===\n")
    
    # Test 1: Valid registration
    print("Test 1: Valid password (12 chars)")
    payload = {
        "email": "test1@example.com",
        "password": "password123",
        "role": "viewer",
        "plan": "basic"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/register", json=payload)
        if response.status_code == 201:
            print("✓ Registration successful")
            print(f"  User ID: {response.json()['id']}")
        elif response.status_code == 400:
            print("⚠ Email already registered (expected if running twice)")
        else:
            print(f"✗ Registration failed: {response.status_code}")
            print(f"  Response: {response.text}")
    except Exception as e:
        print(f"✗ Request error: {e}")
    
    # Test 2: Short password (should fail)
    print("\nTest 2: Short password (5 chars - should fail)")
    payload2 = {
        "email": "test2@example.com",
        "password": "12345",
        "role": "viewer",
        "plan": "free"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/register", json=payload2)
        if response.status_code == 422:
            print("✓ Correctly rejected short password")
        else:
            print(f"✗ Expected validation error, got {response.status_code}")
    except Exception as e:
        print(f"✗ Request error: {e}")
    
    # Test 3: Very long password (should be handled)
    print("\nTest 3: Long password (80 chars - should be truncated)")
    payload3 = {
        "email": "test3@example.com",
        "password": "a" * 80,
        "role": "viewer",
        "plan": "free"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/register", json=payload3)
        if response.status_code == 422:
            print("✓ Correctly rejected long password")
        elif response.status_code == 201:
            print("⚠ Password was accepted (truncated to 72 bytes)")
        else:
            print(f"✗ Unexpected response: {response.status_code}")
            print(f"  Response: {response.text}")
    except Exception as e:
        print(f"✗ Request error: {e}")

def main():
    print("=== AdminG Registration Test ===\n")
    
    if not test_health():
        print("\n⚠ Make sure the server is running:")
        print("   python -m uvicorn app.main:app --reload")
        return
    
    test_registration()
    
    print("\n=== Test Complete ===")

if __name__ == "__main__":
    main()
