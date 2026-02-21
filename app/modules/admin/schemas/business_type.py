"""
Business Type Schemas
Pydantic models for business type validation
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class BusinessTypeBase(BaseModel):
    code: str = Field(..., min_length=1, max_length=50)
    label: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    icon: Optional[str] = Field(None, max_length=50)
    is_active: bool = Field(default=True)
    default_label_customers: str = Field(default="Cliente")
    default_label_appointments: str = Field(default="Cita")
    default_label_pets: str = Field(default="Mascota")
    supports_pets: bool = Field(default=False)
    order: int = Field(default=0)


class BusinessTypeCreate(BusinessTypeBase):
    pass


class BusinessTypeUpdate(BaseModel):
    label: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    icon: Optional[str] = Field(None, max_length=50)
    is_active: Optional[bool] = None
    default_label_customers: Optional[str] = None
    default_label_appointments: Optional[str] = None
    default_label_pets: Optional[str] = None
    supports_pets: Optional[bool] = None
    order: Optional[int] = None


class BusinessTypeOut(BusinessTypeBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
