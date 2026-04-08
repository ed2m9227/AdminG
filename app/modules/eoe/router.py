from __future__ import annotations

import json
from datetime import datetime
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.collaboration import get_scope_user_ids, resolve_collaboration_owner_id
from app.core.features import Feature, has_feature, get_plan_limits, get_available_features, filter_for_business_type
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.audit_log import AuditLog
from app.models.cash_transaction import CashTransaction
from app.models.customer import Customer
from app.models.operations import OperationalEvent
from app.models.payment import Payment
from app.models.payroll_payment import PayrollPayment
from app.models.team_user import TeamUser
from app.models.user import User


router = APIRouter(tags=["EOE"])


BUSINESS_DOMINANT_BY_MODULE = {
    "publicidad": "agencia_marketing",
    "cobros": "gestion_cobros_recaudo",
    "consultorias": "servicios_profesionales",
    "pos": "tienda_retail",
    "nomina": "gestion_laboral_rrhh",
    "auditoria": "auditoria_control",
    "gobernanza": "institucional_publico",
    "politica": "institucional_publico",
    "quick_settings": None,
    "ia": None,
    "omnirisk": None,
}

ENTRY_POINT_BY_MODULE = {
    "publicidad": "captacion_usuarios",
    "cobros": "pago_deuda",
    "consultorias": "agenda_contacto",
    "pos": "caja_punto_fisico",
    "nomina": "pago_gestion_empleados",
    "auditoria": "revision_inspeccion",
    "gobernanza": "proceso_institucional",
    "politica": "proceso_institucional",
    "quick_settings": "interno",
    "ia": "interfaz_inteligente",
}

RISK_TYPES_DEFINED = ["laboral", "operativo", "financiero", "politico"]

MODULE_FEATURE_PREFIXES: dict[str, tuple[str, ...]] = {
    "crm": ("view_crm", "create_crm", "edit_crm", "delete_crm", "view_crm_analytics", "use_crm_ai_chat"),
    "cobros": ("view_payments", "create_payments", "refund_payments"),
    "consultorias": ("view_appointments", "create_appointments", "edit_appointments", "delete_appointments"),
    "pos": ("use_cashregister", "open_register", "close_register", "view_inventory"),
    "nomina": ("view_payroll", "manage_payroll", "view_hr", "manage_hr"),
    "auditoria": ("view_documents", "create_documents", "view_authorizations", "manage_authorizations"),
    "gobernanza": ("manage_team_users", "invite_users", "view_team"),
    "publicidad": tuple(),
    "ia": ("use_ai_chat", "use_crm_ai_chat", "use_ai_studio"),
    "quick_settings": tuple(),
}


class OperationalExecutionPayload(BaseModel):
    module: str = Field(min_length=2, max_length=60)
    business_type: str = Field(min_length=2, max_length=60)
    entry_point: str = Field(min_length=2, max_length=60)
    operation: str = Field(min_length=2, max_length=80)
    actor_user_id: int | None = None
    context: dict[str, Any] = Field(default_factory=dict)
    impact: dict[str, Any] = Field(default_factory=dict)


class FinancialChargePayload(BaseModel):
    module: str = Field(default="cobros", min_length=2, max_length=60)
    business_type: str = Field(min_length=2, max_length=60)
    entry_point: str = Field(default="pago_deuda", min_length=2, max_length=60)
    customer_id: int | None = None
    amount: Decimal = Field(gt=0)
    method: str = Field(default="cash", min_length=2, max_length=30)
    concept: str | None = None
    reference: str | None = None
    notes: str | None = None
    appointment_id: int | None = None
    service_id: int | None = None


class PayrollCalculatePayload(BaseModel):
    employee_id: int
    period_start: datetime
    period_end: datetime
    base_amount: Decimal = Field(default=Decimal("0"), ge=0)
    operation_rate: Decimal = Field(default=Decimal("0"), ge=0)
    sales_rate: Decimal = Field(default=Decimal("0"), ge=0)
    services_rate: Decimal = Field(default=Decimal("0"), ge=0)
    persist_payment: bool = False
    status: str = "pending"
    notes: str | None = None


class RiskEvaluatePayload(BaseModel):
    operation_id: int | None = None
    employee_id: int | None = None
    charge_id: int | None = None
    context: dict[str, Any] = Field(default_factory=dict)


def _resolve_user(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    user = db.query(User).filter(User.id == int(current_user["id"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def _scope_for_user(user: User, db: Session) -> tuple[int, list[int]]:
    owner_id = resolve_collaboration_owner_id(
        user,
        db,
        allow_external=True,
        allowed_owner_plans={"max", "admin"},
    )
    return owner_id, get_scope_user_ids(owner_id, db)


def _json_dump(data: dict[str, Any]) -> str:
    return json.dumps(data, ensure_ascii=True, default=str)


def _feature_gate(user: User, feature: Feature):
    if has_feature(user.plan, feature, user.role, is_parent_account=not bool(user.parent_user_id)):
        return
    raise HTTPException(status_code=403, detail=f"Feature not available: {feature.value}")


def _governance_check(user: User, module: str, business_type: str, entry_point: str) -> dict[str, Any]:
    module_key = (module or "").strip().lower()
    expected_entry = ENTRY_POINT_BY_MODULE.get(module_key)

    if module_key in {"pos", "cobros"}:
        _feature_gate(user, Feature.CREATE_PAYMENTS)
    if module_key in {"consultorias", "publicidad"}:
        _feature_gate(user, Feature.VIEW_APPOINTMENTS)
    if module_key in {"nomina"}:
        _feature_gate(user, Feature.VIEW_PAYROLL)

    entry_ok = expected_entry is None or expected_entry == entry_point
    limits = get_plan_limits(user.plan)

    return {
        "permissions": "ok",
        "context": {
            "user_plan": user.plan,
            "user_role": user.role,
            "user_business_type": user.business_type,
            "request_business_type": business_type,
            "entry_point_match": entry_ok,
        },
        "limits": limits,
        "allowed": True,
    }


def _get_or_create_walk_in_customer(owner_id: int, db: Session) -> Customer:
    record = db.query(Customer).filter(
        Customer.user_id == owner_id,
        Customer.full_name == "Cliente Mostrador",
    ).first()
    if record:
        return record

    record = Customer(
        user_id=owner_id,
        full_name="Cliente Mostrador",
        notes="Creado automáticamente para cobros sin cliente explícito.",
    )
    db.add(record)
    db.flush()
    return record


def _event_severity_from_impact(impact: dict[str, Any]) -> str:
    score = Decimal(str(impact.get("score", 0))) if impact else Decimal("0")
    if score >= Decimal("80"):
        return "critical"
    if score >= Decimal("50"):
        return "high"
    if score >= Decimal("20"):
        return "medium"
    return "low"


def _active_modules_for(user: User) -> list[str]:
    features = get_available_features(user.plan, user.role, is_parent_account=not bool(user.parent_user_id))
    features = filter_for_business_type(features, user.business_type)
    feature_set = set(features)

    active = []
    for module_name, required in MODULE_FEATURE_PREFIXES.items():
        if not required:
            if module_name in {"quick_settings", "ia"}:
                active.append(module_name)
            continue
        if any(item in feature_set for item in required):
            active.append(module_name)
    return sorted(set(active))


def _entry_points_for_modules(modules: list[str]) -> list[str]:
    output = []
    for module_name in modules:
        entry = ENTRY_POINT_BY_MODULE.get(module_name)
        if entry:
            output.append(entry)
    return sorted(set(output + ["web", "mobile", "whatsapp", "sms"]))


@router.get("/eoe/classification")
def get_eoe_classification(current_user: User = Depends(_resolve_user)):
    return {
        "user": {
            "id": current_user.id,
            "business_type": current_user.business_type,
            "plan": current_user.plan,
        },
        "rules": {
            "rule_1": "Si define como el usuario gana dinero, es tipo de negocio dominante",
            "rule_2": "Si es reutilizable entre negocios, es modulo",
            "rule_3": "Si inicia la interaccion, es entry point",
            "rule_4": "Si no genera valor directo, no es tipo de negocio",
        },
        "official": {
            "publicidad": {"module": True, "dominant_business_type": "agencia_marketing", "entry_point": "captacion_usuarios"},
            "cobros": {"module": True, "dominant_business_type": "gestion_cobros_recaudo", "entry_point": "pago_deuda"},
            "consultorias": {"module": True, "dominant_business_type": "servicios_profesionales", "entry_point": "agenda_contacto"},
            "pos": {"module": True, "dominant_business_type": "tienda_retail", "entry_point": "caja_punto_fisico"},
            "nomina": {"module": True, "dominant_business_type": "gestion_laboral_rrhh", "entry_point": "pago_gestion_empleados"},
            "auditoria": {"module": True, "dominant_business_type": "auditoria_control", "entry_point": "revision_inspeccion"},
            "gobernanza": {"module": True, "dominant_business_type": "institucional_publico", "entry_point": "proceso_institucional"},
            "quick_settings": {"module": True, "dominant_business_type": None, "entry_point": "interno"},
            "ia": {"module": True, "dominant_business_type": None, "entry_point": "interfaz_inteligente"},
            "omnirisk": {"module": False, "dominant_business_type": None, "entry_point": None, "status": "latent"},
        },
    }


@router.get("/eoe/business/declarations")
def get_business_declarations(
    db: Session = Depends(get_db),
    current_user: User = Depends(_resolve_user),
):
    owner_candidates: dict[int, User] = {}
    if current_user.parent_user_id:
        owner = db.query(User).filter(User.id == current_user.parent_user_id).first()
        if owner:
            owner_candidates[owner.id] = owner
    else:
        owner_candidates[current_user.id] = current_user

    memberships = db.query(TeamUser).filter(
        TeamUser.member_user_id == current_user.id,
        TeamUser.is_active.is_(True),
        TeamUser.status == "active",
    ).all()
    for membership in memberships:
        owner = db.query(User).filter(User.id == membership.team_owner_id).first()
        if owner:
            owner_candidates[owner.id] = owner

    declarations = []
    for owner in owner_candidates.values():
        modules = _active_modules_for(owner)
        declarations.append(
            {
                "business_owner_id": owner.id,
                "business_owner_email": owner.email,
                "dominant_business_type": owner.business_type,
                "active_modules": modules,
                "available_entry_points": _entry_points_for_modules(modules),
            }
        )

    return {
        "count": len(declarations),
        "declarations": declarations,
    }


@router.post("/execute-operational-unit")
def execute_operational_unit(
    payload: OperationalExecutionPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(_resolve_user),
):
    owner_id, _ = _scope_for_user(current_user, db)
    governance = _governance_check(current_user, payload.module, payload.business_type, payload.entry_point)

    enriched = {
        "module": payload.module,
        "business_type": payload.business_type,
        "entry_point": payload.entry_point,
        "operation": payload.operation,
        "context": payload.context,
        "actor": {
            "requested_by_user_id": current_user.id,
            "actor_user_id": payload.actor_user_id or current_user.id,
        },
        "impact": payload.impact,
        "governance": governance,
        "omnirisk_hooks": {
            "evaluate_endpoint": "/risk/evaluate",
            "risk_types": RISK_TYPES_DEFINED,
            "active": False,
        },
    }

    event = OperationalEvent(
        tenant_id=owner_id,
        event_type=payload.operation,
        severity=_event_severity_from_impact(payload.impact),
        probability_score=Decimal("0"),
        impact_score=Decimal("0"),
        risk_score=Decimal("0"),
        status="open",
        trigger_source=payload.entry_point,
        payload_json=_json_dump(enriched),
    )
    db.add(event)
    db.flush()

    audit = AuditLog(
        user_id=current_user.id,
        action="execute_operational_unit",
        entity_type="operational_event",
        entity_id=event.id,
        detail=event.payload_json,
    )
    db.add(audit)
    db.commit()
    db.refresh(event)

    return {
        "success": True,
        "event_id": event.id,
        "governance": governance,
        "audit_id": audit.id,
        "trace": "Entry Point -> Tipo de negocio -> Modulo -> Unidad Operativa -> Evento",
    }


@router.post("/financial/charge")
def create_financial_charge(
    payload: FinancialChargePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(_resolve_user),
):
    owner_id, scope_user_ids = _scope_for_user(current_user, db)
    _governance_check(current_user, payload.module, payload.business_type, payload.entry_point)
    _feature_gate(current_user, Feature.CREATE_PAYMENTS)

    customer = None
    if payload.customer_id:
        customer = db.query(Customer).filter(
            Customer.id == payload.customer_id,
            Customer.user_id.in_(scope_user_ids),
        ).first()
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found in current scope")
    else:
        customer = _get_or_create_walk_in_customer(owner_id, db)

    status_value = "completed" if payload.method.lower() in {"cash", "pos", "card", "transfer"} else "pending"
    payment = Payment(
        user_id=current_user.id,
        customer_id=customer.id,
        amount=payload.amount,
        discount_amount=Decimal("0"),
        final_amount=payload.amount,
        concept=payload.concept or f"Charge via {payload.module}",
        method=payload.method,
        reference=payload.reference,
        notes=payload.notes,
        status=status_value,
        appointment_id=payload.appointment_id,
        service_id=payload.service_id,
        paid_at=datetime.utcnow() if status_value == "completed" else None,
    )
    db.add(payment)
    db.flush()

    if payload.module.strip().lower() == "pos":
        cash_tx = CashTransaction(
            user_id=current_user.id,
            customer_id=customer.id,
            payment_id=payment.id,
            transaction_type="sale",
            amount=payload.amount,
            description=payload.concept or "POS charge",
        )
        db.add(cash_tx)

    audit = AuditLog(
        user_id=current_user.id,
        action="financial_charge",
        entity_type="payment",
        entity_id=payment.id,
        detail=_json_dump(
            {
                "module": payload.module,
                "business_type": payload.business_type,
                "entry_point": payload.entry_point,
                "amount": str(payload.amount),
                "method": payload.method,
            }
        ),
    )
    db.add(audit)
    db.commit()
    db.refresh(payment)

    return {
        "success": True,
        "payment_id": payment.id,
        "status": payment.status,
        "income_generated": float(payment.final_amount),
        "trace": {
            "module": payload.module,
            "entry_point": payload.entry_point,
            "business_type": payload.business_type,
        },
    }


@router.post("/payroll/calculate")
def calculate_payroll(
    payload: PayrollCalculatePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(_resolve_user),
):
    owner_id, scope_user_ids = _scope_for_user(current_user, db)
    _feature_gate(current_user, Feature.VIEW_PAYROLL)

    employee = db.query(User).filter(User.id == payload.employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    if employee.id not in scope_user_ids:
        raise HTTPException(status_code=403, detail="Employee out of current tenant scope")

    ops_events = db.query(OperationalEvent).filter(
        OperationalEvent.tenant_id == owner_id,
        OperationalEvent.created_at >= payload.period_start,
        OperationalEvent.created_at <= payload.period_end,
    ).all()

    operations_count = 0
    operations_trace: list[dict[str, Any]] = []
    for event in ops_events:
        try:
            body = json.loads(event.payload_json) if event.payload_json else {}
        except Exception:
            body = {}
        actor_block = body.get("actor", {})
        actor_user_id = actor_block.get("actor_user_id")
        if actor_user_id is None:
            continue
        if int(actor_user_id) != int(employee.id):
            continue
        operations_count += 1
        operations_trace.append(
            {
                "event_id": event.id,
                "operation": body.get("operation") or event.event_type,
                "module": body.get("module"),
                "entry_point": body.get("entry_point"),
                "created_at": event.created_at.isoformat(),
            }
        )

    sales_payments = db.query(Payment).filter(
        Payment.user_id == employee.id,
        Payment.status == "completed",
        Payment.created_at >= payload.period_start,
        Payment.created_at <= payload.period_end,
        Payment.method.in_(["cash", "card", "transfer", "pos"]),
    ).all()
    sales_total = sum(p.final_amount for p in sales_payments) or Decimal("0")

    service_payments = db.query(Payment).filter(
        Payment.user_id == employee.id,
        Payment.status == "completed",
        Payment.created_at >= payload.period_start,
        Payment.created_at <= payload.period_end,
        (Payment.service_id.is_not(None) | Payment.appointment_id.is_not(None) | Payment.service_package_id.is_not(None)),
    ).all()
    services_total = sum(p.final_amount for p in service_payments) or Decimal("0")

    operation_component = Decimal(payload.operation_rate) * Decimal(operations_count)
    sales_component = Decimal(payload.sales_rate) * sales_total
    services_component = Decimal(payload.services_rate) * services_total
    total_payable = Decimal(payload.base_amount) + operation_component + sales_component + services_component

    saved_payment_id = None
    if payload.persist_payment:
        _feature_gate(current_user, Feature.MANAGE_PAYROLL)
        period_label = payload.period_start.strftime("%Y-%m")
        saved = PayrollPayment(
            owner_user_id=owner_id,
            employee_user_id=employee.id,
            created_by_user_id=current_user.id,
            period=period_label,
            base_salary=Decimal(payload.base_amount),
            bonus=sales_component + services_component,
            deductions=Decimal("0"),
            net_amount=total_payable,
            status=(payload.status or "pending").strip().lower(),
            notes=payload.notes,
            paid_at=datetime.utcnow() if (payload.status or "pending").strip().lower() == "paid" else None,
        )
        db.add(saved)
        db.flush()
        saved_payment_id = saved.id

    audit = AuditLog(
        user_id=current_user.id,
        action="payroll_calculate",
        entity_type="user",
        entity_id=employee.id,
        detail=_json_dump(
            {
                "period_start": payload.period_start.isoformat(),
                "period_end": payload.period_end.isoformat(),
                "operations_count": operations_count,
                "sales_total": str(sales_total),
                "services_total": str(services_total),
                "total_payable": str(total_payable),
                "saved_payment_id": saved_payment_id,
            }
        ),
    )
    db.add(audit)
    db.commit()

    return {
        "employee": {
            "id": employee.id,
            "name": employee.full_name or employee.email,
            "email": employee.email,
        },
        "period": {
            "start": payload.period_start.isoformat(),
            "end": payload.period_end.isoformat(),
        },
        "traceability": {
            "operations_executed": operations_count,
            "operations": operations_trace,
            "sales_total": float(sales_total),
            "services_total": float(services_total),
        },
        "components": {
            "base_amount": float(payload.base_amount),
            "operation_component": float(operation_component),
            "sales_component": float(sales_component),
            "services_component": float(services_component),
        },
        "total_payable": float(total_payable),
        "saved_payroll_payment_id": saved_payment_id,
    }


@router.get("/audit/logs")
def list_audit_logs(
    action: str | None = Query(default=None),
    entity_type: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(_resolve_user),
):
    _, scope_user_ids = _scope_for_user(current_user, db)

    query = db.query(AuditLog).filter(AuditLog.user_id.in_(scope_user_ids))
    if action:
        query = query.filter(AuditLog.action == action)
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)

    records = query.order_by(AuditLog.created_at.desc()).limit(limit).all()
    return [
        {
            "id": row.id,
            "user_id": row.user_id,
            "actor_name": (row.actor.full_name or row.actor.email) if row.actor else None,
            "action": row.action,
            "entity_type": row.entity_type,
            "entity_id": row.entity_id,
            "detail": row.detail,
            "ip_address": row.ip_address,
            "created_at": row.created_at.isoformat(),
        }
        for row in records
    ]


@router.post("/risk/evaluate")
def evaluate_risk_placeholder(
    payload: RiskEvaluatePayload,
    current_user: User = Depends(_resolve_user),
):
    return {
        "status": "placeholder",
        "active": False,
        "message": "OmniRisk esta en modo latente. Solo se recibe contexto y se retorna estructura base.",
        "requested_by": current_user.id,
        "risk_types_defined": RISK_TYPES_DEFINED,
        "input": payload.model_dump(),
        "next_hook": "/risk/evaluate",
    }