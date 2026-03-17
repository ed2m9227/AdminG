from datetime import datetime
from pydantic import BaseModel, ConfigDict

class CustomerInfo(BaseModel):
    id: int
    full_name: str
    
    class Config:
        from_attributes = True

class AppointmentBase(BaseModel):
    customer_id: int
    service_id: int | None = None
    service_package_id: int | None = None
    scheduled_at: datetime
    duration_minutes: int | None = None
    status: str | None = "scheduled"
    notes: str | None = None

class AppointmentCreate(AppointmentBase):
    pass

class AppointmentUpdate(BaseModel):
    service_id: int | None = None
    service_package_id: int | None = None
    scheduled_at: datetime | None = None
    duration_minutes: int | None = None
    status: str | None = None
    notes: str | None = None

class AppointmentOut(AppointmentBase):
    id: int
    customer: CustomerInfo | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
