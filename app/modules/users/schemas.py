from datetime import datetime
from pydantic import BaseModel, ConfigDict

class UserBase(BaseModel):
    email: str
    role: str = "viewer"
    plan: str = "free"

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    email: str | None = None
    role: str | None = None
    plan: str | None = None
    is_active: bool | None = None

class UserOut(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class UserOutWithRole(UserOut):
    role: str
    plan: str