import hashlib
import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.config import FIELD_ENCRYPTION_KEY_VERSION
from app.core.consent_guard import has_active_consent, revoke_consent
from app.core.governance_engine import (
    GOVERNANCE_MODES,
    OBJECTIVES,
    OPERATION_LEVELS,
    activate_trial_if_eligible,
    build_onboarding_activation,
    ensure_default_policy_catalog,
    pick_trial_policy,
)
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.governance import (
    ConsentType,
    GovernanceEntity,
    KeyRotationEvent,
    PolicyVersion,
    UserTrial,
    UserConsent,
)
from app.models.user import User
from app.modules.onboarding.schemas import ConsentBatchPayload, KeyRotationLogPayload, OnboardingInitializePayload

router = APIRouter(prefix="/onboarding", tags=["Onboarding Governance"])


def _resolve_user(current_user=Depends(get_current_user), db: Session = Depends(get_db)) -> User:
    user = db.query(User).filter(User.id == int(current_user["id"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def _latest_policy(db: Session, policy_type: str, jurisdiction_code: str | None) -> PolicyVersion | None:
    jurisdiction = jurisdiction_code or "*"
    policy = (
        db.query(PolicyVersion)
        .filter(
            PolicyVersion.policy_type == policy_type,
            PolicyVersion.is_active.is_(True),
            PolicyVersion.jurisdiction_code == jurisdiction,
        )
        .order_by(PolicyVersion.effective_from.desc())
        .first()
    )
    if policy:
        return policy
    return (
        db.query(PolicyVersion)
        .filter(
            PolicyVersion.policy_type == policy_type,
            PolicyVersion.is_active.is_(True),
            PolicyVersion.jurisdiction_code == "*",
        )
        .order_by(PolicyVersion.effective_from.desc())
        .first()
    )


@router.post("/initialize")
def initialize_onboarding(payload: OnboardingInitializePayload, user: User = Depends(_resolve_user), db: Session = Depends(get_db)):
    ensure_default_policy_catalog(db)

    if payload.governance_mode not in GOVERNANCE_MODES:
        raise HTTPException(status_code=400, detail="governance_mode inválido")
    if payload.operation_level not in OPERATION_LEVELS:
        raise HTTPException(status_code=400, detail="operation_level inválido")
    if payload.primary_objective not in OBJECTIVES:
        raise HTTPException(status_code=400, detail="primary_objective inválido")

    activation = build_onboarding_activation(payload.governance_mode, payload.operation_level, payload.primary_objective)

    user.governance_mode = payload.governance_mode
    user.operation_level = payload.operation_level
    user.primary_objective = payload.primary_objective
    user.jurisdiction_code = (payload.jurisdiction_code or "CO").upper()
    user.territory_code = payload.territory_code
    user.onboarding_profile_json = json.dumps(activation)
    if payload.role and payload.role in {"viewer", "manager", "admin", "auditor"}:
        user.role = payload.role
    db.add(user)

    owner_user_id = user.parent_user_id if user.parent_user_id else user.id
    entity = db.query(GovernanceEntity).filter(GovernanceEntity.owner_user_id == owner_user_id).first()
    if not entity:
        entity = GovernanceEntity(
            owner_user_id=owner_user_id,
            name=payload.entity_name,
            governance_mode=payload.governance_mode,
            entity_type=payload.governance_mode,
            jurisdiction_code=user.jurisdiction_code,
            territory_code=user.territory_code,
            metadata_json=json.dumps({"initialized_by": user.id}),
        )
    else:
        entity.name = payload.entity_name
        entity.governance_mode = payload.governance_mode
        entity.entity_type = payload.governance_mode
        entity.jurisdiction_code = user.jurisdiction_code
        entity.territory_code = user.territory_code
        entity.updated_at = datetime.utcnow()
    db.add(entity)
    db.commit()

    required_consents = db.query(ConsentType).filter(ConsentType.is_active.is_(True), ConsentType.is_mandatory.is_(True)).all()
    trial_policy = pick_trial_policy(db, user)

    return {
        "success": True,
        "governance": {
            "mode": user.governance_mode,
            "operation_level": user.operation_level,
            "primary_objective": user.primary_objective,
            "jurisdiction_code": user.jurisdiction_code,
            "territory_code": user.territory_code,
        },
        "activation": activation,
        "required_consents": [{"code": c.code, "purpose": c.purpose, "layer": c.layer} for c in required_consents],
        "trial_preview": {
            "eligible": bool(trial_policy),
            "policy_code": trial_policy.code if trial_policy else None,
            "approval_mode": trial_policy.approval_mode if trial_policy else None,
            "duration_days": trial_policy.duration_days if trial_policy else None,
        },
    }


@router.get("/policies")
def list_policies(user: User = Depends(_resolve_user), db: Session = Depends(get_db)):
    ensure_default_policy_catalog(db)
    rows = db.query(PolicyVersion).filter(PolicyVersion.is_active.is_(True)).all()
    jurisdiction = user.jurisdiction_code or "*"
    policies = []
    for row in rows:
        if row.jurisdiction_code not in {"*", jurisdiction}:
            continue
        policies.append(
            {
                "id": row.id,
                "policy_type": row.policy_type,
                "version_label": row.version_label,
                "jurisdiction_code": row.jurisdiction_code,
                "is_mandatory": row.is_mandatory,
                "effective_from": row.effective_from.isoformat() if row.effective_from else None,
                "content_summary": row.content_summary,
            }
        )
    return {"policies": policies}


@router.post("/consents")
def upsert_consents(payload: ConsentBatchPayload, user: User = Depends(_resolve_user), db: Session = Depends(get_db)):
    ensure_default_policy_catalog(db)

    for item in payload.items:
        consent_type = db.query(ConsentType).filter(ConsentType.code == item.code, ConsentType.is_active.is_(True)).first()
        if not consent_type:
            raise HTTPException(status_code=404, detail=f"Consent type not found: {item.code}")

        if not item.accepted:
            if consent_type.is_mandatory:
                raise HTTPException(status_code=400, detail=f"{item.code} es obligatorio")
            revoke_consent(db, user.id, consent_type.id)
            continue

        policy_type = "terms_use" if consent_type.code == "terms_use" else "privacy_policy"
        policy = _latest_policy(db, policy_type, user.jurisdiction_code)
        if not policy:
            raise HTTPException(status_code=500, detail=f"No active policy for {policy_type}")

        evidence_raw = f"{user.id}:{consent_type.code}:{policy.version_label}:{datetime.utcnow().isoformat()}"
        evidence_hash = hashlib.sha256(evidence_raw.encode("utf-8")).hexdigest()

        consent = UserConsent(
            user_id=user.id,
            tenant_id=user.parent_user_id if user.parent_user_id else user.id,
            consent_type_id=consent_type.id,
            policy_version_id=policy.id,
            status="active",
            source="onboarding",
            accepted_at=datetime.utcnow(),
            evidence_hash=evidence_hash,
        )
        db.add(consent)

    db.commit()
    return {"success": True}


@router.get("/consents/status")
def consent_status(user: User = Depends(_resolve_user), db: Session = Depends(get_db)):
    ensure_default_policy_catalog(db)
    consent_types = db.query(ConsentType).filter(ConsentType.is_active.is_(True)).all()
    data = []
    for ct in consent_types:
        data.append(
            {
                "code": ct.code,
                "layer": ct.layer,
                "is_mandatory": ct.is_mandatory,
                "purpose": ct.purpose,
                "active": has_active_consent(db, user.id, ct.code),
            }
        )
    return {"items": data}


@router.post("/complete")
def complete_onboarding(user: User = Depends(_resolve_user), db: Session = Depends(get_db)):
    required = db.query(ConsentType).filter(ConsentType.is_active.is_(True), ConsentType.is_mandatory.is_(True)).all()
    missing = [c.code for c in required if not has_active_consent(db, user.id, c.code)]
    if missing:
        raise HTTPException(status_code=409, detail=f"Consentimientos obligatorios faltantes: {', '.join(missing)}")

    user.onboarding_completed = True
    db.add(user)
    db.commit()

    trial = activate_trial_if_eligible(db, user)
    return {
        "success": True,
        "onboarding_completed": True,
        "trial": {
            "active": bool(trial),
            "starts_at": trial.starts_at.isoformat() if trial else None,
            "ends_at": trial.ends_at.isoformat() if trial else None,
            "policy_id": trial.trial_policy_id if trial else None,
        },
    }


@router.get("/trials/me")
def get_my_trial(user: User = Depends(_resolve_user), db: Session = Depends(get_db)):
    trial = (
        db.query(UserTrial)
        .filter(UserTrial.user_id == user.id)
        .order_by(UserTrial.created_at.desc())
        .first()
    )
    if not trial:
        return {"active": False}
    return {
        "active": trial.status == "active",
        "status": trial.status,
        "starts_at": trial.starts_at.isoformat() if trial.starts_at else None,
        "ends_at": trial.ends_at.isoformat() if trial.ends_at else None,
        "extension_count": trial.extension_count,
        "trial_policy_id": trial.trial_policy_id,
    }


@router.post("/trials/{target_user_id}/approve")
def approve_selected_user_trial(target_user_id: int, user: User = Depends(_resolve_user), db: Session = Depends(get_db)):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admin can approve manual trials")

    target = db.query(User).filter(User.id == target_user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Target user not found")

    trial = activate_trial_if_eligible(db, target, approved_by_user_id=user.id)
    if not trial:
        raise HTTPException(status_code=409, detail="User has no eligible manual trial policy")

    return {
        "success": True,
        "target_user_id": target.id,
        "trial_id": trial.id,
        "starts_at": trial.starts_at.isoformat(),
        "ends_at": trial.ends_at.isoformat(),
    }


@router.get("/consents/ai-flags")
def ai_flags(user: User = Depends(_resolve_user), db: Session = Depends(get_db)):
    return {
        "ai_decision_support": has_active_consent(db, user.id, "ai_decision_support"),
        "ai_automated_scoring": has_active_consent(db, user.id, "ai_automated_scoring"),
        "behavior_analytics": has_active_consent(db, user.id, "behavior_analytics"),
    }


@router.post("/keys/rotate-log")
def log_key_rotation(payload: KeyRotationLogPayload, user: User = Depends(_resolve_user), db: Session = Depends(get_db)):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admin can register key rotation events")

    row = KeyRotationEvent(
        key_name=payload.key_name,
        key_version=payload.key_version or FIELD_ENCRYPTION_KEY_VERSION,
        rotated_by_user_id=user.id,
        reason=payload.reason,
    )
    db.add(row)
    db.commit()
    db.refresh(row)

    return {
        "success": True,
        "event_id": row.id,
        "key_name": row.key_name,
        "key_version": row.key_version,
        "created_at": row.created_at.isoformat(),
    }
