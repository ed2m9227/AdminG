from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String, Numeric, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.base import Base


class Plan(Base):
    __tablename__ = "plans"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)  # AdminG_Basic, AdminG_Plus, AdminPro_Start, AdminPro_Max
    display_name = Column(String(100), nullable=False)  # AdminG Basic, AdminG Plus, etc
    price = Column(Numeric(10, 2), nullable=False)  # 5000, 30000, 50000, 100000
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    limits = relationship("PlanLimit", back_populates="plan", cascade="all, delete-orphan")
    features = relationship("PlanFeature", back_populates="plan", cascade="all, delete-orphan")


class PlanLimit(Base):
    __tablename__ = "plan_limits"

    id = Column(Integer, primary_key=True, index=True)
    plan_id = Column(Integer, ForeignKey("plans.id"), nullable=False)
    limit_name = Column(String(50), nullable=False)  # max_users, max_locations, max_appointments_per_month, max_storage_gb
    limit_value = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    plan = relationship("Plan", back_populates="limits")


class PlanFeature(Base):
    __tablename__ = "plan_features"

    id = Column(Integer, primary_key=True, index=True)
    plan_id = Column(Integer, ForeignKey("plans.id"), nullable=False)
    feature_code = Column(String(50), nullable=False)  # inventory, accounting, reports, api, sms_reminders
    feature_name = Column(String(100), nullable=False)
    is_enabled = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    plan = relationship("Plan", back_populates="features")
