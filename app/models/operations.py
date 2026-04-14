from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import relationship
from app.db.base import Base


class OperationalUnitType(Base):
    __tablename__ = "operational_unit_types"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(40), unique=True, nullable=False, index=True)
    name = Column(String(120), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class OperationalUnit(Base):
    __tablename__ = "operational_units"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    type_id = Column(Integer, ForeignKey("operational_unit_types.id"), nullable=True)
    code = Column(String(80), nullable=True, index=True)
    title = Column(String(180), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(30), default="active", nullable=False)
    risk_capable = Column(Boolean, default=False, nullable=False)
    compliance_capable = Column(Boolean, default=False, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class OperationalContext(Base):
    __tablename__ = "operational_contexts"

    id = Column(Integer, primary_key=True, index=True)
    unit_id = Column(Integer, ForeignKey("operational_units.id"), nullable=False, index=True)
    channel_origin = Column(String(30), default="web", nullable=False)
    actor_type = Column(String(30), default="employee", nullable=False)
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    location = Column(String(160), nullable=True)
    occurred_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    risk_level_snapshot = Column(String(30), nullable=True)
    related_entities_json = Column(Text, nullable=True)


class OperationalEvent(Base):
    __tablename__ = "operational_events"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    unit_id = Column(Integer, ForeignKey("operational_units.id"), nullable=True, index=True)
    event_type = Column(String(60), nullable=False, index=True)
    severity = Column(String(20), default="medium", nullable=False)
    probability_score = Column(Numeric(10, 4), default=0, nullable=False)
    impact_score = Column(Numeric(10, 4), default=0, nullable=False)
    risk_score = Column(Numeric(10, 4), default=0, nullable=False)
    status = Column(String(20), default="open", nullable=False)
    trigger_source = Column(String(30), default="user", nullable=False)
    payload_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    closed_at = Column(DateTime, nullable=True)


class RiskRegistry(Base):
    __tablename__ = "risk_registry"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    area = Column(String(120), nullable=False, index=True)
    risk_type = Column(String(80), nullable=False, index=True)
    description = Column(Text, nullable=False)
    probability_level = Column(Integer, nullable=False)
    impact_level = Column(Integer, nullable=False)
    risk_level_auto = Column(Integer, nullable=False, index=True)
    category = Column(String(20), nullable=False, index=True)
    owner_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(String(20), default="active", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class RiskAssessment(Base):
    __tablename__ = "risk_assessments"

    id = Column(Integer, primary_key=True, index=True)
    risk_id = Column(Integer, ForeignKey("risk_registry.id"), nullable=False, index=True)
    audit_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    auditor_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    evidence_json = Column(Text, nullable=True)
    recommendation = Column(Text, nullable=True)
    compliance_score = Column(Numeric(10, 4), nullable=True)
    next_review_at = Column(DateTime, nullable=True)


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    event_id = Column(Integer, ForeignKey("operational_events.id"), nullable=True, index=True)
    risk_id = Column(Integer, ForeignKey("risk_registry.id"), nullable=True, index=True)
    area = Column(String(120), nullable=False, index=True)
    incident_type = Column(String(40), nullable=False, index=True)
    injured_people_count = Column(Integer, default=0, nullable=False)
    lost_days = Column(Integer, default=0, nullable=False)
    direct_cost = Column(Numeric(12, 2), default=0, nullable=False)
    indirect_cost = Column(Numeric(12, 2), default=0, nullable=False)
    description = Column(Text, nullable=False)
    root_cause = Column(Text, nullable=True)
    report_channel = Column(String(30), default="web", nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class ActionPlan(Base):
    __tablename__ = "action_plans"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=True, index=True)
    risk_id = Column(Integer, ForeignKey("risk_registry.id"), nullable=True, index=True)
    title = Column(String(180), nullable=False)
    owner_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    due_date = Column(DateTime, nullable=True)
    status = Column(String(20), default="open", nullable=False)
    progress_pct = Column(Integer, default=0, nullable=False)
    estimated_cost = Column(Numeric(12, 2), default=0, nullable=False)
    actual_cost = Column(Numeric(12, 2), default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    employee_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    category = Column(String(40), nullable=False, index=True)
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(10), default="COP", nullable=False)
    expense_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    channel_origin = Column(String(30), default="web", nullable=False)
    related_event_id = Column(Integer, ForeignKey("operational_events.id"), nullable=True, index=True)
    related_incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=True, index=True)
    status = Column(String(20), default="submitted", nullable=False)
    receipt_url = Column(String(400), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    incident = relationship("Incident", foreign_keys=[related_incident_id])
