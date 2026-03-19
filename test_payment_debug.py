#!/usr/bin/env python
"""Debug script to test payment creation with actual data"""
import requests
import json

BASE_URL = "http://127.0.0.1:8000"

# Try multiple credentials
credentials = [
    {"email": "admin@adminsystems.com", "password": "admin123"},
    {"email": "max@example.com", "password": "max123"},
]

token = None
for creds in credentials:
    # Login
    print(f"🔓 Trying login with {creds['email']}...")
    response = requests.post(f"{BASE_URL}/auth/login", json=creds)
    print(f"Login Status: {response.status_code}")
    
    if response.status_code == 200:
        token = response.json().get("access_token")
        print(f"✓ Token: {token[:20]}...")
        break
    else:
        print(f"Failed: {response.text[:100]}")

if not token:
    print("❌ Could not login with any credentials")
    exit(1)

headers = {"Authorization": f"Bearer {token}"}

# Get customers
print("\n📋 Getting customers...")
response = requests.get(f"{BASE_URL}/customers/", headers=headers)
customers = response.json()
if customers:
    customer_id = customers[0]['id']
    print(f"✓ Using customer: {customer_id}")
else:
    print("❌ No customers found")
    exit(1)

# Test 1: Simple payment with items (what CashRegister sends)
print("\n💳 Testing payment with items...")
payment_data = {
    "customer_id": customer_id,
    "payment_items": [
        {
            "description": "Test Service",
            "unit_price": 30000,
            "quantity": 1,
            "source_type": "service",
            "service_id": 1,
            "inventory_item_id": None
        }
    ],
    "amount": 30000,
    "method": "cash"
}

print(f"Sending: {json.dumps(payment_data, indent=2)}")
response = requests.post(
    f"{BASE_URL}/payments/",
    json=payment_data,
    headers=headers
)

print(f"Status: {response.status_code}")
print(f"Response: {response.text}")

if response.status_code != 201:
    print("❌ Payment creation failed")
else:
    print("✓ Payment created successfully")

# Test 2: With string IDs (what might be sent)
print("\n\n💳 Testing payment with STRING IDs...")
payment_data_string = {
    "customer_id": customer_id,
    "payment_items": [
        {
            "description": "Test Service",
            "unit_price": "30000",
            "quantity": "1",
            "source_type": "service",
            "service_id": "1",
            "inventory_item_id": None
        }
    ],
    "amount": 30000,
    "method": "cash"
}

print(f"Sending: {json.dumps(payment_data_string, indent=2)}")
response = requests.post(
    f"{BASE_URL}/payments/",
    json=payment_data_string,
    headers=headers
)

print(f"Status: {response.status_code}")
print(f"Response: {response.text}")

if response.status_code != 201:
    print("❌ Payment creation failed")
else:
    print("✓ Payment created successfully")
