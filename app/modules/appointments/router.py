from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from app.db.session import get_db
from app.models.appointment import Appointment
from app.models.customer import Customer
from app.models.inventory import InventoryItem
from app.models.service_package import ServicePackage
from app.modules.appointments.schemas import AppointmentCreate, AppointmentOut, AppointmentUpdate
from app.core.security import get_current_user
from app.core.features import Feature, has_feature
from app.models.user import User

router = APIRouter(prefix="/appointments", tags=["Appointments"])

def resolve_user(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Resuelve el usuario actual desde el token"""
    user = db.query(User).filter(User.id == int(current_user["id"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

def get_user_ids_for_data_sharing(user: User):
    """Retorna list de user_ids a incluir en queries (para compartir datos padre-hijo)"""
    if user.parent_user_id:
        # Sub-usuario: incluir datos del padre y propio
        return [user.id, user.parent_user_id]
    else:
        # Usuario padre/admin: incluir datos propios y de sub-usuarios
        child_ids = [child.id for child in (user.sub_users or [])]
        return [user.id, *child_ids]


def get_accessible_service(service_id: int, user_ids: list[int], db: Session) -> InventoryItem | None:
    """Look up a service by id from inventory_items (item_type='service').
    Falls back to any active inventory service owned by the user if the exact match
    is not found — this handles the mismatch between legacy Service model and the
    InventoryItem-based services that the frontend manages.
    """
    return db.query(InventoryItem).filter(
        InventoryItem.id == service_id,
        InventoryItem.user_id.in_(user_ids),
        InventoryItem.item_type == 'service',
        InventoryItem.is_active == True,
    ).first()

def require_appointment_feature(user: User, feature: Feature):
    if has_feature(user.plan, feature, user.role, is_parent_account=not bool(user.parent_user_id)):
        return True
    raise HTTPException(status_code=403, detail="Feature not available in your plan")

@router.post("/", response_model=AppointmentOut, status_code=status.HTTP_201_CREATED)
def create_appointment(
    payload: AppointmentCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user)
):
    """Crear cita - los sub-usuarios pueden crear citas para clientes del padre"""
    require_appointment_feature(current_user, Feature.CREATE_APPOINTMENTS)
    user_ids = get_user_ids_for_data_sharing(current_user)
    customer = db.query(Customer).filter(
        Customer.id == payload.customer_id,
        Customer.user_id.in_(user_ids)
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    if payload.service_id is not None:
        service = get_accessible_service(payload.service_id, user_ids, db)
        if not service:
            raise HTTPException(status_code=404, detail="Service not found")
    
    if payload.service_package_id is not None:
        package = db.get(ServicePackage, payload.service_package_id)
        if not package:
            raise HTTPException(status_code=404, detail="Service package not found")

    appointment = Appointment(
        customer_id=payload.customer_id,
        service_id=payload.service_id,
        service_package_id=payload.service_package_id,
        scheduled_at=payload.scheduled_at,
        duration_minutes=payload.duration_minutes,
        status=payload.status or "scheduled",
        notes=payload.notes,
    )
    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    return appointment

@router.get("/", response_model=list[AppointmentOut])
def list_appointments(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user)
):
    """Listar citas de clientes del usuario actual y del padre si es sub-usuario"""
    require_appointment_feature(current_user, Feature.VIEW_APPOINTMENTS)
    user_ids = get_user_ids_for_data_sharing(current_user)
    return (
        db.query(Appointment)
        .join(Customer)
        .filter(Customer.user_id.in_(user_ids))
        .options(joinedload(Appointment.customer))
        .offset(skip)
        .limit(limit)
        .all()
    )

@router.get("/{appointment_id}", response_model=AppointmentOut)
def get_appointment(
    appointment_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user)
):
    """Obtener detalles de una cita"""
    require_appointment_feature(current_user, Feature.VIEW_APPOINTMENTS)
    user_ids = get_user_ids_for_data_sharing(current_user)
    appointment = db.query(Appointment).join(Customer).filter(
        Appointment.id == appointment_id,
        Customer.user_id.in_(user_ids)
    ).first()
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    return appointment

@router.put("/{appointment_id}", response_model=AppointmentOut)
def update_appointment(
    appointment_id: int,
    payload: AppointmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user)
):
    """Actualizar cita - los sub-usuarios pueden actualizar citas del padre"""
    require_appointment_feature(current_user, Feature.EDIT_APPOINTMENTS)
    user_ids = get_user_ids_for_data_sharing(current_user)
    appointment = db.query(Appointment).join(Customer).filter(
        Appointment.id == appointment_id,
        Customer.user_id.in_(user_ids)
    ).first()
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "service_id" in update_data and update_data["service_id"] is not None:
        service = get_accessible_service(update_data["service_id"], user_ids, db)
        if not service:
            raise HTTPException(status_code=404, detail="Service not found")

    for field, value in update_data.items():
        setattr(appointment, field, value)

    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    return appointment

@router.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_appointment(
    appointment_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user)
):
    """Eliminar cita - los sub-usuarios pueden eliminar citas del padre"""
    require_appointment_feature(current_user, Feature.DELETE_APPOINTMENTS)
    user_ids = get_user_ids_for_data_sharing(current_user)
    appointment = db.query(Appointment).join(Customer).filter(
        Appointment.id == appointment_id,
        Customer.user_id.in_(user_ids)
    ).first()
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    db.delete(appointment)
    db.commit()
    return None
