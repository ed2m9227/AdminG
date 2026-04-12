from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db.base import Base


class GovernanceEntity(Base):
    __tablename__ = "governance_entities"

    id = Column(Integer, primary_key=True, index=True)
    owner_user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(180), nullable=False)
    governance_mode = Column(String(40), nullable=False, index=True)
    entity_type = Column(String(60), nullable=False, index=True)
    jurisdiction_code = Column(String(20), nullable=True, index=True)
    territory_code = Column(String(60), nullable=True, index=True)
    hierarchy_path = Column(String(255), nullable=True)
    metadata_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    owner_user = relationship("User", back_populates="governance_entities")


class PolicyVersion(Base):
    __tablename__ = "policy_versions"

    id = Column(Integer, primary_key=True, index=True)
    policy_type = Column(String(60), nullable=False, index=True)
    version_label = Column(String(40), nullable=False, index=True)
    jurisdiction_code = Column(String(20), nullable=False, default="*", index=True)
    language = Column(String(8), nullable=False, default="es")
    content_hash = Column(String(128), nullable=False)
    content_summary = Column(Text, nullable=True)
    is_mandatory = Column(Boolean, default=True, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    effective_from = Column(DateTime, default=datetime.utcnow, nullable=False)
    effective_to = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user_consents = relationship("UserConsent", back_populates="policy_version")


class ConsentType(Base):
    __tablename__ = "consent_types"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(80), nullable=False, unique=True, index=True)
    layer = Column(String(20), nullable=False, index=True)  # general | specific | contextual
    purpose = Column(String(180), nullable=False)
    legal_basis_type = Column(String(40), nullable=True)
    module_scope = Column(String(80), nullable=True)
    is_mandatory = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user_consents = relationship("UserConsent", back_populates="consent_type")


class UserConsent(Base):
    __tablename__ = "user_consents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    tenant_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    consent_type_id = Column(Integer, ForeignKey("consent_types.id"), nullable=False, index=True)
    policy_version_id = Column(Integer, ForeignKey("policy_versions.id"), nullable=False, index=True)
    status = Column(String(20), nullable=False, default="active", index=True)  # active | revoked | expired
    source = Column(String(20), nullable=False, default="onboarding")
    accepted_at = Column(DateTime, default=datetime.utcnow, nullable=True)
    revoked_at = Column(DateTime, nullable=True)
    evidence_hash = Column(String(128), nullable=True)
    ip_address = Column(String(45), nullable=True)
    device_fingerprint_hash = Column(String(128), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="user_consents")
    consent_type = relationship("ConsentType", back_populates="user_consents")
    policy_version = relationship("PolicyVersion", back_populates="user_consents")


class TrialPolicy(Base):
    __tablename__ = "trial_policies"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(80), nullable=False, unique=True, index=True)
    governance_mode = Column(String(40), nullable=True, index=True)
    role_scope = Column(String(40), nullable=True, index=True)
    operation_level = Column(String(40), nullable=True, index=True)
    primary_objective = Column(String(80), nullable=True, index=True)
    duration_days = Column(Integer, nullable=False, default=15)
    approval_mode = Column(String(20), nullable=False, default="auto")  # auto | manual
    module_caps_json = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user_trials = relationship("UserTrial", back_populates="trial_policy")


class UserTrial(Base):
    __tablename__ = "user_trials"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    tenant_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    trial_policy_id = Column(Integer, ForeignKey("trial_policies.id"), nullable=False, index=True)
    status = Column(String(20), nullable=False, default="active", index=True)  # active | ended | revoked
    starts_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    ends_at = Column(DateTime, nullable=False)
    extension_count = Column(Integer, nullable=False, default=0)
    approved_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    closure_reason = Column(String(180), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="user_trials", foreign_keys=[user_id])
    trial_policy = relationship("TrialPolicy", back_populates="user_trials")


class KeyRotationEvent(Base):
    __tablename__ = "key_rotation_events"

    id = Column(Integer, primary_key=True, index=True)
    key_name = Column(String(80), nullable=False, index=True)
    key_version = Column(String(40), nullable=False, index=True)
    rotated_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    reason = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    rotated_by = relationship("User", foreign_keys=[rotated_by_user_id])
