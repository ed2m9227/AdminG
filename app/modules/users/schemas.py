from datetime import datetime
from pydantic import BaseModel, ConfigDict, field_validator

class UserBase(BaseModel):
    email: str
    role: str = "viewer"
    plan: str = "free"

class UserCreate(UserBase):
    password: str
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters')
        if len(v) > 1000:
            raise ValueError('Password cannot be longer than 1000 characters')
        return v

class UserUpdate(BaseModel):
    email: str | None = None
    role: str | None = None
    plan: str | None = None
    is_active: bool | None = None

class UserOut(UserBase):
    id: int
    is_active: bool
    business_type: str | None = None
    plan_start_date: datetime
    plan_expires_at: datetime | None = None
    plan_expired: bool = False
    onboarding_completed: bool
    plan_paid: bool = True
    parent_user_id: int | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class UserOutWithRole(UserOut):
    role: str
    plan: str