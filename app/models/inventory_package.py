from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db.base import Base


class InventoryPackage(Base):
    __tablename__ = "inventory_packages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(120), nullable=False)
    description = Column(String(500), nullable=True)
    discount_percentage = Column(Numeric(5, 2), default=0, nullable=False)
    base_price = Column(Numeric(10, 2), default=0, nullable=False)
    final_price = Column(Numeric(10, 2), default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    items = relationship("InventoryPackageItem", back_populates="package", cascade="all, delete-orphan")
    user = relationship("User", foreign_keys=[user_id])


class InventoryPackageItem(Base):
    __tablename__ = "inventory_package_items"
    __table_args__ = (UniqueConstraint("package_id", "item_id", name="uq_package_item"),)

    id = Column(Integer, primary_key=True, index=True)
    package_id = Column(Integer, ForeignKey("inventory_packages.id"), nullable=False)
    item_id = Column(Integer, ForeignKey("inventory_items.id"), nullable=False)
    quantity = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    package = relationship("InventoryPackage", back_populates="items")
    item = relationship("InventoryItem", foreign_keys=[item_id])
