from datetime import datetime
from pydantic import BaseModel, Field


class VeterinaryOperationCreate(BaseModel):
    customer_id: int | None = None
    owner_name: str = Field(min_length=2, max_length=120)
    owner_phone: str | None = Field(default=None, max_length=50)
    animal_name: str = Field(min_length=2, max_length=120)
    animal_type: str | None = Field(default=None, max_length=80)
    service_description: str = Field(min_length=5, max_length=1000)
    whatsapp_number: str | None = Field(default=None, max_length=50)
    location: str | None = Field(default=None, max_length=180)
    scheduled_at: datetime | None = None
    notes: str | None = Field(default=None, max_length=1000)


class VeterinaryOperationUpdate(BaseModel):
    status: str | None = None
    location: str | None = None
    whatsapp_number: str | None = None
    notes: str | None = None
    scheduled_at: datetime | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None


class VeterinaryOperationOut(BaseModel):
    id: int
    customer_id: int | None
    owner_name: str
    owner_phone: str | None
    animal_name: str
    animal_type: str | None
    service_description: str
    status: str
    location: str | None
    whatsapp_number: str | None
    whatsapp_link: str | None
    scheduled_at: datetime | None
    started_at: datetime | None
    completed_at: datetime | None
    notes: str | None
    created_by: int | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
