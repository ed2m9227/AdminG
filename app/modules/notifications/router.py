"""
Notifications Router
Gestión de notificaciones del sistema (stock bajo, citas próximas, etc.)
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import List
from app.db.session import get_db
from app.core.collaboration import get_scope_user_ids, resolve_collaboration_owner_id
from app.core.security import get_current_user
from app.models.user import User
from app.models.notification import Notification
from app.models.inventory import InventoryItem
from app.models.appointment import Appointment
from app.models.customer import Customer

router = APIRouter(prefix="/notifications", tags=["Notifications"])
READ_RETENTION_DAYS = 7
OVERDUE_GRACE_MINUTES = 10


def get_owner_and_scope(user: User, db: Session):
    owner_id = resolve_collaboration_owner_id(
        user,
        db,
        allow_external=True,
        allowed_owner_plans={"max", "admin"},
    )
    return owner_id, get_scope_user_ids(owner_id, db)


@router.get("/")
async def list_notifications(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return unread + recent read notifications for the current user scope."""
    user = db.query(User).filter(User.id == int(current_user["id"])).first()
    owner_id, _ = get_owner_and_scope(user, db)

    # Auto-generate notifications for this owner before returning
    _generate_notifications(owner_id, db)

    read_cutoff = datetime.utcnow() - timedelta(days=READ_RETENTION_DAYS)

    notifs = (
        db.query(Notification)
        .filter(
            Notification.user_id == owner_id,
            (Notification.is_read == False) | (Notification.created_at >= read_cutoff),
        )
        .order_by(Notification.created_at.desc())
        .limit(120)
        .all()
    )
    return [_to_dict(n) for n in notifs]


@router.get("/unread-count")
async def unread_count(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == int(current_user["id"])).first()
    owner_id, _ = get_owner_and_scope(user, db)
    _generate_notifications(owner_id, db)
    count = db.query(Notification).filter(
        Notification.user_id == owner_id,
        Notification.is_read == False,
    ).count()
    return {"count": count}


@router.post("/{notification_id}/read")
async def mark_read(
    notification_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == int(current_user["id"])).first()
    owner_id, _ = get_owner_and_scope(user, db)
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == owner_id,
    ).first()
    if notif:
        notif.is_read = True
        db.commit()
    return {"ok": True}


@router.post("/read-all")
async def mark_all_read(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == int(current_user["id"])).first()
    owner_id, _ = get_owner_and_scope(user, db)
    db.query(Notification).filter(
        Notification.user_id == owner_id,
        Notification.is_read == False,
    ).update({"is_read": True})
    db.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# Internal generator — called on GET /notifications to keep them fresh.
# Only creates a notification if one doesn't already exist today for the same
# reference so we don't spam duplicates.
# ---------------------------------------------------------------------------

def _generate_notifications(owner_id: int, db: Session):
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow_start = today_start + timedelta(days=1)
    now_utc = datetime.utcnow()
    _, scope_user_ids = get_owner_and_scope(db.query(User).filter(User.id == owner_id).first(), db)

    # -- Low stock: inventory items below min_quantity -----------------------
    from app.models.inventory import InventoryItem as Inv
    low_items = db.query(Inv).filter(
        Inv.user_id.in_(scope_user_ids),
        Inv.is_active == True,
        Inv.item_type == "product",
        Inv.quantity <= Inv.min_quantity,
    ).all()

    for item in low_items:
        exists = db.query(Notification).filter(
            Notification.user_id == owner_id,
            Notification.type == "low_stock",
            Notification.reference_id == item.id,
            Notification.created_at >= today_start,
        ).first()
        if not exists:
            db.add(Notification(
                user_id=owner_id,
                type="low_stock",
                title=f"Stock bajo: {item.name}",
                message=(
                    f"Quedan {item.quantity} unidades de '{item.name}' "
                    f"(mínimo configurado: {item.min_quantity})."
                ),
                reference_id=item.id,
                reference_type="inventory_item",
            ))

    # -- Upcoming appointments within the next 24 h -------------------------
    window_end = datetime.utcnow() + timedelta(hours=24)
    from sqlalchemy import and_
    upcoming = (
        db.query(Appointment)
        .join(Customer, Appointment.customer_id == Customer.id)
        .filter(
            Customer.user_id.in_(scope_user_ids),
            Appointment.scheduled_at >= datetime.utcnow(),
            Appointment.scheduled_at <= window_end,
            Appointment.status.in_(["scheduled", "confirmed"]),
        )
        .all()
    )

    for appt in upcoming:
        exists = db.query(Notification).filter(
            Notification.user_id == owner_id,
            Notification.type == "appointment",
            Notification.reference_id == appt.id,
            Notification.created_at >= today_start,
        ).first()
        if not exists:
            customer = db.query(Customer).filter(Customer.id == appt.customer_id).first()
            name = customer.full_name if customer else "Cliente"
            scheduled_local = appt.scheduled_at.strftime("%d/%m %H:%M")
            db.add(Notification(
                user_id=owner_id,
                type="appointment",
                title=f"Cita próxima: {name}",
                message=f"Cita programada para {scheduled_local}.",
                reference_id=appt.id,
                reference_type="appointment",
            ))

    # -- Overdue appointments (scheduled/confirmed already passed) ----------
    overdue_before = now_utc - timedelta(minutes=OVERDUE_GRACE_MINUTES)
    overdue_appts = (
        db.query(Appointment)
        .join(Customer, Appointment.customer_id == Customer.id)
        .filter(
            Customer.user_id.in_(scope_user_ids),
            Appointment.status.in_(["scheduled", "confirmed"]),
            Appointment.scheduled_at < overdue_before,
        )
        .all()
    )

    for appt in overdue_appts:
        exists = db.query(Notification).filter(
            Notification.user_id == owner_id,
            Notification.type == "appointment_overdue",
            Notification.reference_id == appt.id,
        ).first()
        if not exists:
            customer = db.query(Customer).filter(Customer.id == appt.customer_id).first()
            name = customer.full_name if customer else "Cliente"
            scheduled_local = appt.scheduled_at.strftime("%d/%m %H:%M")
            db.add(Notification(
                user_id=owner_id,
                type="appointment_overdue",
                title=f"Cita vencida: {name}",
                message=f"La cita de {name} programada para {scheduled_local} no fue cerrada.",
                reference_id=appt.id,
                reference_type="appointment",
            ))

    # -- Duplicate appointments for the same customer (active statuses) -----
    duplicate_appt_customers = (
        db.query(
            Appointment.customer_id,
            func.count(Appointment.id).label("appt_count")
        )
        .join(Customer, Appointment.customer_id == Customer.id)
        .filter(
            Customer.user_id.in_(scope_user_ids),
            Appointment.status.in_(["scheduled", "confirmed"]),
            Appointment.scheduled_at >= datetime.utcnow(),
        )
        .group_by(Appointment.customer_id)
        .having(func.count(Appointment.id) >= 2)
        .all()
    )

    for row in duplicate_appt_customers:
        customer = db.query(Customer).filter(Customer.id == row.customer_id).first()
        name = customer.full_name if customer else "Cliente"
        exists = db.query(Notification).filter(
            Notification.user_id == owner_id,
            Notification.type == "duplicate_appointment",
            Notification.reference_id == row.customer_id,
            Notification.created_at >= today_start,
        ).first()
        if not exists:
            db.add(Notification(
                user_id=owner_id,
                type="duplicate_appointment",
                title=f"Citas duplicadas: {name}",
                message=f"{name} tiene {row.appt_count} citas activas programadas.",
                reference_id=row.customer_id,
                reference_type="customer",
            ))

    # -- Duplicate customers by full_name (normalized) ----------------------
    duplicate_customers = (
        db.query(
            func.lower(func.trim(Customer.full_name)).label("normalized_name"),
            func.count(Customer.id).label("customer_count"),
        )
        .filter(Customer.user_id.in_(scope_user_ids))
        .group_by(func.lower(func.trim(Customer.full_name)))
        .having(func.count(Customer.id) >= 2)
        .all()
    )

    for row in duplicate_customers:
        exists = db.query(Notification).filter(
            Notification.user_id == owner_id,
            Notification.type == "duplicate_customer",
            Notification.reference_type == "customer_name",
            Notification.created_at >= today_start,
            Notification.message.contains(row.normalized_name),
        ).first()
        if not exists:
            db.add(Notification(
                user_id=owner_id,
                type="duplicate_customer",
                title="Clientes con nombre duplicado",
                message=f"Se detectaron {row.customer_count} clientes con el nombre '{row.normalized_name}'.",
                reference_id=None,
                reference_type="customer_name",
            ))

    # -- Daily summary for today's appointments -----------------------------
    today_appointments = (
        db.query(Appointment)
        .join(Customer, Appointment.customer_id == Customer.id)
        .filter(
            Customer.user_id.in_(scope_user_ids),
            Appointment.scheduled_at >= today_start,
            Appointment.scheduled_at < tomorrow_start,
            Appointment.status.in_(["scheduled", "confirmed"]),
        )
        .count()
    )

    if today_appointments > 0:
        exists = db.query(Notification).filter(
            Notification.user_id == owner_id,
            Notification.type == "appointment_today",
            Notification.reference_type == "daily_summary",
            Notification.created_at >= today_start,
        ).first()
        message = f"Tienes {today_appointments} cita(s) para hoy."
        if not exists:
            db.add(Notification(
                user_id=owner_id,
                type="appointment_today",
                title="Citas de hoy",
                message=message,
                reference_id=None,
                reference_type="daily_summary",
            ))
        elif (exists.message or "") != message:
            # Keep a single daily summary but update it cumulatively as new appointments are created.
            exists.message = message
            exists.is_read = False
            exists.created_at = datetime.utcnow()
            db.add(exists)

    db.commit()


def _to_dict(n: Notification) -> dict:
    return {
        "id": n.id,
        "type": n.type,
        "title": n.title,
        "message": n.message,
        "is_read": n.is_read,
        "reference_id": n.reference_id,
        "reference_type": n.reference_type,
        "created_at": n.created_at.isoformat(),
    }
