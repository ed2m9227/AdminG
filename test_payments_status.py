#!/usr/bin/env python
import requests
import json

# Login
login_response = requests.post('http://127.0.0.1:8000/auth/login', json={
    'email': 'fabian@admin.com',
    'password': '123456'
})

if login_response.status_code != 200:
    print('Login failed:', login_response.status_code)
    print(login_response.text)
    exit(1)

token = login_response.json()['access_token']
headers = {'Authorization': f'Bearer {token}'}

# Get payments
payments_response = requests.get('http://127.0.0.1:8000/payments/', headers=headers)
print('Payments Response Status:', payments_response.status_code)

if payments_response.status_code == 200:
    payments = payments_response.json()
    if payments:
        print(f'\nTotal Payments: {len(payments)}')
        print('\nPayments Summary:')
        for p in payments:
            print(f"  ID: {p['id']}, Status: {p['status']}, Amount: {p['final_amount']}")
        
        print('\nFirst Payment Detail:')
        print(json.dumps(payments[0], indent=2, default=str))
    else:
        print('No payments found')
else:
    print('Error:', payments_response.text)
