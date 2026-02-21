"""
Business Type Model
Stores configurable business types for the system
"""

from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.sql import func
from app.db.database import Base


class BusinessType(Base):
    __tablename__ = "business_types"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    label = Column(String(100), nullable=False)
    description = Column(String(500), nullable=True)
    icon = Column(String(50), nullable=True)  # Icon class or emoji
    is_active = Column(Boolean, default=True)
    
    # Default labels for each business type
    default_label_customers = Column(String(50), default="Cliente")
    default_label_appointments = Column(String(50), default="Cita")
    default_label_pets = Column(String(50), default="Mascota")
    
    # Support for pets by default in this business type
    supports_pets = Column(Boolean, default=False)
    
    # Ordering
    order = Column(Integer, default=0)
    
    # Audit
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
