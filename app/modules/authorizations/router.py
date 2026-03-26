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
from app.models.service import Service
from app.models.user import User

router = APIRouter(prefix="/authorizations", tags=["Authorizations"])

TERMINAL_STATUSES = {"approved", "rejected"}


class AuthorizationCreate(BaseModel):
    customer_id: int
    document_id: Optional[int] = None
    assigned_approver_user_id: Optional[int] = None
    title: str
    service_id: Optional[int] = None
    service_name: Optional[str] = None
    authorization_number: Optional[str] = None
    valid_until: Optional[datetime] = None
    notes: Optional[str] = None


class AuthorizationUpdate(BaseModel):
    assigned_approver_user_id: Optional[int] = None
    title: Optional[str] = None
    service_id: Optional[int] = None
    service_name: Optional[str] = None
    authorization_number: Optional[str] = None
    status: Optional[str] = None
    valid_until: Optional[datetime] = None
    notes: Optional[str] = None
    decision_reason: Optional[str] = None


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
        "assigned_approver_user_id": record.assigned_approver_user_id,
        "assigned_approver_name": record.assigned_approver.email if record.assigned_approver else None,
        "requested_by_user_id": record.requested_by_user_id,
        "requested_by_name": record.requested_by.email if record.requested_by else None,
        "resolved_by_user_id": record.resolved_by_user_id,
        "resolved_by_name": record.resolved_by.email if record.resolved_by else None,
        "title": record.title,
        "service_id": record.service_id,
        "service_name": record.service_name,
        "authorization_number": record.authorization_number,
        "status": record.status,
        "valid_until": record.valid_until.isoformat() if record.valid_until else None,
        "notes": record.notes,
        "decision_reason": record.decision_reason,
        "resolved_at": record.resolved_at.isoformat() if record.resolved_at else None,
        "created_at": record.created_at.isoformat() if record.created_at else None,
        "updated_at": record.updated_at.isoformat() if record.updated_at else None,
        "linked_invoice_id": record.linked_invoice.id if record.linked_invoice else None,
        "linked_invoice_number": record.linked_invoice.invoice_number if record.linked_invoice else None,
        "linked_payment_id": record.linked_payment.id if record.linked_payment else None,
        "linked_payment_status": record.linked_payment.status if record.linked_payment else None,
        "linked_payment_amount": float(record.linked_payment.final_amount) if record.linked_payment else None,
    }


def resolve_service(payload_service_id: Optional[int], payload_service_name: Optional[str], scope_user_ids: list[int], db: Session):
    service = None
    service_name = (payload_service_name or "").strip() or None
    if payload_service_id is not None:
        service = db.query(Service).filter(
            Service.id == payload_service_id,
            Service.user_id.in_(scope_user_ids),
        ).first()
        if not service:
            raise HTTPException(status_code=404, detail="Servicio no encontrado")
        service_name = service.name
    return service, service_name


def ensure_approver_in_scope(approver_user_id: Optional[int], scope_user_ids: list[int], db: Session):
    if approver_user_id is None:
        return None
    approver = db.query(User).filter(User.id == approver_user_id, User.id.in_(scope_user_ids)).first()
    if not approver:
        raise HTTPException(status_code=404, detail="Responsable de aprobación no encontrado")
    return approver


def can_resolve_authorization(current_user: User, owner_id: int, record: Authorization) -> bool:
    if current_user.role in {"admin", "master_admin"}:
        return True
    if current_user.id == owner_id:
        return True
    return bool(record.assigned_approver_user_id and current_user.id == record.assigned_approver_user_id)


def apply_resolution(record: Authorization, new_status: str, decision_reason: Optional[str], acting_user: User, owner_id: int):
    if new_status in TERMINAL_STATUSES:
        if not can_resolve_authorization(acting_user, owner_id, record):
            raise HTTPException(status_code=403, detail="Solo el aprobador asignado o la cuenta principal puede resolver esta autorización")
        if not (decision_reason or "").strip():
            raise HTTPException(status_code=400, detail="El motivo de decisión es obligatorio para aprobar o rechazar")
        if record.status in TERMINAL_STATUSES and record.status != new_status:
            raise HTTPException(status_code=400, detail="La autorización ya fue resuelta y no puede cambiar a otro estado terminal")
        record.status = new_status
        record.decision_reason = decision_reason.strip()
        record.resolved_at = datetime.utcnow()
        record.resolved_by_user_id = acting_user.id
        return

    if new_status == "pending":
        if record.status in TERMINAL_STATUSES and acting_user.id != owner_id and acting_user.role not in {"admin", "master_admin"}:
            raise HTTPException(status_code=403, detail="Solo la cuenta principal puede reabrir una autorización resuelta")
        record.status = "pending"
        record.decision_reason = None
        record.resolved_at = None
        record.resolved_by_user_id = None
        return

    if new_status == "expired":
        if not can_resolve_authorization(acting_user, owner_id, record):
            raise HTTPException(status_code=403, detail="Solo el aprobador asignado o la cuenta principal puede vencer esta autorización")
        record.status = "expired"
        record.decision_reason = (decision_reason or record.decision_reason or "Vencida por gestión operativa").strip()
        record.resolved_at = datetime.utcnow()
        record.resolved_by_user_id = acting_user.id
        return

    raise HTTPException(status_code=400, detail="Estado de autorización no válido")


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


@router.get("/assignees")
def list_authorization_assignees(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == int(current_user["id"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    owner_id, scope_user_ids = get_owner_and_scope(user, db)
    scope_users = db.query(User).filter(User.id.in_(scope_user_ids), User.is_active.is_(True)).all()
    scope_users.sort(key=lambda row: (0 if row.id == owner_id else 1, row.email.lower()))
    return [
        {
            "id": row.id,
            "email": row.email,
            "role": row.role,
            "parent_user_id": row.parent_user_id,
            "is_owner": row.id == owner_id,
            "is_current_user": row.id == user.id,
        }
        for row in scope_users
    ]


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

    approver = ensure_approver_in_scope(payload.assigned_approver_user_id, scope_user_ids, db)
    service, service_name = resolve_service(payload.service_id, payload.service_name, scope_user_ids, db)

    record = Authorization(
        user_id=owner_id,
        customer_id=payload.customer_id,
        document_id=payload.document_id,
        requested_by_user_id=user.id,
        assigned_approver_user_id=approver.id if approver else None,
        title=payload.title.strip(),
        service_id=service.id if service else None,
        service_name=service_name,
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

    owner_id, scope_user_ids = get_owner_and_scope(user, db)
    record = db.query(Authorization).filter(Authorization.id == authorization_id, Authorization.user_id == owner_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Autorización no encontrada")

    submitted_fields = payload.model_fields_set

    if "assigned_approver_user_id" in submitted_fields:
        if record.status in TERMINAL_STATUSES:
            raise HTTPException(status_code=400, detail="No se puede cambiar el aprobador de una autorización ya resuelta")
        approver = ensure_approver_in_scope(payload.assigned_approver_user_id, scope_user_ids, db)
        record.assigned_approver_user_id = approver.id if approver else None

    if "title" in submitted_fields and payload.title is not None:
        record.title = payload.title.strip()
    if "service_id" in submitted_fields or "service_name" in submitted_fields:
        service, service_name = resolve_service(payload.service_id, payload.service_name, scope_user_ids, db)
        record.service_id = service.id if service else None
        record.service_name = service_name
    if "authorization_number" in submitted_fields:
        record.authorization_number = (payload.authorization_number or "").strip() or None
    if "valid_until" in submitted_fields:
        record.valid_until = payload.valid_until
    if "notes" in submitted_fields:
        record.notes = (payload.notes or "").strip() or None
    if "status" in submitted_fields and payload.status is not None:
        apply_resolution(record, payload.status.strip().lower(), payload.decision_reason, user, owner_id)
    elif "decision_reason" in submitted_fields and record.status in TERMINAL_STATUSES:
        if not can_resolve_authorization(user, owner_id, record):
            raise HTTPException(status_code=403, detail="Solo el aprobador asignado o la cuenta principal puede cambiar el criterio de decisión")
        record.decision_reason = (payload.decision_reason or "").strip() or None

    db.add(record)
    db.commit()
    db.refresh(record)
    return serialize_authorization(record)
