from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from app.db.base import Base
from app.core.encryption import EncryptedText


class Authorization(Base):
    __tablename__ = "authorizations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=True, index=True)
    requested_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_approver_user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    resolved_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    title = Column(String(150), nullable=False)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=True, index=True)
    service_name = Column(String(150), nullable=True)
    authorization_number = Column(String(80), nullable=True)
    status = Column(String(30), nullable=False, default="pending")
    valid_until = Column(DateTime, nullable=True)
    notes = Column(EncryptedText(), nullable=True)
    decision_reason = Column(EncryptedText(), nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", foreign_keys=[user_id])
    requested_by = relationship("User", foreign_keys=[requested_by_user_id])
    assigned_approver = relationship("User", foreign_keys=[assigned_approver_user_id])
    resolved_by = relationship("User", foreign_keys=[resolved_by_user_id])
    customer = relationship("Customer", foreign_keys=[customer_id])
    document = relationship("Document", foreign_keys=[document_id])
    service = relationship("Service", foreign_keys=[service_id])
    linked_invoice = relationship("Invoice", back_populates="authorization", uselist=False)
    linked_payment = relationship("Payment", back_populates="authorization", uselist=False)
