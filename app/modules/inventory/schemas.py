from pydantic import BaseModel
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
