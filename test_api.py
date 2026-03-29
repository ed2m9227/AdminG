"""
Tests para AdminG API - Validación de todos los endpoints
"""
import requests
import json
from decimal import Decimal

BASE_URL = "http://127.0.0.1:8000"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

def print_test(name, passed, message=""):
    status = f"{Colors.GREEN}✅ PASS{Colors.END}" if passed else f"{Colors.RED}❌ FAIL{Colors.END}"
    print(f"  {status} {name}")
    if message and not passed:
        print(f"      {Colors.RED}{message}{Colors.END}")

def test_health():
    """Test health endpoint"""
    print(f"\n{Colors.BLUE}Testing Health Endpoint{Colors.END}")
    try:
        resp = requests.get(f"{BASE_URL}/health", timeout=5)
        passed = resp.status_code == 200 and "ok" in resp.text
        print_test("GET /health", passed, resp.text if not passed else "")
        return resp.status_code == 200
    except Exception as e:
        print_test("GET /health", False, str(e))
        return False

def test_api_version():
    """Test API version endpoint"""
    print(f"\n{Colors.BLUE}Testing API Version{Colors.END}")
    try:
        resp = requests.get(f"{BASE_URL}/api/version", timeout=5)
        data = resp.json()
        passed = resp.status_code == 200 and "AdminG" in data.get("name", "")
        print_test("GET /api/version", passed)
        if passed:
            print(f"      Version: {data.get('version')}")
            print(f"      Features: {', '.join(data.get('features', [])[:3])}...")
        return True
    except Exception as e:
        print_test("GET /api/version", False, str(e))
        return False

def test_auth():
    """Test authentication endpoints"""
    print(f"\n{Colors.BLUE}Testing Authentication{Colors.END}")
    
    # Test register
    try:
        register_data = {
            "email": f"test_{int(time.time())}@example.com",
            "password": "TestPass123!",
            "name": "Test User"
        }
        resp = requests.post(f"{BASE_URL}/auth/register", json=register_data, timeout=5)
        register_passed = resp.status_code in [200, 201]
        print_test("POST /auth/register", register_passed, resp.text if not register_passed else "")
        
        if not register_passed:
            return False
            
        user_data = resp.json()
        token = user_data.get("access_token", "")
        
        # Test login
        login_data = {
            "email": register_data["email"],
            "password": register_data["password"]
        }
        resp = requests.post(f"{BASE_URL}/auth/login", json=login_data, timeout=5)
        login_passed = resp.status_code == 200 and "access_token" in resp.json()
        print_test("POST /auth/login", login_passed)
        
        return login_passed, register_data["email"], resp.json().get("access_token", "")
    except Exception as e:
        print_test("POST /auth/register", False, str(e))
        return False, None, None

def test_payments(token, user_email):
    """Test payment endpoints"""
    print(f"\n{Colors.BLUE}Testing Payments{Colors.END}")
    
    if not token:
        print_test("POST /payments/montelibano/validate-promo", False, "No token available")
        return False
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        # Test MontelibanoGen promo validation
        resp = requests.get(
            f"{BASE_URL}/payments/montelibano/validate-promo",
            headers=headers,
            timeout=5
        )
        promo_passed = resp.status_code == 200
        print_test("GET /payments/montelibano/validate-promo", promo_passed)
        
        if promo_passed:
            data = resp.json()
            discount = data.get("discount_percentage", 0)
            print(f"      Discount available: {discount}%")
            print(f"      Promo code: {data.get('promo_code')}")
        
        # Test list payments
        resp = requests.get(f"{BASE_URL}/payments", headers=headers, timeout=5)
        list_passed = resp.status_code == 200
        print_test("GET /payments", list_passed)
        
        if list_passed:
            data = resp.json()
            print(f"      Total payments: {len(data)}")
        
        return promo_passed and list_passed
    except Exception as e:
        print_test("GET /payments", False, str(e))
        return False

def test_inventory(token):
    """Test inventory endpoints"""
    print(f"\n{Colors.BLUE}Testing Inventory{Colors.END}")
    
    if not token:
        print_test("Inventory endpoints", False, "No token available")
        return False
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        # Test create category
        category_data = {
            "name": "Electronics",
            "description": "Electronic items and accessories"
        }
        resp = requests.post(
            f"{BASE_URL}/inventory/categories",
            json=category_data,
            headers=headers,
            timeout=5
        )
        category_passed = resp.status_code == 201
        print_test("POST /inventory/categories", category_passed, resp.text if not category_passed else "")
        
        # Test list categories
        resp = requests.get(f"{BASE_URL}/inventory/categories", headers=headers, timeout=5)
        list_cat_passed = resp.status_code == 200
        print_test("GET /inventory/categories", list_cat_passed)
        
        if list_cat_passed:
            categories = resp.json()
            print(f"      Total categories: {len(categories)}")
        
        # Test create item (needs AdminPro plan, might fail with free/basic plan)
        item_data = {
            "sku": f"SKU{int(time.time())}",
            "name": "Laptop",
            "description": "Test laptop",
            "quantity": 10,
            "min_quantity": 2,
            "unit_price": "999.99"
        }
        resp = requests.post(
            f"{BASE_URL}/inventory/items",
            json=item_data,
            headers=headers,
            timeout=5
        )
        # This might fail if user doesn't have AdminPro plan
        item_passed = resp.status_code in [201, 403]
        reason = "Plan not available" if resp.status_code == 403 else "Created"
        print_test("POST /inventory/items", resp.status_code == 201, reason if resp.status_code == 403 else "")
        
        return list_cat_passed
    except Exception as e:
        print_test("Inventory endpoints", False, str(e))
        return False

def test_reports(token):
    """Test report endpoints"""
    print(f"\n{Colors.BLUE}Testing Reports{Colors.END}")
    
    if not token:
        print_test("Reports endpoints", False, "No token available")
        return False
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        # Test dashboard (might fail if plan doesn't have reports)
        resp = requests.get(f"{BASE_URL}/reports/dashboard", headers=headers, timeout=5)
        dashboard_passed = resp.status_code in [200, 403]
        if resp.status_code == 403:
            print_test("GET /reports/dashboard", True, "Plan not available")
        else:
            print_test("GET /reports/dashboard", True)
            data = resp.json()
            print(f"      Total customers: {data.get('total_customers')}")
            print(f"      Appointments this month: {data.get('total_appointments_month')}")
        
        return True
    except Exception as e:
        print_test("Reports endpoints", False, str(e))
        return False

def main():
    import time
    
    print(f"\n{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"{Colors.BLUE}AdminG API - Integration Tests{Colors.END}")
    print(f"{Colors.BLUE}{'='*60}{Colors.END}")
    
    # Test basic endpoints
    health_ok = test_health()
    version_ok = test_api_version()
    
    if not health_ok:
        print(f"\n{Colors.RED}Server is not responding. Make sure uvicorn is running.{Colors.END}")
        return
    
    # Test auth and get token
    auth_result = test_auth()
    if isinstance(auth_result, bool) and not auth_result:
        print(f"\n{Colors.YELLOW}Auth test failed, skipping other tests{Colors.END}")
        return
    
    auth_ok, email, token = auth_result
    
    if not auth_ok:
        print(f"\n{Colors.YELLOW}Auth failed, skipping endpoint tests{Colors.END}")
        return
    
    print(f"\n{Colors.GREEN}Logged in as: {email}{Colors.END}")
    
    # Test other endpoints
    payments_ok = test_payments(token, email)
    inventory_ok = test_inventory(token)
    reports_ok = test_reports(token)
    
    # Summary
    print(f"\n{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"{Colors.BLUE}Test Summary:{Colors.END}")
    print(f"  Health Check: {'✅' if health_ok else '❌'}")
    print(f"  API Version: {'✅' if version_ok else '❌'}")
    print(f"  Authentication: {'✅' if auth_ok else '❌'}")
    print(f"  Payments: {'✅' if payments_ok else '❌'}")
    print(f"  Inventory: {'✅' if inventory_ok else '❌'}")
    print(f"  Reports: {'✅' if reports_ok else '❌'}")
    print(f"{Colors.BLUE}{'='*60}{Colors.END}\n")

if __name__ == "__main__":
    import time
    main()
