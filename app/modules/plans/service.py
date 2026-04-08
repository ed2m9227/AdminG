from sqlalchemy.orm import Session
from app.models.plan import Plan, PlanLimit, PlanFeature
from app.models.business_type import BusinessType
from app.core.business_registry import BUSINESS_REGISTRY

PLAN_DEFINITIONS = {
    "free": {
        "display_name": "AdminG Free",
        "price": 0,
        "description": "Plan gratuito: solo lectura para empezar",
        "limits": {
            "max_users": 1,
            "max_locations": 1,
            "max_appointments_per_month": 100,
            "max_storage_gb": 1,
        },
        "features": [
            ("customers", "Gestión de clientes", True),
            ("appointments", "Agenda y citas", True),
            ("reminders", "Recordatorios automáticos", False),
            ("basic_reports", "Reportes básicos", False),
            ("inventory", "Almacén/Inventario", False),
            ("accounting", "Contabilidad", False),
            ("sms_reminders", "Recordatorios por SMS", False),
            ("api", "Acceso a API", False),
        ]
    },
    "starter": {
        "display_name": "AdminG Starter",
        "price": 39900,
        "description": "Plan inicial: clientes, citas e inventario básico",
        "limits": {
            "max_users": 5,
            "max_locations": 1,
            "max_appointments_per_month": 1000,
            "max_storage_gb": 5,
        },
        "features": [
            ("customers", "Gestión de clientes", True),
            ("appointments", "Agenda y citas", True),
            ("reminders", "Recordatorios automáticos", True),
            # basic_reports intentionally disabled for starter
            ("inventory", "Almacén/Inventario", True),
            ("cashregister", "Caja registradora", True),
            ("team", "Mi equipo", True),
            ("accounting", "Contabilidad", False),
            ("sms_reminders", "Recordatorios por SMS", False),
            ("api", "Acceso a API", False),
        ]
    },
    "pro": {
        "display_name": "AdminG Pro",
        "price": 99900,
        "description": "Plan profesional: pagos, reportes avanzados y equipo",
        "limits": {
            "max_users": 25,
            "max_locations": 3,
            "max_appointments_per_month": 10000,
            "max_storage_gb": 50,
        },
        "features": [
            ("customers", "Gestión de clientes", True),
            ("appointments", "Agenda y citas", True),
            ("reminders", "Recordatorios automáticos", True),
            ("basic_reports", "Reportes básicos", True),
            ("advanced_reports", "Reportes avanzados", True),
            ("inventory", "Almacén/Inventario", True),
            ("accounting", "Contabilidad", False),
            ("sms_reminders", "Recordatorios por SMS", True),
            ("api", "Acceso a API", True),
        ]
    },
    "max": {
        "display_name": "AdminG Max",
        "price": 249900,
        "description": "Plan empresarial: acceso total, documentos, autorizaciones y escalabilidad",
        "limits": {
            "max_users": 100,
            "max_locations": 10,
            "max_appointments_per_month": 100000,
            "max_storage_gb": 200,
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
            ("documents", "Documentos", True),
            ("authorizations", "Autorizaciones", True),
        ]
    },
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


# Icon mapping for each registry entry
_BUSINESS_ICONS = {
    "veterinaria": "🐾",
    "consultorio": "🏥",
    "clinica": "⚕️",
    "dentista": "🦷",
    "dental": "🦷",
    "fisioterapia": "🏃",
    "nutricion": "🥗",
    "medicina_general": "🩺",
    "barberia": "💈",
    "salon": "💅",
    "spa": "🧖",
    "inmobiliaria": "🏠",
    "propiedad_horizontal": "🏢",
    "gobernanza_politica": "🏛️",
    "consultoria": "💼",
    "publicidad": "📢",
    "otro": "📋",
}


def seed_business_types(db: Session) -> None:
    """Upsert all entries from BUSINESS_REGISTRY into the business_types table.

    New types are inserted; existing types have label/description/icon refreshed
    so the table always mirrors the registry.
    """
    for order, (code, cfg) in enumerate(BUSINESS_REGISTRY.items()):
        existing = db.query(BusinessType).filter(BusinessType.code == code).first()
        label_customers = cfg.vocabulary.get("customers", "Clientes")
        label_appointments = cfg.vocabulary.get("appointments", "Citas")
        icon = _BUSINESS_ICONS.get(code, "🏪")
        supports_pets = code == "veterinaria"

        if existing:
            existing.label = cfg.display_name
            existing.description = f"{cfg.display_name} — {cfg.category}"
            existing.icon = icon
            existing.default_label_customers = label_customers
            existing.default_label_appointments = label_appointments
            existing.supports_pets = supports_pets
            existing.is_active = True
            existing.order = order
        else:
            db.add(BusinessType(
                code=code,
                label=cfg.display_name,
                description=f"{cfg.display_name} — {cfg.category}",
                icon=icon,
                is_active=True,
                default_label_customers=label_customers,
                default_label_appointments=label_appointments,
                default_label_pets="Mascota",
                supports_pets=supports_pets,
                order=order,
            ))

    db.commit()
