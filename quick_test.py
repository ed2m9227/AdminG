#!/usr/bin/env python
"""
AdminG API - Simple Test Script
"""
try:
    import requests
    import json
    import time
    
    print("\n" + "="*60)
    print("AdminG API - Quick Tests")
    print("="*60 + "\n")
    
    BASE = "http://127.0.0.1:8000"
    
    # Test 1: Health
    print("[1] Testing /health endpoint...")
    try:
        r = requests.get(f"{BASE}/health", timeout=3)
        print(f"    Status: {r.status_code}")
        print(f"    Response: {r.json()}")
    except Exception as e:
        print(f"    ERROR: {e}")
    
    # Test 2: Version
    print("\n[2] Testing /api/version endpoint...")
    try:
        r = requests.get(f"{BASE}/api/version", timeout=3)
        print(f"    Status: {r.status_code}")
        data = r.json()
        print(f"    Name: {data.get('name')}")
        print(f"    Version: {data.get('version')}")
        print(f"    Features: {len(data.get('features', []))} features available")
    except Exception as e:
        print(f"    ERROR: {e}")
    
    # Test 3: Auth Register
    print("\n[3] Testing /auth/register...")
    try:
        email = f"test_{int(time.time())}@test.com"
        data = {
            "email": email,
            "password": "TestPass123!",
            "name": "Test User"
        }
        r = requests.post(f"{BASE}/auth/register", json=data, timeout=5)
        print(f"    Status: {r.status_code}")
        if r.status_code in [200, 201]:
            resp = r.json()
            token = resp.get("access_token", "")
            print(f"    ✅ User created: {email}")
            print(f"    Token: {token[:20]}...")
            
            # Test 4: Auth Login
            print("\n[4] Testing /auth/login...")
            login_data = {
                "email": email,
                "password": "TestPass123!"
            }
            r = requests.post(f"{BASE}/auth/login", json=login_data, timeout=5)
            print(f"    Status: {r.status_code}")
            if r.status_code == 200:
                print("    ✅ Login successful")
                token = r.json().get("access_token", "")
            else:
                print(f"    ❌ Login failed: {r.text}")
                token = None
            
            # Test 5: MontelibanoGen validation
            if token:
                print("\n[5] Testing /payments/montelibano/validate-promo...")
                headers = {"Authorization": f"Bearer {token}"}
                try:
                    r = requests.get(f"{BASE}/payments/montelibano/validate-promo", headers=headers, timeout=5)
                    print(f"    Status: {r.status_code}")
                    if r.status_code == 200:
                        data = r.json()
                        print(f"    ✅ Eligible: {data.get('is_eligible')}")
                        print(f"    Plan: {data.get('current_plan')}")
                        print(f"    Discount: {data.get('discount_percentage')}%")
                    else:
                        print(f"    Info: {r.text[:100]}")
                except Exception as e:
                    print(f"    ERROR: {e}")
                
                # Test 6: Payments list
                print("\n[6] Testing GET /payments...")
                try:
                    r = requests.get(f"{BASE}/payments", headers=headers, timeout=5)
                    print(f"    Status: {r.status_code}")
                    if r.status_code == 200:
                        data = r.json()
                        print(f"    ✅ Payments found: {len(data)}")
                    else:
                        print(f"    Info: {r.text[:100]}")
                except Exception as e:
                    print(f"    ERROR: {e}")
                
                # Test 7: Inventory categories
                print("\n[7] Testing GET /inventory/categories...")
                try:
                    r = requests.get(f"{BASE}/inventory/categories", headers=headers, timeout=5)
                    print(f"    Status: {r.status_code}")
                    if r.status_code == 200:
                        data = r.json()
                        print(f"    ✅ Categories found: {len(data)}")
                    elif r.status_code == 403:
                        print("    ℹ️  Feature not available for this plan")
                except Exception as e:
                    print(f"    ERROR: {e}")
                
                # Test 8: Reports Dashboard
                print("\n[8] Testing GET /reports/dashboard...")
                try:
                    r = requests.get(f"{BASE}/reports/dashboard", headers=headers, timeout=5)
                    print(f"    Status: {r.status_code}")
                    if r.status_code == 200:
                        data = r.json()
                        print("    ✅ Dashboard metrics retrieved")
                        print(f"       Total customers: {data.get('total_customers')}")
                        print(f"       Revenue: ${data.get('total_revenue_month')}")
                    elif r.status_code == 403:
                        print("    ℹ️  Feature not available for this plan")
                except Exception as e:
                    print(f"    ERROR: {e}")
        else:
            print(f"    ❌ Register failed: {r.text}")
    except Exception as e:
        print(f"    ERROR: {e}")
    
    print("\n" + "="*60)
    print("✅ Tests completed!")
    print("="*60 + "\n")

except ImportError as e:
    print(f"ERROR: Missing module: {e}")
    print("Run: pip install requests")
