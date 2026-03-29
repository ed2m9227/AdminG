from pydantic import BaseModel, field_validator
from datetime import datetime
from decimal import Decimal

class InventoryCategoryCreate(BaseModel):
    name: str
    description: str | None = None

class InventoryCategoryOut(BaseModel):
    id: int
    user_id: int
    name: str
    description: str | None
    created_at: datetime
    
    class Config:
        from_attributes = True

class InventoryItemCreate(BaseModel):
    category_id: int | None = None
    sku: str
    name: str
    description: str | None = None
    quantity: int = 0
    min_quantity: int = 5
    unit_price: Decimal
    cost: Decimal | None = None
    item_type: str = 'product'  # product, service, package
    
    @field_validator('item_type')
    @classmethod
    def validate_item_type(cls, v):
        allowed = ['product', 'service', 'package']
        if v not in allowed:
            raise ValueError(f"item_type debe ser una de {allowed}")
        return v

class InventoryItemUpdate(BaseModel):
    category_id: int | None = None
    sku: str | None = None
    name: str | None = None
    description: str | None = None
    quantity: int | None = None
    min_quantity: int | None = None
    unit_price: Decimal | None = None
    cost: Decimal | None = None
    is_active: bool | None = None
    item_type: str | None = None
    
    @field_validator('item_type')
    @classmethod
    def validate_item_type(cls, v):
        if v is not None:
            allowed = ['product', 'service', 'package']
            if v not in allowed:
                raise ValueError(f"item_type debe ser una de {allowed}")
        return v

class InventoryItemOut(BaseModel):
    id: int
    user_id: int
    category_id: int | None
    sku: str
    name: str
    description: str | None
    quantity: int
    min_quantity: int
    unit_price: Decimal
    cost: Decimal | None
    item_type: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class InventoryMovementCreate(BaseModel):
    item_id: int
    type: str  # "entrada", "salida", "ajuste"
    quantity: int
    reason: str | None = None

class InventoryMovementOut(BaseModel):
    id: int
    item_id: int
    type: str
    quantity: int
    reason: str | None
    created_at: datetime
    
    class Config:
        from_attributes = True


# ------------ PACKAGES ------------
class InventoryPackageItem(BaseModel):
    item_id: int
    quantity: int

class InventoryPackageCreate(BaseModel):
    name: str
    description: str | None = None
    discount_percentage: float = 0
    items: list[InventoryPackageItem]

    @field_validator('discount_percentage')
    @classmethod
    def validate_discount(cls, v):
        if v < 0 or v > 100:
            raise ValueError('discount_percentage debe estar entre 0 y 100')
        return v

class InventoryPackageOut(BaseModel):
    id: int
    user_id: int
    name: str
    description: str | None
    discount_percentage: float
    base_price: float
    final_price: float
    is_active: bool
    items: list[InventoryPackageItem]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
