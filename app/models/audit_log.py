from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from app.db.base import Base


class AuditLog(Base):
    """Registro inmutable de acciones críticas para trazabilidad y cumplimiento."""
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String(60), nullable=False)       # 'void_transaction', 'approve_void', 'deny_void'
    entity_type = Column(String(40), nullable=False)  # 'cash_transaction', 'void_request'
    entity_id = Column(Integer, nullable=False)
    detail = Column(Text, nullable=True)              # JSON-serializable context (old value, reason, etc.)
    ip_address = Column(String(45), nullable=True)    # IPv4/IPv6
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    actor = relationship("User", foreign_keys=[user_id])


class VoidRequest(Base):
    """Solicitud de anulación de movimiento iniciada por un usuario hijo."""
    __tablename__ = "void_requests"

    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(Integer, ForeignKey("cash_transactions.id"), nullable=False)
    requested_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    reason = Column(String(500), nullable=False)
    status = Column(String(20), default="pending", nullable=False)  # pending | approved | denied
    resolved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    transaction = relationship("CashTransaction", foreign_keys=[transaction_id])
    requester = relationship("User", foreign_keys=[requested_by])
    resolver = relationship("User", foreign_keys=[resolved_by])
