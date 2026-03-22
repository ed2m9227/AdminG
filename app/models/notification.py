from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from app.db.base import Base


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(String(50), nullable=False)   # low_stock | appointment | special_date | document
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=True)
    is_read = Column(Boolean, default=False, nullable=False)
    reference_id = Column(Integer, nullable=True)      # id of linked entity
    reference_type = Column(String(50), nullable=True) # inventory_item | appointment | etc.
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
