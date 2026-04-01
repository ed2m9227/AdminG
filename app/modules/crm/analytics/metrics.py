from datetime import datetime, timedelta
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.crm import Consultation
from app.models.customer import Customer
from app.models.payment import Payment
from app.models.payment_item import PaymentItem


def get_basic_metrics(db: Session, user_ids: list[int], days: int = 30) -> dict:
    start_date = datetime.utcnow() - timedelta(days=max(days, 1))

    consultations_total = (
        db.query(Consultation)
        .filter(Consultation.user_id.in_(user_ids))
        .count()
    )

    consultations_period = (
        db.query(Consultation)
        .filter(
            Consultation.user_id.in_(user_ids),
            Consultation.consultation_date >= start_date,
        )
        .count()
    )

    recurring_clients = (
        db.query(Consultation.customer_id)
        .filter(Consultation.user_id.in_(user_ids))
        .group_by(Consultation.customer_id)
        .having(func.count(Consultation.id) >= 2)
        .count()
    )

    service_rows = (
        db.query(
            PaymentItem.service_id.label("service_id"),
            func.coalesce(func.sum(PaymentItem.subtotal), 0).label("total"),
        )
        .join(Payment, Payment.id == PaymentItem.payment_id)
        .filter(
            Payment.user_id.in_(user_ids),
            Payment.status == "completed",
            PaymentItem.service_id.isnot(None),
            Payment.created_at >= start_date,
        )
        .group_by(PaymentItem.service_id)
        .all()
    )

    service_revenue = [
        {
            "service_id": row.service_id,
            "total": float(row.total or 0),
        }
        for row in service_rows
    ]

    return {
        "consultations_total": consultations_total,
        "consultations_period": consultations_period,
        "recurring_clients": recurring_clients,
        "service_revenue": service_revenue,
    }


def pets_without_visit_since(db: Session, user_ids: list[int], months: int = 6) -> list[dict]:
    cutoff = datetime.utcnow() - timedelta(days=max(months, 1) * 30)

    rows = (
        db.query(Customer, func.max(Consultation.consultation_date).label("last_visit"))
        .outerjoin(Consultation, Consultation.customer_id == Customer.id)
        .filter(Customer.user_id.in_(user_ids))
        .group_by(Customer.id)
        .having(
            (func.max(Consultation.consultation_date).is_(None)) |
            (func.max(Consultation.consultation_date) < cutoff)
        )
        .all()
    )

    result = []
    for customer, last_visit in rows:
        result.append(
            {
                "customer_id": customer.id,
                "customer_name": customer.full_name,
                "last_visit": last_visit.isoformat() if last_visit else None,
            }
        )
    return result
