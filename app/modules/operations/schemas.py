from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field


class RiskCreate(BaseModel):
    area: str = Field(min_length=2, max_length=120)
    risk_type: str = Field(min_length=2, max_length=80)
    description: str = Field(min_length=5)
    probability_level: int = Field(ge=1, le=5)
    impact_level: int = Field(ge=1, le=5)
    owner_user_id: int | None = None


class RiskOut(BaseModel):
    id: int
    area: str
    risk_type: str
    description: str
    probability_level: int
    impact_level: int
    risk_level_auto: int
    category: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class IncidentCreate(BaseModel):
    risk_id: int | None = None
    area: str = Field(min_length=2, max_length=120)
    incident_type: str = Field(min_length=2, max_length=40)
    injured_people_count: int = Field(default=0, ge=0)
    lost_days: int = Field(default=0, ge=0)
    direct_cost: Decimal = Field(default=Decimal("0"), ge=0)
    indirect_cost: Decimal = Field(default=Decimal("0"), ge=0)
    description: str = Field(min_length=5)
    root_cause: str | None = None
    report_channel: str = Field(default="web", max_length=30)


class IncidentOut(BaseModel):
    id: int
    risk_id: int | None
    area: str
    incident_type: str
    injured_people_count: int
    lost_days: int
    direct_cost: Decimal
    indirect_cost: Decimal
    description: str
    root_cause: str | None
    report_channel: str
    created_at: datetime

    class Config:
        from_attributes = True


class ActionPlanCreate(BaseModel):
    incident_id: int | None = None
    risk_id: int | None = None
    title: str = Field(min_length=4, max_length=180)
    owner_user_id: int | None = None
    due_date: datetime | None = None
    estimated_cost: Decimal = Field(default=Decimal("0"), ge=0)


class ActionPlanOut(BaseModel):
    id: int
    incident_id: int | None
    risk_id: int | None
    title: str
    owner_user_id: int | None
    due_date: datetime | None
    status: str
    progress_pct: int
    estimated_cost: Decimal
    actual_cost: Decimal
    created_at: datetime

    class Config:
        from_attributes = True


class ExpenseCreate(BaseModel):
    employee_id: int | None = None
    category: str = Field(min_length=2, max_length=40)
    amount: Decimal = Field(ge=0)
    currency: str = Field(default="COP", max_length=10)
    expense_date: datetime | None = None
    channel_origin: str = Field(default="web", max_length=30)
    related_event_id: int | None = None
    related_incident_id: int | None = None
    receipt_url: str | None = None
    notes: str | None = None


class ExpenseOut(BaseModel):
    id: int
    employee_id: int | None
    category: str
    amount: Decimal
    currency: str
    expense_date: datetime
    channel_origin: str
    related_event_id: int | None
    related_incident_id: int | None
    status: str
    receipt_url: str | None
    notes: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class OperationsKpiOut(BaseModel):
    incidents_count: int
    active_risks_low: int
    active_risks_medium: int
    active_risks_high: int
    active_risks_critical: int
    action_compliance_pct: float
    cost_per_incident: float
    most_critical_area: str | None
