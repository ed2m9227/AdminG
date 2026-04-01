from datetime import datetime, timedelta
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.crm import Consultation
from app.models.customer import Customer
from app.models.payment import Payment
from app.modules.crm.analytics.metrics import pets_without_visit_since


def run_query_for_intent(intent: str, db: Session, user_ids: list[int]) -> dict:
    now = datetime.utcnow()

    if intent == "consultations_this_week":
        week_start = now - timedelta(days=now.weekday())
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

    if intent == "pets_without_visit_6_months":
        rows = pets_without_visit_since(db, user_ids, months=6)
        return {
            "rows": rows,
            "chart": {
                "type": "bar",
                "labels": [r["customer_name"] for r in rows[:12]],
                "datasets": [{"label": "Sin visita (6m)", "data": [1 for _ in rows[:12]]}],
            },
        }

    if intent == "monthly_revenue":
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        total = (
            db.query(func.coalesce(func.sum(Payment.final_amount), 0))
            .filter(
                Payment.user_id.in_(user_ids),
                Payment.status == "completed",
                Payment.created_at >= month_start,
            )
            .scalar()
        )
        total_float = float(total or 0)
        return {
            "rows": [{"metric": "monthly_revenue", "value": total_float}],
            "chart": {
                "type": "metric",
                "labels": ["Mes actual"],
                "datasets": [{"label": "Ingresos", "data": [total_float]}],
            },
        }

    if intent == "consultations_by_period":
        start_date = now - timedelta(days=30)
        rows = (
            db.query(
                func.date(Consultation.consultation_date).label("d"),
                func.count(Consultation.id).label("total"),
            )
            .filter(
                Consultation.user_id.in_(user_ids),
                Consultation.consultation_date >= start_date,
            )
            .group_by(func.date(Consultation.consultation_date))
            .order_by(func.date(Consultation.consultation_date))
            .all()
        )
        parsed = [{"date": str(r.d), "total": int(r.total)} for r in rows]
        return {
            "rows": parsed,
            "chart": {
                "type": "line",
                "labels": [r["date"] for r in parsed],
                "datasets": [{"label": "Consultas", "data": [r["total"] for r in parsed]}],
            },
        }

    if intent == "recurrent_clients":
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
        parsed = [{"customer_name": r.customer_name, "visits": int(r.visits)} for r in rows]
        return {
            "rows": parsed,
            "chart": {
                "type": "bar",
                "labels": [r["customer_name"] for r in parsed[:10]],
                "datasets": [{"label": "Visitas", "data": [r["visits"] for r in parsed[:10]]}],
            },
        }

    return {
        "rows": [],
        "chart": {"type": "none", "labels": [], "datasets": []},
    }
