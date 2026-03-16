from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db.base import Base


class ServicePackage(Base):
    __tablename__ = "service_packages"

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

    items = relationship("ServicePackageItem", back_populates="package", cascade="all, delete-orphan")
    user = relationship("User", foreign_keys=[user_id])


class ServicePackageItem(Base):
    __tablename__ = "service_package_items"
    __table_args__ = (UniqueConstraint("package_id", "service_id", name="uq_package_service"),)

    id = Column(Integer, primary_key=True, index=True)
    package_id = Column(Integer, ForeignKey("service_packages.id"), nullable=False)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=False)
    quantity = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    package = relationship("ServicePackage", back_populates="items")
    service = relationship("Service", foreign_keys=[service_id])
