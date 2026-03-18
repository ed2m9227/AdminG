from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import relationship
from app.db.base import Base

class CashTransaction(Base):
    __tablename__ = "cash_transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    payment_id = Column(Integer, ForeignKey("payments.id"), nullable=True)  # NUEVO: Vinculación a Payment
    transaction_type = Column(String(30), nullable=False)  # 'sale', 'expense', 'base'
    amount = Column(Numeric(10, 2), nullable=False)
    description = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", foreign_keys=[user_id])
    customer = relationship("Customer", foreign_keys=[customer_id])
    payment = relationship("Payment", foreign_keys=[payment_id])  # NUEVO
