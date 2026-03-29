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


class ServicePackageItemCreate(BaseModel):
    service_id: int
    quantity: int = 1


class ServicePackageCreate(BaseModel):
    name: str
    description: str | None = None
    discount_percentage: Decimal = Decimal("0")
    items: list[ServicePackageItemCreate]
    is_active: bool = True


class ServicePackageUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    discount_percentage: Decimal | None = None
    items: list[ServicePackageItemCreate] | None = None
    is_active: bool | None = None


class ServicePackageItemOut(BaseModel):
    id: int
    service_id: int
    quantity: int

    class Config:
        from_attributes = True


class ServicePackageOut(BaseModel):
    id: int
    user_id: int
    name: str
    description: str | None
    discount_percentage: Decimal
    base_price: Decimal
    final_price: Decimal
    is_active: bool
    created_at: datetime
    updated_at: datetime
    items: list[ServicePackageItemOut]

    class Config:
        from_attributes = True
