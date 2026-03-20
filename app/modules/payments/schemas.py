from pydantic import BaseModel, ConfigDict
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
    service_id: int | str | None = None
    inventory_item_id: int | str | None = None
    description: str
    quantity: float | int | str = 1
    unit_price: float | int | str

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
    model_config = ConfigDict(str_strip_whitespace=True)
    
    customer_id: int | None = None
    invoice_id: int | str | None = None  # Accept flexible types
    appointment_id: int | str | None = None  # Accept flexible types
    service_id: int | str | None = None  # DEPRECATED
    service_package_id: int | str | None = None  # DEPRECATED
    amount: Decimal | float | int | str  # Accept any numeric type
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
    new_plan: str  # "starter", "pro", "max" (legacy aliases: basic/plus/start)
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

