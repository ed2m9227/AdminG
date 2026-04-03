"""
AI Query Builder
================
Translates intent IDs into safe SQLAlchemy queries.

Design principles:
  - SRP: only responsible for building and executing queries — no intent
         detection, no response formatting.
  - OCP: add a new intent by (a) writing a handler function below and
         (b) registering it in _HANDLERS.  Existing code is unchanged.
  - DIP: queries are built against model abstractions, never raw SQL.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Callable

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.appointment import Appointment
from app.models.customer import Customer
from app.models.payment import Payment
from app.models.payment_item import PaymentItem
from app.models.service import Service

# ─── Type alias ────────────────────────────────────────────────────────────────
QueryResult = dict  # {"rows": list[dict], "chart": dict}


# ─── Shared handlers ───────────────────────────────────────────────────────────
def _monthly_revenue(db: Session, user_ids: list[int], **_) -> QueryResult:
    month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    total = (
        db.query(func.coalesce(func.sum(Payment.final_amount), 0))
        .filter(
            Payment.user_id.in_(user_ids),
            Payment.status == "completed",
            Payment.created_at >= month_start,
        )
        .scalar()
    )
    value = float(total or 0)
    return {
        "rows": [{"metric": "monthly_revenue", "value": value}],
        "chart": {
            "type": "metric",
            "labels": ["Mes actual"],
            "datasets": [{"label": "Ingresos", "data": [value]}],
        },
    }


def _recurrent_clients(
    db: Session, user_ids: list[int], business_type: str | None = None, **_
) -> QueryResult:
    """Clients with 2+ appointments (or CRM consultations for veterinary)."""
    is_vet = (business_type or "").strip().lower() == "veterinaria"

    if is_vet:
        from app.models.crm import Consultation

        rows = (
            db.query(
                Customer.full_name.label("customer_name"),
                func.count(Consultation.id).label("visits"),
            )
            .join(Consultation, Consultation.customer_id == Customer.id)
            .filter(Customer.user_id.in_(user_ids))
            .group_by(Customer.id)
            .having(func.count(Consultation.id) >= 2)
            .order_by(func.count(Consultation.id).desc())
            .all()
        )
    else:
        rows = (
            db.query(
                Customer.full_name.label("customer_name"),
                func.count(Appointment.id).label("visits"),
            )
            .join(Appointment, Appointment.customer_id == Customer.id)
            .filter(Customer.user_id.in_(user_ids))
            .group_by(Customer.id)
            .having(func.count(Appointment.id) >= 2)
            .order_by(func.count(Appointment.id).desc())
            .all()
        )

    parsed = [{"customer_name": r.customer_name, "visits": int(r.visits)} for r in rows]
    return {
        "rows": parsed,
        "chart": {
            "type": "bar",
            "labels": [r["customer_name"] for r in parsed[:10]],
            "datasets": [{"label": "Visitas", "data": [r["visits"] for r in parsed[:10]]}],
        },
    }


def _top_services(db: Session, user_ids: list[int], **_) -> QueryResult:
    rows = (
        db.query(
            Service.name.label("service_name"),
            func.coalesce(func.sum(PaymentItem.subtotal), 0).label("revenue"),
            func.count(PaymentItem.id).label("count"),
        )
        .join(PaymentItem, PaymentItem.service_id == Service.id)
        .join(Payment, Payment.id == PaymentItem.payment_id)
        .filter(Payment.user_id.in_(user_ids), Payment.status == "completed")
        .group_by(Service.id)
        .order_by(func.count(PaymentItem.id).desc())
        .limit(10)
        .all()
    )
    parsed = [
        {"service_name": r.service_name, "revenue": float(r.revenue or 0), "count": int(r.count)}
        for r in rows
    ]
    return {
        "rows": parsed,
        "chart": {
            "type": "bar",
            "labels": [r["service_name"] for r in parsed],
            "datasets": [{"label": "Ventas", "data": [r["count"] for r in parsed]}],
        },
    }


def _recent_appointments(db: Session, user_ids: list[int], **_) -> QueryResult:
    since = datetime.utcnow() - timedelta(days=7)
    rows = (
        db.query(
            Customer.full_name.label("customer_name"),
            Appointment.scheduled_at.label("date"),
            Appointment.status.label("status"),
        )
        .join(Appointment, Appointment.customer_id == Customer.id)
        .filter(Customer.user_id.in_(user_ids), Appointment.scheduled_at >= since)
        .order_by(Appointment.scheduled_at.desc())
        .limit(20)
        .all()
    )
    parsed = [
        {"customer_name": r.customer_name, "date": str(r.date)[:16], "status": r.status}
        for r in rows
    ]
    return {
        "rows": parsed,
        "chart": {"type": "none", "labels": [], "datasets": []},
    }


# ─── Healthcare handlers ────────────────────────────────────────────────────────
def _appointments_this_week(db: Session, user_ids: list[int], **_) -> QueryResult:
    week_start = datetime.utcnow() - timedelta(days=datetime.utcnow().weekday())
    total = (
        db.query(Appointment)
        .join(Customer, Customer.id == Appointment.customer_id)
        .filter(Customer.user_id.in_(user_ids), Appointment.scheduled_at >= week_start)
        .count()
    )
    return {
        "rows": [{"metric": "appointments_this_week", "value": total}],
        "chart": {
            "type": "metric",
            "labels": ["Esta semana"],
            "datasets": [{"label": "Citas", "data": [total]}],
        },
    }


def _patients_without_visit_6_months(db: Session, user_ids: list[int], **_) -> QueryResult:
    cutoff = datetime.utcnow() - timedelta(days=180)
    rows = (
        db.query(Customer, func.max(Appointment.scheduled_at).label("last_visit"))
        .outerjoin(Appointment, Appointment.customer_id == Customer.id)
        .filter(Customer.user_id.in_(user_ids))
        .group_by(Customer.id)
        .having(
            (func.max(Appointment.scheduled_at).is_(None))
            | (func.max(Appointment.scheduled_at) < cutoff)
        )
        .all()
    )
    parsed = [
        {
            "customer_id": c.id,
            "customer_name": c.full_name,
            "last_visit": lv.isoformat() if lv else None,
        }
        for c, lv in rows
    ]
    return {
        "rows": parsed,
        "chart": {
            "type": "bar",
            "labels": [r["customer_name"] for r in parsed[:12]],
            "datasets": [{"label": "Sin visita (6m)", "data": [1 for _ in parsed[:12]]}],
        },
    }


# ─── Veterinary handlers ────────────────────────────────────────────────────────
def _consultations_this_week(db: Session, user_ids: list[int], **_) -> QueryResult:
    from app.models.crm import Consultation

    week_start = datetime.utcnow() - timedelta(days=datetime.utcnow().weekday())
    total = (
        db.query(Consultation)
        .filter(
            Consultation.user_id.in_(user_ids),
            Consultation.consultation_date >= week_start,
        )
        .count()
    )
    return {
        "rows": [{"metric": "consultations_this_week", "value": total}],
        "chart": {
            "type": "metric",
            "labels": ["Esta semana"],
            "datasets": [{"label": "Consultas", "data": [total]}],
        },
    }


def _pets_without_visit_6_months(db: Session, user_ids: list[int], **_) -> QueryResult:
    from app.modules.crm.analytics.metrics import pets_without_visit_since

    rows = pets_without_visit_since(db, user_ids, months=6)
    return {
        "rows": rows,
        "chart": {
            "type": "bar",
            "labels": [r["customer_name"] for r in rows[:12]],
            "datasets": [{"label": "Sin visita (6m)", "data": [1 for _ in rows[:12]]}],
        },
    }


# ─── Intent handler registry ────────────────────────────────────────────────────
# Maps intent_id → handler.
# To add a new intent: write a handler above and add it here.
_HANDLERS: dict[str, Callable] = {
    "monthly_revenue": _monthly_revenue,
    "recurrent_clients": _recurrent_clients,
    "top_services": _top_services,
    "recent_appointments": _recent_appointments,
    "appointments_this_week": _appointments_this_week,
    "patients_without_visit_6_months": _patients_without_visit_6_months,
    "consultations_this_week": _consultations_this_week,
    "pets_without_visit_6_months": _pets_without_visit_6_months,
}


def run_query_for_intent(
    intent: str,
    db: Session,
    user_ids: list[int],
    business_type: str | None = None,
) -> QueryResult:
    """Execute the query for *intent* and return rows + chart data.

    Args:
        intent:        Intent ID (from ``interpreter.detect_intent``).
        db:            Active SQLAlchemy session.
        user_ids:      Multi-tenancy scope (owner + children).
        business_type: User's business type for type-specific dispatch.

    Returns:
        ``{"rows": [...], "chart": {...}}``
    """
    handler = _HANDLERS.get(intent)
    if handler is None:
        return {"rows": [], "chart": {"type": "none", "labels": [], "datasets": []}}
    return handler(db=db, user_ids=user_ids, business_type=business_type)
