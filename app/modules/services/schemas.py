from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel

class ServiceCreate(BaseModel):
    name: str
    description: str | None = None
    price: Decimal
    duration_minutes: int | None = None
    is_active: bool = True

class ServiceUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    price: Decimal | None = None
    duration_minutes: int | None = None
    is_active: bool | None = None

class ServiceOut(BaseModel):
    id: int
    user_id: int | None
    name: str
    description: str | None
    price: Decimal
    duration_minutes: int | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
