#!/usr/bin/env python
"""Test full payment validation like frontend sends it"""

from app.modules.payments.schemas import PaymentCreate, PaymentItemCreate
from decimal import Decimal

# Simular exactamente lo que envía el frontend en Caja
# Esto es lo que sale del frontend cuando hace un pago con 1 producto + 1 servicio

payment_data = {
    "customer_id": None,  # Sin cliente seleccionado
    "payment_items": [
        {
            "description": "WishCats x 500 gr",
            "unit_price": 35000,
            "quantity": 1,
            "source_type": "product",
            "inventory_item_id": 1,
            "service_id": None
        },
        {
            "description": "Cirujía",
            "unit_price": 30000,
            "quantity": 1,
            "source_type": "service",
            "inventory_item_id": None,
            "service_id": 3
        }
    ],
    "amount": 65000,
    "method": "cash"
}

print("=" * 60)
print("TESTING: Full PaymentCreate validation")
print("=" * 60)
print(f"Input data (keys): {list(payment_data.keys())}")

try:
    payment = PaymentCreate(**payment_data)
    print("✅ SUCCESS: Payment created")
    print(f"  - customer_id: {payment.customer_id}")
    print(f"  - method: {payment.method}")
    print(f"  - amount: {payment.amount} (type: {type(payment.amount).__name__})")
    print(f"  - items: {len(payment.payment_items) if payment.payment_items else 0}")
except Exception as e:
    print(f"❌ ERROR: {type(e).__name__}")
    print(f"   {str(e)[:500]}")


# Test con cliente
payment_data_with_customer = {
    "customer_id": 1,  # Con cliente
    "payment_items": [
        {
            "description": "WishCats x 500 gr",
            "unit_price": 35000,
            "quantity": 1,
            "source_type": "product",
            "inventory_item_id": 1,
            "service_id": None
        }
    ],
    "amount": 35000,
    "method": "cash"
}

print("\n" + "=" * 60)
print("TESTING: PaymentCreate WITH customer")
print("=" * 60)

try:
    payment = PaymentCreate(**payment_data_with_customer)
    print("✅ SUCCESS: Payment created")
    print(f"  - customer_id: {payment.customer_id} (type: {type(payment.customer_id).__name__})")
    print(f"  - amount: {payment.amount} (type: {type(payment.amount).__name__})")
except Exception as e:
    print(f"❌ ERROR: {type(e).__name__}")
    print(f"   {str(e)[:500]}")
