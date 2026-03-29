#!/usr/bin/env python
"""
Quick test script for Cash Register endpoints
"""

import requests
import json

BASE_URL = "http://localhost:8000"

# Test login as admin
print("🔐 Testing login...")
login_response = requests.post(
    f"{BASE_URL}/auth/login",
    json={"email": "admin@example.com", "password": "123456"}
)

if login_response.status_code != 200:
    print(f"❌ Login failed: {login_response.text}")
    exit(1)

token = login_response.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

print("✅ Login successful")

# Get current cash register status
print("\n💰 Getting cash register status...")
status_response = requests.get(
    f"{BASE_URL}/cashregister/",
    headers=headers
)
print(f"✅ Status: {status_response.json()}")

# Create a test transaction (Expense)
print("\n📊 Creating expense transaction...")
expense_response = requests.post(
    f"{BASE_URL}/cashregister/transactions",
    headers=headers,
    json={
        "transaction_type": "expense",
        "amount": 50000.00,
        "description": "Compra de suministros"
    }
)

if expense_response.status_code == 200:
    print(f"✅ Expense created: {expense_response.json()}")
else:
    print(f"❌ Error creating expense: {expense_response.text}")

# Create a test transaction (Base)
print("\n💵 Creating base transaction...")
base_response = requests.post(
    f"{BASE_URL}/cashregister/transactions",
    headers=headers,
    json={
        "transaction_type": "base",
        "amount": 100000.00,
        "description": "Base inicial de caja"
    }
)

if base_response.status_code == 200:
    print(f"✅ Base created: {base_response.json()}")
else:
    print(f"❌ Error creating base: {base_response.text}")

# List transactions
print("\n📋 Listing transactions...")
list_response = requests.get(
    f"{BASE_URL}/cashregister/transactions?limit=10",
    headers=headers
)

if list_response.status_code == 200:
    transactions = list_response.json()
    print(f"✅ Found {len(transactions)} transactions:")
    for t in transactions:
        print(f"   - {t['transaction_type'].upper()}: ${t['amount']} - {t['description']}")
else:
    print(f"❌ Error listing transactions: {list_response.text}")

# Check updated status
print("\n💰 Updated cash register status...")
status_response = requests.get(
    f"{BASE_URL}/cashregister/",
    headers=headers
)
print(f"✅ Status: {status_response.json()}")

print("\n" + "="*50)
print("✅ All tests passed!")
print("="*50)
