#!/usr/bin/env python3
"""
End-to-End Services Integration Test
Verifies: Services → Appointments → Payments with concept synchronization
"""

import requests
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000"
HEADERS = {}

def log_info(msg):
    print(f"ℹ️  {msg}")

def log_success(msg):
    print(f"✅ {msg}")

def log_error(msg):
    print(f"❌ {msg}")

def log_step(num, msg):
    print(f"\n{num}️⃣  {msg}")
    print("-" * 60)

def login(email="admin@test.com", password="admin123"):
    """Authenticate and get JWT token"""
    log_step("1", "AUTHENTICATION")
    
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            data={"username": email, "password": password},
            timeout=5
        )
        
        if response.status_code == 200:
            token = response.json()["access_token"]
            global HEADERS
            HEADERS = {"Authorization": f"Bearer {token}"}
            log_success(f"Logged in as {email}")
            return True
        else:
            log_error(f"Login failed: {response.text}")
            return False
    except Exception as e:
        log_error(f"Login error: {e}")
        return False

def get_or_create_customer(name="Integration Test Customer"):
    """Get existing customer or create new one"""
    log_step("2", "CUSTOMER MANAGEMENT")
    
    try:
        # Try to get existing customers
        response = requests.get(f"{BASE_URL}/customers/", headers=HEADERS, timeout=5)
        
        if response.status_code == 200:
            customers = response.json()
            if customers:
                customer = customers[0]
                log_success(f"Using existing customer: {customer['full_name']} (ID: {customer['id']})")
                return customer
        
        # Create new customer
        log_info("Creating new customer...")
        response = requests.post(
            f"{BASE_URL}/customers/",
            json={
                "full_name": name,
                "email": "test@integration.local",
                "phone": "3001234567"
            },
            headers=HEADERS,
            timeout=5
        )
        
        if response.status_code == 201:
            customer = response.json()
            log_success(f"Created customer: {customer['full_name']} (ID: {customer['id']})")
            return customer
        else:
            log_error(f"Failed to create customer: {response.text}")
            return None
    except Exception as e:
        log_error(f"Customer management error: {e}")
        return None

def get_or_create_services():
    """Get existing services or create new ones"""
    log_step("3", "SERVICES MANAGEMENT")
    
    SERVICE_DEFS = [
        {"name": "Baño Completo", "unit_price": 50000},
        {"name": "Corte de Cabello", "unit_price": 35000},
        {"name": "Peinado", "unit_price": 25000},
    ]
    
    try:
        # Try to get existing services
        response = requests.get(f"{BASE_URL}/inventory/services", headers=HEADERS, timeout=5)
        
        if response.status_code == 200:
            services = response.json()
            if len(services) >= 1:
                log_success(f"Found {len(services)} existing services")
                return services[:1]  # Use first service
        
        # Create new services
        services = []
        for svc_def in SERVICE_DEFS:
            log_info(f"Creating service: {svc_def['name']}...")
            
            response = requests.post(
                f"{BASE_URL}/inventory/services",
                json=svc_def,
                headers=HEADERS,
                timeout=5
            )
            
            if response.status_code == 201:
                service = response.json()
                services.append(service)
                log_success(f"Created: {service['name']} (${service['unit_price']:,} COP)")
            else:
                log_error(f"Failed to create service: {response.text}")
        
        return services
    except Exception as e:
        log_error(f"Services management error: {e}")
        return None

def create_appointment_with_service(customer_id, service_id):
    """Create appointment with selected service"""
    log_step("4", "APPOINTMENT CREATION")
    
    try:
        scheduled_at = (datetime.now() + timedelta(hours=24)).isoformat()
        
        log_info(f"Creating appointment for customer {customer_id} with service {service_id}...")
        
        response = requests.post(
            f"{BASE_URL}/appointments/",
            json={
                "customer_id": customer_id,
                "scheduled_at": scheduled_at,
                "service_id": service_id,
                "duration_minutes": 60,
                "status": "scheduled",
                "notes": "Created by E2E test"
            },
            headers=HEADERS,
            timeout=5
        )
        
        if response.status_code == 201:
            appointment = response.json()
            log_success(f"Created appointment (ID: {appointment['id']})")
            log_info(f"  Service ID: {appointment.get('service_id')}")
            log_info(f"  Scheduled: {appointment['scheduled_at']}")
            return appointment
        else:
            log_error(f"Failed to create appointment: {response.text}")
            return None
    except Exception as e:
        log_error(f"Appointment creation error: {e}")
        return None

def create_payment_with_service(customer_id, service_id, service_name, amount):
    """Create payment with service and concept synchronized"""
    log_step("5", "PAYMENT CREATION")
    
    try:
        log_info(f"Creating payment for customer {customer_id}...")
        log_info(f"  Service: {service_name}")
        log_info(f"  Amount: ${amount:,} COP")
        
        response = requests.post(
            f"{BASE_URL}/payments/",
            json={
                "customer_id": customer_id,
                "service_id": service_id,
                "amount": amount,
                "method": "cash",
                "concept": service_name,  # Concept synced from service
                "status": "completed"
            },
            headers=HEADERS,
            timeout=5
        )
        
        if response.status_code == 201:
            payment = response.json()
            log_success(f"Created payment (ID: {payment['id']})")
            log_info(f"  Amount: ${payment['amount']:,} COP")
            log_info(f"  Service ID: {payment.get('service_id')}")
            log_info(f"  Concept: {payment.get('concept')}")
            return payment
        else:
            log_error(f"Failed to create payment: {response.text}")
            return None
    except Exception as e:
        log_error(f"Payment creation error: {e}")
        return None

def verify_payment_concept(payment_id, expected_concept):
    """Verify payment concept is correctly synchronized"""
    log_step("6", "VERIFICATION - CONCEPT SYNCHRONIZATION")
    
    try:
        response = requests.get(
            f"{BASE_URL}/payments/{payment_id}",
            headers=HEADERS,
            timeout=5
        )
        
        if response.status_code == 200:
            payment = response.json()
            actual_concept = payment.get("concept")
            
            if actual_concept == expected_concept:
                log_success(f"✨ Concept synchronized correctly: '{actual_concept}'")
                return True
            else:
                log_error(f"Concept mismatch!")
                log_info(f"  Expected: '{expected_concept}'")
                log_info(f"  Actual: '{actual_concept}'")
                return False
        else:
            log_error(f"Failed to fetch payment: {response.text}")
            return False
    except Exception as e:
        log_error(f"Verification error: {e}")
        return False

def display_results(customer, service, appointment, payment, concept_verified):
    """Display final test results"""
    print("\n" + "=" * 60)
    print("END-TO-END TEST RESULTS")
    print("=" * 60)
    
    print("\n📊 Created Resources:")
    print(f"  • Customer: {customer['full_name']} (ID: {customer['id']})")
    print(f"  • Service: {service['name']} - ${service['unit_price']:,} COP (ID: {service['id']})")
    print(f"  • Appointment: ID {appointment['id']} (Service: {appointment.get('service_id')})")
    print(f"  • Payment: ID {payment['id']} (Concept: {payment.get('concept')})")
    
    print("\n✅ TEST FLOW COMPLETED:")
    print(f"  1. ✅ Authenticated as admin")
    print(f"  2. ✅ Retrieved/created customer")
    print(f"  3. ✅ Retrieved/created services from inventory")
    print(f"  4. ✅ Created appointment with service selection")
    print(f"  5. ✅ Created payment with service and concept")
    print(f"  6. {'✅' if concept_verified else '❌'} Verified concept is synchronized")
    
    print("\n" + "=" * 60)
    if concept_verified:
        print("🎉 ALL TESTS PASSED!")
        print("Services system is working end-to-end!")
    else:
        print("⚠️  Some tests failed. Check logs above.")
    print("=" * 60)
    
    print("\n📝 Next Steps (Frontend Testing):")
    print("  1. Visit http://localhost:3000")
    print("  2. Go to 'Citas' menu")
    print("  3. Click '+ Nueva Cita'")
    print("  4. Select customer: Test Customer")
    print("  5. Select service from dropdown (should show inventory items)")
    print("  6. Create appointment")
    print("  7. Go to 'Pagos' menu")
    print("  8. Click '+ Nuevo Pago'")
    print("  9. Verify service dropdown is populated")
    print(" 10. Verify concept field auto-fills from service selection")

def main():
    print("\n" + "=" * 60)
    print("🚀 SERVICES INTEGRATION END-TO-END TEST")
    print("=" * 60)
    
    # Run test sequence
    if not login():
        return
    
    customer = get_or_create_customer()
    if not customer:
        return
    
    services = get_or_create_services()
    if not services or len(services) == 0:
        return
    
    service = services[0]
    
    appointment = create_appointment_with_service(customer['id'], service['id'])
    if not appointment:
        return
    
    payment = create_payment_with_service(
        customer['id'],
        service['id'],
        service['name'],
        service['unit_price']
    )
    if not payment:
        return
    
    concept_verified = verify_payment_concept(payment['id'], service['name'])
    
    display_results(customer, service, appointment, payment, concept_verified)

if __name__ == "__main__":
    main()
