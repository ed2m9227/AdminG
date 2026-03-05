from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import relationship
from app.db.base import Base

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String(50), unique=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    payment_id = Column(Integer, ForeignKey("payments.id"), nullable=True)  # Vinculación opcional con payment
    
    # Montos
    subtotal = Column(Numeric(10, 2), nullable=False)  # Total sin impuestos
    iva_percentage = Column(Numeric(5, 2), default=0, nullable=False)  # % de IVA aplicado
    iva_amount = Column(Numeric(10, 2), default=0, nullable=False)  # Monto de IVA
    retencion_percentage = Column(Numeric(5, 2), default=0, nullable=False)  # % de retención
    retencion_amount = Column(Numeric(10, 2), default=0, nullable=False)  # Monto de retención
    total = Column(Numeric(10, 2), nullable=False)  # Total final (subtotal + IVA - retención)
    
    # Información adicional
    notes = Column(Text, nullable=True)
    status = Column(String(30), default="issued", nullable=False)  # issued, paid, cancelled, void
    issued_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    due_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relaciones
    user = relationship("User", foreign_keys=[user_id])
    customer = relationship("Customer", foreign_keys=[customer_id])
    payment = relationship("Payment", foreign_keys=[payment_id])
    items = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")


class InvoiceItem(Base):
    __tablename__ = "invoice_items"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    description = Column(String(255), nullable=False)
    quantity = Column(Numeric(10, 2), default=1, nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    subtotal = Column(Numeric(10, 2), nullable=False)  # quantity * unit_price
    
    # Referencias opcionales a productos o servicios
    inventory_item_id = Column(Integer, ForeignKey("inventory_items.id"), nullable=True)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relaciones
    invoice = relationship("Invoice", back_populates="items")
    inventory_item = relationship("InventoryItem", foreign_keys=[inventory_item_id])
    service = relationship("Service", foreign_keys=[service_id])
