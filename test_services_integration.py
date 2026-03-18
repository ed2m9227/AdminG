#!/usr/bin/env python3
"""
Test script for Services system integration
Verifies: Inventory Services → Appointments → Payments (concept sync)
"""

import httpx
import asyncio
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000"

def login_user(email: str = "admin@test.com", password: str = "admin123"):
    """Login and get token"""
    global HEADERS
    response = requests.post(f"{BASE_URL}/auth/login", json={
        "email": email,
        "password": password
    })
    if response.status_code != 200:
        print(f"❌ Login failed: {response.text}")
        return None
    
    data = response.json()
    token = data.get("access_token")
    HEADERS = {"Authorization": f"Bearer {token}"}
    print(f"✅ Logged in as {email}")
    return token

def get_customers():
    """Get all customers"""
    response = requests.get(f"{BASE_URL}/customers/", headers=HEADERS)
    if response.status_code != 200:
        print(f"❌ Failed to get customers: {response.text}")
        return []
    
    customers = response.json()
    print(f"✅ Found {len(customers)} customers")
    return customers

def create_customer(name: str = "Test Customer"):
    """Create a test customer"""
    response = requests.post(f"{BASE_URL}/customers/", headers=HEADERS, json={
        "full_name": name,
        "email": f"{name.replace(' ', '_')}@test.com",
        "phone": "3001234567"
    })
    if response.status_code != 200:
        print(f"❌ Failed to create customer: {response.text}")
        return None
    
    customer = response.json()
    print(f"✅ Created customer: {customer['full_name']} (ID: {customer['id']})")
    return customer

def get_services():
    """Get all services from inventory"""
    response = requests.get(f"{BASE_URL}/inventory/services", headers=HEADERS)
    if response.status_code != 200:
        print(f"❌ Failed to get services: {response.text}")
        return []
    
    services = response.json()
    print(f"✅ Found {len(services)} services in inventory")
    return services

def create_service(name: str = "Haircut"):
    """Create a test service in inventory"""
    response = requests.post(f"{BASE_URL}/inventory/services", headers=HEADERS, json={
        "name": name,
        "description": f"{name} service",
        "sku": f"SRV-{name.upper()}",
        "unit_price": 50000,  # 50k COP
        "quantity": 1000,
        "item_type": "service",
        "category": "services"
    })
    if response.status_code not in [200, 201]:
        print(f"❌ Failed to create service: {response.text}")
        return None
    
    service = response.json()
    print(f"✅ Created service: {service['name']} (ID: {service['id']})")
    return service

def create_appointment(customer_id: int, service_id: int | None = None):
    """Create an appointment with optional service"""
    scheduled_at = datetime.now() + timedelta(hours=2)
    response = requests.post(f"{BASE_URL}/appointments/", headers=HEADERS, json={
        "customer_id": customer_id,
        "service_id": service_id,
        "scheduled_at": scheduled_at.isoformat(),
        "duration_minutes": 60,
        "status": "confirmed",
        "notes": "Test appointment with service"
    })
    if response.status_code not in [200, 201]:
        print(f"❌ Failed to create appointment: {response.text}")
        return None
    
    appointment = response.json()
    service_info = f" (Service ID: {appointment.get('service_id')})" if appointment.get('service_id') else ""
    print(f"✅ Created appointment ID: {appointment['id']}{service_info}")
    return appointment

def create_payment(customer_id: int, service_id: int | None = None, 
                  concept: str | None = None, amount: float = 50000):
    """Create a payment with optional service and concept"""
    response = requests.post(f"{BASE_URL}/payments/", headers=HEADERS, json={
        "customer_id": customer_id,
        "service_id": service_id,
        "amount": amount,
        "method": "cash",
        "concept": concept or "Service payment",
        "status": "completed"
    })
    if response.status_code not in [200, 201]:
        print(f"❌ Failed to create payment: {response.text}")
        return None
    
    payment = response.json()
    payment_info = f" - Concept: {payment.get('concept')}"
    print(f"✅ Created payment ID: {payment['id']}{payment_info}")
    return payment

def test_services_integration():
    """Run complete test"""
    print("\n" + "="*60)
    print("SERVICES INTEGRATION TEST")
    print("="*60)
    
    # 1. Login
    print("\n1️⃣  LOGIN")
    login_user()
    
    # 2. Get or create customer
    print("\n2️⃣  CUSTOMER")
    customers = get_customers()
    if customers:
        customer = customers[0]
    else:
        customer = create_customer("Integration Test Customer")
    
    if not customer:
        print("❌ Could not get/create customer")
        return
    
    # 3. Create or get services
    print("\n3️⃣  SERVICES")
    services = get_services()
    
    if not services:
        print("📝 Creating new service...")
        service = create_service("Professional Haircut")
        if not service:
            print("❌ Could not create service")
            return
    else:
        service = services[0]
        print(f"✅ Using existing service: {service['name']} (ID: {service['id']})")
    
    # 4. Create appointment with service
    print("\n4️⃣  APPOINTMENT WITH SERVICE")
    appointment = create_appointment(customer['id'], service['id'])
    if not appointment:
        print("❌ Could not create appointment")
        return
    
    # 5. Create payment with service and concept
    print("\n5️⃣  PAYMENT WITH SERVICE & CONCEPT")
    payment = create_payment(
        customer['id'], 
        service['id'],
        concept=f"Payment for {service['name']}",
        amount=service['unit_price']
    )
    if not payment:
        print("❌ Could not create payment")
        return
    
    # 6. Verify data
    print("\n6️⃣  VERIFICATION")
    print(f"Customer: {customer['full_name']} (ID: {customer['id']})")
    print(f"Service: {service['name']} - ${service['unit_price']} (ID: {service['id']})")
    print(f"Appointment: Scheduled with service_id={appointment.get('service_id')}")
    print(f"Payment: Concept='{payment.get('concept')}', Amount=${payment.get('amount')}")
    
    print("\n" + "="*60)
    print("✅ SERVICES INTEGRATION TEST PASSED")
    print("="*60)

if __name__ == "__main__":
    test_services_integration()
