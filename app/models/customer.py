from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base
from app.core.encryption import EncryptedText

class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    full_name = Column(String(120), nullable=False)
    phone = Column(EncryptedText(), nullable=True)
    email = Column(String(120), nullable=True, index=True)
    notes = Column(EncryptedText(), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    appointments = relationship("Appointment", back_populates="customer", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="customer", cascade="all, delete-orphan")
    pets = relationship("Pet", back_populates="customer", cascade="all, delete-orphan")
    user = relationship("User", foreign_keys=[user_id])
