from pydantic import BaseModel
from datetime import datetime
from decimal import Decimal

class CustomerInfo(BaseModel):
    id: int
    full_name: str
    
    class Config:
        from_attributes = True

class PaymentCreate(BaseModel):
    customer_id: int
    appointment_id: int | None = None
    amount: Decimal
    method: str  # "cash", "card", "transfer", "montelibano_gen"
    reference: str | None = None
    notes: str | None = None
    status: str | None = None

class PaymentUpdate(BaseModel):
    status: str | None = None
    notes: str | None = None

class PaymentOut(BaseModel):
    id: int
    customer_id: int
    customer: CustomerInfo | None = None
    appointment_id: int | None
    amount: Decimal
    discount_amount: Decimal | None = None
    final_amount: Decimal
    method: str
    status: str
    reference: str | None = None
    paid_at: datetime | None = None
    created_at: datetime
    
    class Config:
        from_attributes = True

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
