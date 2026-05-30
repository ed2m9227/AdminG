from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from app.db.base import Base


class VeterinaryOperation(Base):
    __tablename__ = "veterinary_operations"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True, index=True)
    owner_name = Column(String(120), nullable=False)
    owner_phone = Column(String(50), nullable=True)
    animal_name = Column(String(120), nullable=False)
    animal_type = Column(String(80), nullable=True)
    service_description = Column(Text, nullable=False)
    status = Column(String(40), default="entered", nullable=False, index=True)
    location = Column(String(180), nullable=True)
    whatsapp_number = Column(String(50), nullable=True, index=True)
    scheduled_at = Column(DateTime, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    customer = relationship("Customer", foreign_keys=[customer_id])
    created_by_user = relationship("User", foreign_keys=[created_by])
