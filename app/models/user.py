from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base
from app.core.encryption import EncryptedText

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(120), unique=True, nullable=False, index=True)
    full_name = Column(String(160), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(30), default="viewer", nullable=False)
    plan = Column(String(30), default="free", nullable=False)
    plan_start_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Multi-tenancy fields
    business_type = Column(String(50), default="general", nullable=False)
    parent_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    onboarding_completed = Column(Boolean, default=False, nullable=False)
    # Plan payment verification: True = paid/free, False = awaiting payment
    plan_paid = Column(Boolean, default=True, nullable=False)
    plan_payment_reference = Column(EncryptedText(), nullable=True)
    # Free trial lifecycle for owner accounts in plan free
    free_trial_used = Column(Boolean, default=False, nullable=False)
    free_trial_started_at = Column(DateTime, nullable=True)
    password_reset_token_hash = Column(String(128), nullable=True)
    password_reset_expires_at = Column(DateTime, nullable=True)
    # TOTP / 2FA fields
    totp_secret = Column(String(64), nullable=True)
    totp_enabled = Column(Boolean, default=False, nullable=False)
    totp_backup_codes_json = Column(String(1024), nullable=True)  # JSON array of hashed backup codes

    # Relationships
    sub_users = relationship("User", remote_side=[id], backref="parent_user")
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
