from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.authorization import Authorization
from app.models.customer import Customer
from app.models.document import Document
from app.models.user import User

router = APIRouter(prefix="/authorizations", tags=["Authorizations"])


class AuthorizationCreate(BaseModel):
    customer_id: int
    document_id: Optional[int] = None
    title: str
    service_name: Optional[str] = None
    authorization_number: Optional[str] = None
    valid_until: Optional[datetime] = None
    notes: Optional[str] = None


class AuthorizationUpdate(BaseModel):
    title: Optional[str] = None
    service_name: Optional[str] = None
    authorization_number: Optional[str] = None
    status: Optional[str] = None
    valid_until: Optional[datetime] = None
    notes: Optional[str] = None


def get_owner_and_scope(user: User, db: Session):
    owner_id = user.parent_user_id if user.parent_user_id else user.id
    child_ids = [uid for (uid,) in db.query(User.id).filter(User.parent_user_id == owner_id).all()]
    return owner_id, [owner_id, *child_ids]


def serialize_authorization(record: Authorization):
    return {
        "id": record.id,
        "user_id": record.user_id,
        "customer_id": record.customer_id,
        "customer_name": record.customer.full_name if record.customer else None,
        "document_id": record.document_id,
        "document_title": record.document.title if record.document else None,
        "title": record.title,
        "service_name": record.service_name,
        "authorization_number": record.authorization_number,
        "status": record.status,
        "valid_until": record.valid_until.isoformat() if record.valid_until else None,
        "notes": record.notes,
        "resolved_at": record.resolved_at.isoformat() if record.resolved_at else None,
        "created_at": record.created_at.isoformat() if record.created_at else None,
        "updated_at": record.updated_at.isoformat() if record.updated_at else None,
        "requested_by_user_id": record.requested_by_user_id,
        "requested_by_name": record.requested_by.email if record.requested_by else None,
    }


@router.get("/")
def list_authorizations(
    limit: int = 100,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == int(current_user["id"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    owner_id, _ = get_owner_and_scope(user, db)
    records = (
        db.query(Authorization)
        .filter(Authorization.user_id == owner_id)
        .order_by(Authorization.created_at.desc())
        .limit(limit)
        .all()
    )
    return [serialize_authorization(record) for record in records]


@router.post("/")
def create_authorization(
    payload: AuthorizationCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == int(current_user["id"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    owner_id, scope_user_ids = get_owner_and_scope(user, db)
    customer = db.query(Customer).filter(Customer.id == payload.customer_id, Customer.user_id.in_(scope_user_ids)).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    if payload.document_id is not None:
        document = db.query(Document).filter(Document.id == payload.document_id, Document.user_id == owner_id).first()
        if not document:
            raise HTTPException(status_code=404, detail="Documento relacionado no encontrado")

    record = Authorization(
        user_id=owner_id,
        customer_id=payload.customer_id,
        document_id=payload.document_id,
        requested_by_user_id=user.id,
        title=payload.title.strip(),
        service_name=(payload.service_name or "").strip() or None,
        authorization_number=(payload.authorization_number or "").strip() or None,
        status="pending",
        valid_until=payload.valid_until,
        notes=(payload.notes or "").strip() or None,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return serialize_authorization(record)


@router.put("/{authorization_id}")
def update_authorization(
    authorization_id: int,
    payload: AuthorizationUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == int(current_user["id"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    owner_id, _ = get_owner_and_scope(user, db)
    record = db.query(Authorization).filter(Authorization.id == authorization_id, Authorization.user_id == owner_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Autorización no encontrada")

    if payload.title is not None:
        record.title = payload.title.strip()
    if payload.service_name is not None:
        record.service_name = payload.service_name.strip() or None
    if payload.authorization_number is not None:
        record.authorization_number = payload.authorization_number.strip() or None
    if payload.valid_until is not None:
        record.valid_until = payload.valid_until
    if payload.notes is not None:
        record.notes = payload.notes.strip() or None
    if payload.status is not None:
        record.status = payload.status.strip().lower()
        record.resolved_at = datetime.utcnow() if record.status in {"approved", "rejected", "expired"} else None

    db.add(record)
    db.commit()
    db.refresh(record)
    return serialize_authorization(record)
