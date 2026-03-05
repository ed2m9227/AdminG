import urllib.request
import json

# Get a token first
login_data = json.dumps({
    'email': 'fabian@admin.com',
    'password': 'admin123'
}).encode('utf-8')

login_req = urllib.request.Request(
    'http://127.0.0.1:8000/users/login',
    data=login_data,
    headers={'Content-Type': 'application/json'}
)

try:
    with urllib.request.urlopen(login_req) as response:
        login_result = json.loads(response.read().decode('utf-8'))
        token = login_result['access_token']
        print(f'Token obtained: {token[:50]}...\n')
        
        # Call reports dashboard
        reports_req = urllib.request.Request(
            'http://127.0.0.1:8000/reports/dashboard',
            headers={'Authorization': f'Bearer {token}'}
        )
        
        with urllib.request.urlopen(reports_req) as reports_response:
            reports_data = json.loads(reports_response.read().decode('utf-8'))
            print('Reports Dashboard Response:')
            print(json.dumps(reports_data, indent=2))
            
except Exception as e:
    print(f'Error: {e}')
