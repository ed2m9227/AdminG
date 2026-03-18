from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import relationship
from app.db.base import Base


class PaymentItem(Base):
    """
    Items desglosados en un Payment
    Permite rastrear exactamente qué se pagó (servicios, productos, etc)
    """
    __tablename__ = "payment_items"

    id = Column(Integer, primary_key=True, index=True)
    payment_id = Column(Integer, ForeignKey("payments.id"), nullable=False)
    
    # Tipo de ítem
    source_type = Column(String(20), nullable=False)  # 'service', 'product', 'custom'
    
    # Referencias opcionales al origen
    service_id = Column(Integer, ForeignKey("services.id"), nullable=True)
    inventory_item_id = Column(Integer, ForeignKey("inventory_items.id"), nullable=True)
    
    # Descripción (para custom)
    description = Column(String(255), nullable=False)
    
    # Cantidad y precio
    quantity = Column(Numeric(10, 2), default=1, nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    subtotal = Column(Numeric(10, 2), nullable=False)  # quantity * unit_price
    
    # Auditoría
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relaciones
    payment = relationship("Payment", back_populates="payment_items", foreign_keys=[payment_id])
    service = relationship("Service", foreign_keys=[service_id])
    inventory_item = relationship("InventoryItem", foreign_keys=[inventory_item_id])
