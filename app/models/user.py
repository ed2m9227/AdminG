from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(120), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(30), default="viewer", nullable=False)
    plan = Column(String(30), default="free", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Multi-tenancy fields
    business_type = Column(String(50), default="general", nullable=False)
    parent_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    onboarding_completed = Column(Boolean, default=False, nullable=False)
    
    # Relationships
    sub_users = relationship("User", remote_side=[id], backref="parent_user")
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
