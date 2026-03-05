from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, Numeric, String, Boolean, Text
from app.db.base import Base

class TaxConfig(Base):
    __tablename__ = "tax_config"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)  # e.g., "IVA General", "IVA Reducido"
    tax_type = Column(String(50), nullable=False)  # 'iva', 'retencion', 'other'
    percentage = Column(Numeric(5, 2), nullable=False)  # Porcentaje del impuesto
    is_active = Column(Boolean, default=True, nullable=False)
    description = Column(Text, nullable=True)
    
    # Aplicabilidad
    applies_to = Column(String(50), default="all", nullable=False)  # 'all', 'products', 'services'
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
