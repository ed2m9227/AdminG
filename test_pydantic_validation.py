#!/usr/bin/env python
"""Test Pydantic validation for payment items"""

from app.modules.payments.schemas import PaymentItemCreate, PaymentCreate
from decimal import Decimal

# Simular lo que envía el frontend en Caja
payment_item_data = {
    "description": "WishCats x 500 gr",
    "unit_price": 35000,  # float que envía el frontend
    "quantity": 1,  # parseFloat(1)
    "source_type": "product",
    "inventory_item_id": 5,  # parseInt
    "service_id": None
}

print("=" * 60)
print("TESTING: PaymentItemCreate validation")
print("=" * 60)
print(f"Input data: {payment_item_data}")

try:
    item = PaymentItemCreate(**payment_item_data)
    print("✅ SUCCESS: Item created")
    print(f"  - quantity: {item.quantity} (type: {type(item.quantity).__name__})")
    print(f"  - unit_price: {item.unit_price} (type: {type(item.unit_price).__name__})")
    print(f"  - inventory_item_id: {item.inventory_item_id} (type: {type(item.inventory_item_id).__name__})")
except Exception as e:
    print(f"❌ ERROR: {e}")

# Test with string IDs (what might be sent)
payment_item_data_strings = {
    "description": "WishCats x 500 gr",
    "unit_price": "35000",  # string
    "quantity": "1",  # string
    "source_type": "product",
    "inventory_item_id": "5",  # string ID
    "service_id": ""  # empty string
}

print("\n" + "=" * 60)
print("TESTING: PaymentItemCreate with STRING types")
print("=" * 60)
print(f"Input data: {payment_item_data_strings}")

try:
    item = PaymentItemCreate(**payment_item_data_strings)
    print("✅ SUCCESS: Item created")
    print(f"  - quantity: {item.quantity} (type: {type(item.quantity).__name__})")
    print(f"  - unit_price: {item.unit_price} (type: {type(item.unit_price).__name__})")
    print(f"  - inventory_item_id: {item.inventory_item_id} (type: {type(item.inventory_item_id).__name__})")
except Exception as e:
    print(f"❌ ERROR: {e}")
