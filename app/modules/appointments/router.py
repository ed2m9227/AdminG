from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from app.db.session import get_db
from app.models.appointment import Appointment
from app.models.customer import Customer
from app.models.service import Service
from app.modules.appointments.schemas import AppointmentCreate, AppointmentOut, AppointmentUpdate
from app.core.security import get_current_user
from app.models.user import User

router = APIRouter(prefix="/appointments", tags=["Appointments"])

@router.post("/", response_model=AppointmentOut, status_code=status.HTTP_201_CREATED)
def create_appointment(
    payload: AppointmentCreate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    customer = db.get(Customer, payload.customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Verify customer belongs to current user
    if customer.user_id != int(current_user["id"]):
        raise HTTPException(status_code=403, detail="Not authorized to create appointments for this customer")

    if payload.service_id is not None:
        service = db.get(Service, payload.service_id)
        if not service:
            raise HTTPException(status_code=404, detail="Service not found")

    appointment = Appointment(
        customer_id=payload.customer_id,
        service_id=payload.service_id,
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
    current_user: dict = Depends(get_current_user)
):
    # Get appointments for customers belonging to current user
    return (
        db.query(Appointment)
        .join(Customer)
        .filter(Customer.user_id == int(current_user["id"]))
        .options(joinedload(Appointment.customer))
        .offset(skip)
        .limit(limit)
        .all()
    )

@router.get("/{appointment_id}", response_model=AppointmentOut)
def get_appointment(appointment_id: int, db: Session = Depends(get_db)):
    appointment = db.get(Appointment, appointment_id)
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appointment

@router.put("/{appointment_id}", response_model=AppointmentOut)
def update_appointment(
    appointment_id: int,
    payload: AppointmentUpdate,
    db: Session = Depends(get_db),
):
    appointment = db.get(Appointment, appointment_id)
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "service_id" in update_data and update_data["service_id"] is not None:
        service = db.get(Service, update_data["service_id"])
        if not service:
            raise HTTPException(status_code=404, detail="Service not found")

    for field, value in update_data.items():
        setattr(appointment, field, value)

    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    return appointment

@router.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_appointment(appointment_id: int, db: Session = Depends(get_db)):
    appointment = db.get(Appointment, appointment_id)
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    db.delete(appointment)
    db.commit()
    return None
