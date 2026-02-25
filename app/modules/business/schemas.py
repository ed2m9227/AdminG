from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import Any

class BusinessConfigurationBase(BaseModel):
    business_type: str
    business_name: str | None = None
    business_description: str | None = None
    customer_label: str = "Cliente"
    pet_label: str | None = "Mascota"
    appointment_label: str = "Cita"
    pet_fields_enabled: dict[str, Any] | None = None
    customer_fields_enabled: dict[str, Any] | None = None
    custom_fields: dict[str, Any] | None = None
    has_pet_relationship: bool = True
    plan: str | None = None  # Plan a guardar para el usuario

class BusinessConfigurationCreate(BusinessConfigurationBase):
    pass

class BusinessConfigurationUpdate(BaseModel):
    business_type: str | None = None
    business_name: str | None = None
    business_description: str | None = None
    customer_label: str | None = None
    pet_label: str | None = None
    appointment_label: str | None = None
    pet_fields_enabled: dict[str, Any] | None = None
    customer_fields_enabled: dict[str, Any] | None = None
    custom_fields: dict[str, Any] | None = None
    has_pet_relationship: bool | None = None
    plan: str | None = None  # Plan a guardar para el usuario

class BusinessConfigurationOut(BusinessConfigurationBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class BusinessTypeInfo(BaseModel):
    """Información sobre tipos de negocio disponibles"""
    type: str
    label: str
    description: str | None = None
    customer_label: str
    pet_label: str | None
    has_pet: bool
