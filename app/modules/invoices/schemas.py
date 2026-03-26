from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional, List
from decimal import Decimal


class InvoiceItemCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    
    description: str
    quantity: float | int | str = Field(default=1, ge=0)
    unit_price: float | int | str = Field(ge=0)
    inventory_item_id: Optional[int | str] = None
    service_id: Optional[int | str] = None
    source_type: Optional[str] = None  # 'service', 'product', or 'custom' - for reference only


class InvoiceItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    description: str
    quantity: Decimal
    unit_price: Decimal
    subtotal: Decimal
    inventory_item_id: Optional[int] = None
    service_id: Optional[int] = None


class InvoiceCreate(BaseModel):
    customer_id: int
    payment_id: Optional[int] = None
    authorization_id: Optional[int] = None
    items: List[InvoiceItemCreate]
    notes: Optional[str] = None
    apply_iva: bool = True  # Si aplicar IVA automáticamente
    apply_retencion: bool = False  # Si aplicar retención
    iva_percentage: Optional[Decimal] = None  # Permitir override manual
    retencion_percentage: Optional[Decimal] = None


class InvoiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    invoice_number: str
    user_id: int
    customer_id: int
    payment_id: Optional[int] = None
    authorization_id: Optional[int] = None
    subtotal: Decimal
    iva_percentage: Decimal
    iva_amount: Decimal
    retencion_percentage: Decimal
    retencion_amount: Decimal
    total: Decimal
    notes: Optional[str] = None
    status: str
    issued_at: datetime
    due_date: Optional[datetime] = None
    items: List[InvoiceItemResponse] = Field(default_factory=list)


class TaxConfigCreate(BaseModel):
    name: str
    tax_type: str  # 'iva', 'retencion', 'other'
    percentage: Decimal = Field(ge=0, le=100)
    is_active: bool = True
    description: Optional[str] = None
    applies_to: str = "all"  # 'all', 'products', 'services'


class TaxConfigResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    name: str
    tax_type: str
    percentage: Decimal
    is_active: bool
    description: Optional[str] = None
    applies_to: str
    created_at: datetime
    updated_at: datetime
