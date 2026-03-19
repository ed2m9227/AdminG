from pydantic import BaseModel, ConfigDict, model_validator
from datetime import datetime
from decimal import Decimal

class CustomerInfo(BaseModel):
    id: int
    full_name: str
    
    model_config = ConfigDict(from_attributes=True)

# ============ PAYMENT ITEM ============
class PaymentItemCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    
    source_type: str  # 'service', 'product', 'custom'
    service_id: int | None = None
    inventory_item_id: int | None = None
    description: str
    quantity: float | int = 1
    unit_price: float | int
    
    @model_validator(mode='before')
    @classmethod
    def coerce_types(cls, data):
        """Convert numeric strings and ensure correct types before validation"""
        if isinstance(data, dict):
            # Coerce IDs
            for id_field in ['service_id', 'inventory_item_id']:
                if id_field in data and data[id_field] is not None:
                    val = data[id_field]
                    if isinstance(val, str):
                        try:
                            data[id_field] = int(val) if val.strip() else None
                        except (ValueError, AttributeError):
                            data[id_field] = None
                    elif isinstance(val, float):
                        data[id_field] = int(val) if val else None
            
            # Coerce numeric values
            for num_field in ['quantity', 'unit_price']:
                if num_field in data:
                    val = data[num_field]
                    if isinstance(val, str):
                        try:
                            data[num_field] = float(val)
                        except ValueError:
                            data[num_field] = 0
        return data

class PaymentItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    payment_id: int
    source_type: str
    service_id: int | None = None
    inventory_item_id: int | None = None
    description: str
    quantity: Decimal
    unit_price: Decimal
    subtotal: Decimal
    created_at: datetime

# ============ PAYMENT ============
class PaymentCreate(BaseModel):
    customer_id: int
    invoice_id: int | None = None  # NUEVO: Vincular a factura
    appointment_id: int | None = None
    service_id: int | None = None  # DEPRECATED
    service_package_id: int | None = None  # DEPRECATED
    amount: Decimal
    method: str  # "cash", "card", "transfer", "montelibano_gen"
    concept: str | None = None  # DEPRECATED: Usar payment_items en su lugar
    reference: str | None = None
    notes: str | None = None
    status: str | None = None
    payment_items: list[PaymentItemCreate] | None = None  # NUEVO: Items desagregados

class PaymentUpdate(BaseModel):
    status: str | None = None
    concept: str | None = None  # DEPRECATED
    service_id: int | None = None
    notes: str | None = None

class PaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    customer_id: int
    customer: CustomerInfo | None = None
    invoice_id: int | None = None  # NUEVO
    appointment_id: int | None = None
    service_id: int | None = None
    service_package_id: int | None = None
    amount: Decimal
    discount_amount: Decimal | None = None
    final_amount: Decimal
    concept: str | None = None
    method: str
    status: str
    reference: str | None = None
    paid_at: datetime | None = None
    payment_items: list[PaymentItemOut] = []  # NUEVO: Items del pago
    created_at: datetime

class PlanUpgradeRequest(BaseModel):
    new_plan: str  # "basic", "plus", "start", "max"
    payment_method: str  # "card", "transfer"

class PlanUpgradeResponse(BaseModel):
    success: bool
    message: str
    new_plan: str
    payment_id: int | None = None
    upgrade_date: datetime

class MontelibanoGenIntegration(BaseModel):
    """Integración con MontelibanoGen para promociones"""
    promo_code: str
    discount_percentage: float  # 7% para AdminG Basic
    applicable_plans: list[str]
    is_active: bool

