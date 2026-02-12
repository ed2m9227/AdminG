from sqlalchemy.orm import Session
from app.models.plan import Plan, PlanLimit, PlanFeature

PLAN_DEFINITIONS = {
    "AdminG_Basic": {
        "display_name": "AdminG Basic",
        "price": 5000,
        "description": "Plan básico: agenda + clientes + recordatorios",
        "limits": {
            "max_users": 1,
            "max_locations": 1,
            "max_appointments_per_month": 500,
            "max_storage_gb": 1,
        },
        "features": [
            ("customers", "Gestión de clientes", True),
            ("appointments", "Agenda y citas", True),
            ("reminders", "Recordatorios automáticos", True),
            ("basic_reports", "Reportes básicos", True),
            ("inventory", "Almacén/Inventario", False),
            ("accounting", "Contabilidad", False),
            ("sms_reminders", "Recordatorios por SMS", False),
            ("api", "Acceso a API", False),
        ]
    },
    "AdminG_Plus": {
        "display_name": "AdminG Plus",
        "price": 30000,
        "description": "Plan intermedio: + reportes avanzados",
        "limits": {
            "max_users": 3,
            "max_locations": 1,
            "max_appointments_per_month": 2000,
            "max_storage_gb": 5,
        },
        "features": [
            ("customers", "Gestión de clientes", True),
            ("appointments", "Agenda y citas", True),
            ("reminders", "Recordatorios automáticos", True),
            ("basic_reports", "Reportes básicos", True),
            ("advanced_reports", "Reportes avanzados", True),
            ("inventory", "Almacén/Inventario", False),
            ("accounting", "Contabilidad", False),
            ("sms_reminders", "Recordatorios por SMS", False),
            ("api", "Acceso a API", False),
        ]
    },
    "AdminPro_Start": {
        "display_name": "AdminPro Start",
        "price": 50000,
        "description": "Plan profesional: + inventario + múltiples sedes",
        "limits": {
            "max_users": 5,
            "max_locations": 2,
            "max_appointments_per_month": 5000,
            "max_storage_gb": 25,
        },
        "features": [
            ("customers", "Gestión de clientes", True),
            ("appointments", "Agenda y citas", True),
            ("reminders", "Recordatorios automáticos", True),
            ("basic_reports", "Reportes básicos", True),
            ("advanced_reports", "Reportes avanzados", True),
            ("inventory", "Almacén/Inventario", True),
            ("sms_reminders", "Recordatorios por SMS", True),
            ("accounting", "Contabilidad", False),
            ("api", "Acceso a API", False),
        ]
    },
    "AdminPro_Max": {
        "display_name": "AdminPro Max",
        "price": 100000,
        "description": "Plan empresarial: acceso total",
        "limits": {
            "max_users": 10,
            "max_locations": 5,
            "max_appointments_per_month": 100000,
            "max_storage_gb": 100,
        },
        "features": [
            ("customers", "Gestión de clientes", True),
            ("appointments", "Agenda y citas", True),
            ("reminders", "Recordatorios automáticos", True),
            ("basic_reports", "Reportes básicos", True),
            ("advanced_reports", "Reportes avanzados", True),
            ("inventory", "Almacén/Inventario", True),
            ("accounting", "Contabilidad", True),
            ("sms_reminders", "Recordatorios por SMS", True),
            ("api", "Acceso a API", True),
        ]
    }
}

def seed_plans(db: Session):
    """Seed initial plans to database"""
    for plan_code, plan_data in PLAN_DEFINITIONS.items():
        # Check if plan already exists
        existing = db.query(Plan).filter(Plan.name == plan_code).first()
        if existing:
            continue

        # Create plan
        plan = Plan(
            name=plan_code,
            display_name=plan_data["display_name"],
            price=plan_data["price"],
            description=plan_data["description"],
            is_active=True
        )
        db.add(plan)
        db.flush()

        # Add limits
        for limit_name, limit_value in plan_data["limits"].items():
            limit = PlanLimit(
                plan_id=plan.id,
                limit_name=limit_name,
                limit_value=limit_value
            )
            db.add(limit)

        # Add features
        for feature_code, feature_name, is_enabled in plan_data["features"]:
            feature = PlanFeature(
                plan_id=plan.id,
                feature_code=feature_code,
                feature_name=feature_name,
                is_enabled=is_enabled
            )
            db.add(feature)

    db.commit()
