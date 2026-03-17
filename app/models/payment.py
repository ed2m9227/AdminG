from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String, Boolean
from sqlalchemy.orm import relationship
from app.db.base import Base

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=True)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=True)
    service_package_id = Column(Integer, ForeignKey("service_packages.id"), nullable=True)
    amount = Column(Numeric(10, 2), nullable=False)
    discount_amount = Column(Numeric(10, 2), default=0, nullable=False)
    final_amount = Column(Numeric(10, 2), nullable=False)
    concept = Column(String(200), nullable=True)  # Descripción: "Baño + Corte", "Consulta", etc.
    method = Column(String(30), nullable=True)  # cash, card, transfer, montelibano_gen
    status = Column(String(30), default="pending", nullable=False)
    reference = Column(String(100), nullable=True)
    notes = Column(String(500), nullable=True)
    paid_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    customer = relationship("Customer", back_populates="payments")
    appointment = relationship("Appointment", back_populates="payments")
    service = relationship("Service", foreign_keys=[service_id])
    service_package = relationship("ServicePackage", foreign_keys=[service_package_id])
    user = relationship("User", foreign_keys=[user_id])
