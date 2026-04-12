from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.governance import ConsentType, UserConsent


def has_active_consent(db: Session, user_id: int, consent_code: str) -> bool:
    consent_type = db.query(ConsentType).filter(ConsentType.code == consent_code, ConsentType.is_active.is_(True)).first()
    if not consent_type:
        return False

    consent = (
        db.query(UserConsent)
        .filter(
            UserConsent.user_id == user_id,
            UserConsent.consent_type_id == consent_type.id,
            UserConsent.status == "active",
        )
        .order_by(UserConsent.accepted_at.desc())
        .first()
    )
    return bool(consent)


def require_consent(db: Session, user_id: int, consent_code: str, detail: str) -> None:
    if has_active_consent(db, user_id, consent_code):
        return
    raise HTTPException(status_code=403, detail=detail)


def revoke_consent(db: Session, user_id: int, consent_type_id: int) -> None:
    rows = (
        db.query(UserConsent)
        .filter(UserConsent.user_id == user_id, UserConsent.consent_type_id == consent_type_id, UserConsent.status == "active")
        .all()
    )
    now = datetime.utcnow()
    for row in rows:
        row.status = "revoked"
        row.revoked_at = now
        db.add(row)
    db.commit()
