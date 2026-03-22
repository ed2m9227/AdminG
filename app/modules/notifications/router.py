"""
Notifications Router
Gestión de notificaciones del sistema (stock bajo, citas próximas, etc.)
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List
from app.db.session import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.notification import Notification
from app.models.inventory import InventoryItem
from app.models.appointment import Appointment
from app.models.customer import Customer

router = APIRouter(prefix="/notifications", tags=["Notifications"])


def get_owner_and_scope(user: User, db: Session):
    owner_id = user.parent_user_id if user.parent_user_id else user.id
    child_ids = [uid for (uid,) in db.query(User.id).filter(User.parent_user_id == owner_id).all()]
    return owner_id, [owner_id, *child_ids]


@router.get("/")
async def list_notifications(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return unread + last 30 read notifications for the current user scope."""
    user = db.query(User).filter(User.id == int(current_user["id"])).first()
    owner_id, _ = get_owner_and_scope(user, db)

    # Auto-generate notifications for this owner before returning
    _generate_notifications(owner_id, db)

    notifs = (
        db.query(Notification)
        .filter(Notification.user_id == owner_id)
        .order_by(Notification.created_at.desc())
        .limit(50)
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

    # -- Low stock: inventory items below min_quantity -----------------------
    from app.models.inventory import InventoryItem as Inv
    low_items = db.query(Inv).filter(
        Inv.user_id == owner_id,
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
            Customer.user_id == owner_id,
            Appointment.scheduled_at >= datetime.utcnow(),
            Appointment.scheduled_at <= window_end,
            Appointment.status == "scheduled",
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
