from pydantic import BaseModel, ConfigDict
from datetime import datetime

class PlanLimitBase(BaseModel):
    limit_name: str
    limit_value: int

class PlanLimitOut(PlanLimitBase):
    id: int
    plan_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PlanFeatureBase(BaseModel):
    feature_code: str
    feature_name: str
    is_enabled: bool = True

class PlanFeatureOut(PlanFeatureBase):
    id: int
    plan_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PlanBase(BaseModel):
    name: str
    display_name: str
    price: float
    description: str | None = None
    is_active: bool = True

class PlanCreate(PlanBase):
    pass

class PlanOut(PlanBase):
    id: int
    created_at: datetime
    updated_at: datetime
    limits: list[PlanLimitOut] = []
    features: list[PlanFeatureOut] = []

    model_config = ConfigDict(from_attributes=True)
