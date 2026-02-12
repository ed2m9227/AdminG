from datetime import datetime
from pydantic import BaseModel, ConfigDict

class AppointmentBase(BaseModel):
    customer_id: int
    service_id: int | None = None
    scheduled_at: datetime
    duration_minutes: int | None = None
    status: str | None = "scheduled"
    notes: str | None = None

class AppointmentCreate(AppointmentBase):
    pass

class AppointmentUpdate(BaseModel):
    service_id: int | None = None
    scheduled_at: datetime | None = None
    duration_minutes: int | None = None
    status: str | None = None
    notes: str | None = None

class AppointmentOut(AppointmentBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
