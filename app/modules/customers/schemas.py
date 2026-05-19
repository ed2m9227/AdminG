from datetime import datetime
from pydantic import BaseModel, ConfigDict

class CustomerBase(BaseModel):
    full_name: str
    identification: str | None = None
    phone: str | None = None
    email: str | None = None
    notes: str | None = None

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(BaseModel):
    full_name: str | None = None
    identification: str | None = None
    phone: str | None = None
    email: str | None = None
    notes: str | None = None

class CustomerOut(CustomerBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
