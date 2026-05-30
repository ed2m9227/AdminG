from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.collaboration import get_scope_user_ids, resolve_collaboration_owner_id
from app.core.features import Feature, has_feature
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.models.veterinary import VeterinaryOperation
from app.modules.veterinary.schemas import (
    VeterinaryOperationCreate,
    VeterinaryOperationOut,
    VeterinaryOperationUpdate,
)

router = APIRouter(prefix="/veterinary", tags=["Veterinary"])


def _require_veterinary_feature(user: User, feature: Feature) -> None:
    if has_feature(user.plan, feature, user.role, is_parent_account=not bool(user.parent_user_id)):
        return
    raise HTTPException(status_code=403, detail="Funcionalidad veterinaria no disponible en tu plan")


def _resolve_user(current_user=Depends(get_current_user), db: Session = Depends(get_db)) -> User:
    user = db.query(User).filter(User.id == int(current_user["id"])) .first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user


def _serialize(operation: VeterinaryOperation) -> dict:
    whatsapp_link = None
    if operation.whatsapp_number:
        sanitized = operation.whatsapp_number.strip().replace("+", "").replace(" ", "").replace("-", "")
        if sanitized:
            whatsapp_link = f"https://wa.me/{sanitized}"

    return {
        "id": operation.id,
        "customer_id": operation.customer_id,
        "owner_name": operation.owner_name,
        "owner_phone": operation.owner_phone,
        "animal_name": operation.animal_name,
        "animal_type": operation.animal_type,
        "service_description": operation.service_description,
        "status": operation.status,
        "location": operation.location,
        "whatsapp_number": operation.whatsapp_number,
        "whatsapp_link": whatsapp_link,
        "scheduled_at": operation.scheduled_at,
        "started_at": operation.started_at,
        "completed_at": operation.completed_at,
        "notes": operation.notes,
        "created_by": operation.created_by,
        "created_at": operation.created_at,
        "updated_at": operation.updated_at,
    }


def _target_user_and_scope(user: User, db: Session) -> tuple[int, list[int]]:
    owner_id = resolve_collaboration_owner_id(
        user,
        db,
        allow_external=True,
        allowed_owner_plans={"max", "admin"},
    )
    target_user_id = owner_id if (not user.parent_user_id and owner_id != user.id) else user.id
    return target_user_id, get_scope_user_ids(owner_id, db)


@router.get("/operations", response_model=list[VeterinaryOperationOut])
def list_veterinary_operations(
    db: Session = Depends(get_db),
    current_user: User = Depends(_resolve_user),
):
    _require_veterinary_feature(current_user, Feature.VIEW_VETERINARY_OPERATIONS)
    _, user_ids = _target_user_and_scope(current_user, db)
    operations = (
        db.query(VeterinaryOperation)
        .filter(VeterinaryOperation.tenant_id.in_(user_ids))
        .order_by(VeterinaryOperation.created_at.desc())
        .all()
    )
    return [_serialize(operation) for operation in operations]


@router.post("/operations", response_model=VeterinaryOperationOut, status_code=status.HTTP_201_CREATED)
def create_veterinary_operation(
    payload: VeterinaryOperationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(_resolve_user),
):
    _require_veterinary_feature(current_user, Feature.MANAGE_VETERINARY_OPERATIONS)
    target_user_id, _ = _target_user_and_scope(current_user, db)

    operation = VeterinaryOperation(
        tenant_id=target_user_id,
        customer_id=payload.customer_id,
        owner_name=payload.owner_name,
        owner_phone=payload.owner_phone,
        animal_name=payload.animal_name,
        animal_type=payload.animal_type,
        service_description=payload.service_description,
        status="entered",
        location=payload.location,
        whatsapp_number=payload.whatsapp_number,
        scheduled_at=payload.scheduled_at,
        notes=payload.notes,
        created_by=current_user.id,
    )
    db.add(operation)
    db.commit()
    db.refresh(operation)
    return _serialize(operation)


@router.get("/operations/{operation_id}", response_model=VeterinaryOperationOut)
def get_veterinary_operation(
    operation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(_resolve_user),
):
    _require_veterinary_feature(current_user, Feature.VIEW_VETERINARY_OPERATIONS)
    _, user_ids = _target_user_and_scope(current_user, db)
    operation = db.query(VeterinaryOperation).filter(
        VeterinaryOperation.id == operation_id,
        VeterinaryOperation.tenant_id.in_(user_ids),
    ).first()
    if not operation:
        raise HTTPException(status_code=404, detail="Operación veterinaria no encontrada")
    return _serialize(operation)


@router.put("/operations/{operation_id}", response_model=VeterinaryOperationOut)
def update_veterinary_operation(
    operation_id: int,
    payload: VeterinaryOperationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(_resolve_user),
):
    _require_veterinary_feature(current_user, Feature.MANAGE_VETERINARY_OPERATIONS)
    target_user_id, user_ids = _target_user_and_scope(current_user, db)
    operation = db.query(VeterinaryOperation).filter(
        VeterinaryOperation.id == operation_id,
        VeterinaryOperation.tenant_id.in_(user_ids),
    ).first()
    if not operation:
        raise HTTPException(status_code=404, detail="Operación veterinaria no encontrada")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(operation, field, value)

    # Automatically update stage timestamps when the client advances
    if payload.status == "in_service" and operation.started_at is None:
        operation.started_at = datetime.utcnow()
    if payload.status == "completed" and operation.completed_at is None:
        operation.completed_at = datetime.utcnow()

    db.add(operation)
    db.commit()
    db.refresh(operation)
    return _serialize(operation)
