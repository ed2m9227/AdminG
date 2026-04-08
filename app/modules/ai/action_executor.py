from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime, timedelta
from decimal import Decimal, InvalidOperation

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.collaboration import get_scope_user_ids, resolve_collaboration_owner_id
from app.core.features import Feature, has_feature
from app.models.appointment import Appointment
from app.models.customer import Customer
from app.models.operations import Expense
from app.models.payment import Payment
from app.models.service import Service
from app.models.user import User


@dataclass
class ActionExecutionResult:
    status: str
    action_type: str
    message: str
    entity_id: int | None = None
    entity_type: str | None = None
    missing_fields: list[str] | None = None

    def to_dict(self) -> dict:
        return {
            "status": self.status,
            "action_type": self.action_type,
            "message": self.message,
            "entity_id": self.entity_id,
            "entity_type": self.entity_type,
            "missing_fields": self.missing_fields or [],
        }


ACTION_KEYWORDS = {
    "create_customer": ["cliente", "customer", "paciente"],
    "create_appointment": ["cita", "agendar", "agenda", "programa", "programar"],
    "create_payment": ["pago", "cobro", "cobrar", "abono", "registrar pago"],
    "create_expense": ["gasto", "egreso", "registrar gasto", "registrar egreso"],
}

METHOD_ALIASES = {
    "efectivo": "cash",
    "cash": "cash",
    "tarjeta": "card",
    "card": "card",
    "transferencia": "transfer",
    "transfer": "transfer",
    "montelibano": "montelibano_gen",
    "montelibano_gen": "montelibano_gen",
}


def detect_action_type(question: str) -> str | None:
    q = (question or "").strip().lower()
    if not q:
        return None

    for action_type, keywords in ACTION_KEYWORDS.items():
        if any(keyword in q for keyword in keywords):
            if any(verb in q for verb in ["crear", "crea", "agrega", "agendar", "agenda", "registrar", "registra", "cobra", "cobrar"]):
                return action_type
    return None


def execute_action(question: str, db: Session, current_user: User) -> ActionExecutionResult | None:
    action_type = detect_action_type(question)
    if not action_type:
        return None

    if action_type == "create_customer":
        return _create_customer(question, db, current_user)
    if action_type == "create_appointment":
        return _create_appointment(question, db, current_user)
    if action_type == "create_payment":
        return _create_payment(question, db, current_user)
    if action_type == "create_expense":
        return _create_expense(question, db, current_user)
    return None


def _owner_and_scope(current_user: User, db: Session) -> tuple[int, int, list[int]]:
    owner_id = resolve_collaboration_owner_id(
        current_user,
        db,
        allow_external=True,
        allowed_owner_plans={"max", "admin"},
    )
    target_user_id = owner_id if (not current_user.parent_user_id and owner_id != current_user.id) else current_user.id
    scope_user_ids = get_scope_user_ids(owner_id, db)
    return owner_id, target_user_id, scope_user_ids


def _require_feature(current_user: User, feature: Feature) -> None:
    if has_feature(current_user.plan, feature, current_user.role, is_parent_account=not bool(current_user.parent_user_id)):
        return
    raise HTTPException(status_code=403, detail="Feature not available in your plan")


def _clean_name(raw_value: str) -> str:
    value = re.sub(r"\s+", " ", raw_value).strip(" ,.;:-")
    return value.title()


def _extract_amount(question: str) -> Decimal | None:
    match = re.search(r"(?:por|de|valor|monto|total)\s*\$?\s*([\d.,]+)", question, re.IGNORECASE)
    if not match:
        match = re.search(r"\$\s*([\d.,]+)", question, re.IGNORECASE)
    if not match:
        return None

    raw_amount = match.group(1).strip().replace(" ", "")
    if "," in raw_amount and "." in raw_amount:
        raw_amount = raw_amount.replace(".", "").replace(",", ".")
    elif "," in raw_amount:
        raw_amount = raw_amount.replace(",", ".")

    try:
        return Decimal(raw_amount)
    except InvalidOperation:
        return None


def _extract_method(question: str) -> str | None:
    q = question.lower()
    for token, method in METHOD_ALIASES.items():
        if token in q:
            return method
    return None


def _extract_customer_name(question: str) -> str | None:
    patterns = [
        r"(?:cliente|customer|paciente)\s+(?:llamado|llamada|nombre|de nombre)?\s*([a-záéíóúñ][a-záéíóúñ ]{2,})",
        r"(?:para|de)\s+([a-záéíóúñ][a-záéíóúñ ]{2,})",
    ]
    for pattern in patterns:
        match = re.search(pattern, question, re.IGNORECASE)
        if not match:
            continue
        value = match.group(1)
        value = re.split(r"\b(hoy|mañana|pasado mañana|a las|con|por|para el|el día)\b", value, maxsplit=1, flags=re.IGNORECASE)[0]
        cleaned = _clean_name(value)
        if len(cleaned.split()) >= 2 or len(cleaned) >= 5:
            return cleaned
    return None


def _extract_customer_payload(question: str) -> dict:
    q = question.strip()
    name_match = re.search(
        r"(?:crear|crea|agrega|registra)\s+(?:un\s+)?(?:cliente|customer|paciente)\s+(?:llamado|llamada|de nombre)?\s*([a-záéíóúñ][a-záéíóúñ ]{2,})",
        q,
        re.IGNORECASE,
    )
    full_name = _clean_name(name_match.group(1)) if name_match else None

    phone_match = re.search(r"(?:tel[eé]fono|celular|whatsapp)\s*[: ]\s*([+\d][\d\s-]{6,})", q, re.IGNORECASE)
    email_match = re.search(r"([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})", q, re.IGNORECASE)

    return {
        "full_name": full_name,
        "phone": phone_match.group(1).strip() if phone_match else None,
        "email": email_match.group(1).strip() if email_match else None,
    }


def _extract_datetime(question: str) -> datetime | None:
    q = question.lower()
    base_date = datetime.utcnow()

    if "pasado mañana" in q:
        base_date = base_date + timedelta(days=2)
    elif "mañana" in q:
        base_date = base_date + timedelta(days=1)
    elif "hoy" in q:
        base_date = base_date
    else:
        iso_match = re.search(r"(\d{4}-\d{2}-\d{2})", q)
        if iso_match:
            try:
                base_date = datetime.strptime(iso_match.group(1), "%Y-%m-%d")
            except ValueError:
                return None
        else:
            local_match = re.search(r"(\d{1,2})/(\d{1,2})/(\d{2,4})", q)
            if local_match:
                day, month, year = local_match.groups()
                year_value = int(year)
                if year_value < 100:
                    year_value += 2000
                try:
                    base_date = datetime(year_value, int(month), int(day))
                except ValueError:
                    return None
            else:
                return None

    time_match = re.search(r"(?:a las|a la|hora)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?", q)
    if not time_match:
        time_match = re.search(r"\b(\d{1,2}):(\d{2})\b", q)

    hour = 9
    minute = 0
    if time_match:
        hour = int(time_match.group(1))
        minute = int(time_match.group(2) or 0)
        meridiem = time_match.group(3) if len(time_match.groups()) >= 3 else None
        if meridiem == "pm" and hour < 12:
            hour += 12
        if meridiem == "am" and hour == 12:
            hour = 0

    return base_date.replace(hour=hour, minute=minute, second=0, microsecond=0)


def _extract_service_name(question: str) -> str | None:
    match = re.search(r"(?:servicio|procedimiento|tratamiento)\s+([a-záéíóúñ0-9 ]{3,})", question, re.IGNORECASE)
    if not match:
        return None
    value = re.split(r"\b(para|mañana|hoy|pasado mañana|a las|el día|por)\b", match.group(1), maxsplit=1, flags=re.IGNORECASE)[0]
    return _clean_name(value)


def _find_customer_by_name(name: str, scope_user_ids: list[int], db: Session) -> Customer | None:
    normalized = " ".join(name.lower().split())
    customers = db.query(Customer).filter(Customer.user_id.in_(scope_user_ids)).all()
    exact = next((customer for customer in customers if " ".join(customer.full_name.lower().split()) == normalized), None)
    if exact:
        return exact
    return next((customer for customer in customers if normalized in customer.full_name.lower()), None)


def _find_service_by_name(name: str, scope_user_ids: list[int], db: Session) -> Service | None:
    normalized = name.lower().strip()
    services = db.query(Service).filter(Service.user_id.in_(scope_user_ids), Service.is_active == True).all()
    exact = next((service for service in services if service.name.lower().strip() == normalized), None)
    if exact:
        return exact
    return next((service for service in services if normalized in service.name.lower()), None)


def _create_customer(question: str, db: Session, current_user: User) -> ActionExecutionResult:
    _require_feature(current_user, Feature.CREATE_CUSTOMERS)
    _, target_user_id, scope_user_ids = _owner_and_scope(current_user, db)
    payload = _extract_customer_payload(question)

    if not payload["full_name"]:
        return ActionExecutionResult(
            status="needs_input",
            action_type="create_customer",
            message="Puedo crear el cliente, pero necesito al menos el nombre completo.",
            missing_fields=["full_name"],
        )

    existing = _find_customer_by_name(payload["full_name"], scope_user_ids, db)
    if existing:
        return ActionExecutionResult(
            status="completed",
            action_type="create_customer",
            message=f"El cliente {existing.full_name} ya existe con ID {existing.id}.",
            entity_id=existing.id,
            entity_type="customer",
        )

    customer = Customer(
        user_id=target_user_id,
        full_name=payload["full_name"],
        phone=payload["phone"],
        email=payload["email"],
        notes="Creado desde Admin IA.",
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return ActionExecutionResult(
        status="completed",
        action_type="create_customer",
        message=f"Cliente creado: {customer.full_name} (ID {customer.id}).",
        entity_id=customer.id,
        entity_type="customer",
    )


def _create_appointment(question: str, db: Session, current_user: User) -> ActionExecutionResult:
    _require_feature(current_user, Feature.CREATE_APPOINTMENTS)
    _, _, scope_user_ids = _owner_and_scope(current_user, db)
    customer_name = _extract_customer_name(question)
    scheduled_at = _extract_datetime(question)
    service_name = _extract_service_name(question)

    missing_fields = []
    if not customer_name:
        missing_fields.append("customer_name")
    if not scheduled_at:
        missing_fields.append("scheduled_at")
    if missing_fields:
        return ActionExecutionResult(
            status="needs_input",
            action_type="create_appointment",
            message="Puedo agendar la cita, pero necesito cliente y fecha/hora. Ejemplo: agenda cita para Ana Perez mañana a las 3 pm.",
            missing_fields=missing_fields,
        )

    customer = _find_customer_by_name(customer_name, scope_user_ids, db)
    if not customer:
        return ActionExecutionResult(
            status="needs_input",
            action_type="create_appointment",
            message=f"No encontré al cliente {customer_name}. Créalo primero o usa el nombre exacto registrado.",
            missing_fields=["customer_name"],
        )

    service = _find_service_by_name(service_name, scope_user_ids, db) if service_name else None
    duration_minutes = service.duration_minutes if service and service.duration_minutes else 60
    notes = "Creada desde Admin IA."
    if service_name and not service:
        notes = f"Creada desde Admin IA. Servicio solicitado: {service_name}."

    appointment = Appointment(
        customer_id=customer.id,
        service_id=service.id if service else None,
        scheduled_at=scheduled_at,
        duration_minutes=duration_minutes,
        status="scheduled",
        notes=notes,
    )
    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    return ActionExecutionResult(
        status="completed",
        action_type="create_appointment",
        message=f"Cita creada para {customer.full_name} el {scheduled_at.strftime('%Y-%m-%d %H:%M')} (ID {appointment.id}).",
        entity_id=appointment.id,
        entity_type="appointment",
    )


def _create_payment(question: str, db: Session, current_user: User) -> ActionExecutionResult:
    _require_feature(current_user, Feature.CREATE_PAYMENTS)
    owner_id, _, scope_user_ids = _owner_and_scope(current_user, db)
    amount = _extract_amount(question)
    method = _extract_method(question) or "cash"
    customer_name = _extract_customer_name(question)

    if amount is None:
        return ActionExecutionResult(
            status="needs_input",
            action_type="create_payment",
            message="Puedo registrar el pago, pero necesito el monto. Ejemplo: registra pago para Ana Perez por 50000 en efectivo.",
            missing_fields=["amount"],
        )

    customer = _find_customer_by_name(customer_name, scope_user_ids, db) if customer_name else None
    if customer_name and not customer:
        return ActionExecutionResult(
            status="needs_input",
            action_type="create_payment",
            message=f"No encontré al cliente {customer_name}. Usa el nombre exacto o crea el cliente primero.",
            missing_fields=["customer_name"],
        )

    if not customer:
        customer = db.query(Customer).filter(
            Customer.user_id == owner_id,
            Customer.full_name == "Cliente Mostrador",
        ).first()
        if not customer:
            customer = Customer(
                user_id=owner_id,
                full_name="Cliente Mostrador",
                notes="Creado automáticamente desde Admin IA para pagos sin cliente explícito.",
            )
            db.add(customer)
            db.flush()

    concept_match = re.search(r"(?:por|concepto|de)\s+[\d.,]+\s+(.*)$", question, re.IGNORECASE)
    concept = concept_match.group(1).strip(" .") if concept_match else "Registrado desde Admin IA"
    paid_at = datetime.utcnow() if method in {"cash", "montelibano_gen"} else None
    status = "completed" if paid_at else "pending"

    payment = Payment(
        user_id=current_user.id,
        customer_id=customer.id,
        amount=amount,
        discount_amount=Decimal("0"),
        final_amount=amount,
        concept=concept,
        method=method,
        status=status,
        notes="Registrado desde Admin IA.",
        paid_at=paid_at,
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return ActionExecutionResult(
        status="completed",
        action_type="create_payment",
        message=f"Pago registrado por ${payment.final_amount:,.2f} para {customer.full_name} (ID {payment.id}).",
        entity_id=payment.id,
        entity_type="payment",
    )


def _extract_expense_category(question: str) -> str | None:
    match = re.search(r"(?:gasto|egreso)\s+(?:de|por)?\s*([a-záéíóúñ ]{2,40})", question, re.IGNORECASE)
    if not match:
        return None
    value = re.split(r"\b(por|de\s+\$|monto|valor)\b", match.group(1), maxsplit=1, flags=re.IGNORECASE)[0]
    cleaned = _clean_name(value)
    return cleaned if cleaned else None


def _create_expense(question: str, db: Session, current_user: User) -> ActionExecutionResult:
    _require_feature(current_user, Feature.CREATE_EXPENSES)
    _, target_user_id, _ = _owner_and_scope(current_user, db)
    amount = _extract_amount(question)
    category = _extract_expense_category(question)

    missing_fields = []
    if not category:
        missing_fields.append("category")
    if amount is None:
        missing_fields.append("amount")
    if missing_fields:
        return ActionExecutionResult(
            status="needs_input",
            action_type="create_expense",
            message="Puedo registrar el gasto, pero necesito categoría y monto. Ejemplo: registra gasto de papelería por 25000.",
            missing_fields=missing_fields,
        )

    expense = Expense(
        tenant_id=target_user_id,
        employee_id=current_user.id,
        category=category,
        amount=amount,
        currency="COP",
        expense_date=datetime.utcnow(),
        channel_origin="ai",
        status="submitted",
        notes="Registrado desde Admin IA.",
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return ActionExecutionResult(
        status="completed",
        action_type="create_expense",
        message=f"Gasto registrado en {category} por ${expense.amount:,.2f} (ID {expense.id}).",
        entity_id=expense.id,
        entity_type="expense",
    )