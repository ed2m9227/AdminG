from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.collaboration import get_scope_user_ids, resolve_collaboration_owner_id
from app.core.features import Feature, has_feature
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.operations import ActionPlan, Expense, Incident, OperationalEvent, RiskRegistry
from app.models.user import User
from app.modules.operations.schemas import (
    ActionPlanCreate,
    ActionPlanOut,
    ExpenseCreate,
    ExpenseOut,
    IncidentCreate,
    IncidentOut,
    OperationsKpiOut,
    RiskCreate,
    RiskOut,
)

router = APIRouter(prefix="/operations", tags=["Operations"])


def _risk_category(score: int) -> str:
    if score >= 17:
        return "critical"
    if score >= 10:
        return "high"
    if score >= 5:
        return "medium"
    return "low"


def resolve_user(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == int(current_user["id"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def _target_user_and_scope(user: User, db: Session) -> tuple[int, list[int]]:
    owner_id = resolve_collaboration_owner_id(
        user,
        db,
        allow_external=True,
        allowed_owner_plans={"max", "admin"},
    )
    target_user_id = owner_id if (not user.parent_user_id and owner_id != user.id) else user.id
    return target_user_id, get_scope_user_ids(owner_id, db)


def require_feature(user: User, feature: Feature):
    if has_feature(user.plan, feature, user.role, is_parent_account=not bool(user.parent_user_id)):
        return True
    raise HTTPException(status_code=403, detail="Feature not available in your plan")


@router.get("/risks", response_model=list[RiskOut])
def list_risks(
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user),
):
    require_feature(current_user, Feature.VIEW_RISKS)
    _, user_ids = _target_user_and_scope(current_user, db)
    return (
        db.query(RiskRegistry)
        .filter(RiskRegistry.tenant_id.in_(user_ids))
        .order_by(RiskRegistry.created_at.desc())
        .all()
    )


@router.post("/risks", response_model=RiskOut, status_code=status.HTTP_201_CREATED)
def create_risk(
    payload: RiskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user),
):
    require_feature(current_user, Feature.CREATE_RISKS)
    target_user_id, _ = _target_user_and_scope(current_user, db)

    score = payload.probability_level * payload.impact_level
    risk = RiskRegistry(
        tenant_id=target_user_id,
        area=payload.area,
        risk_type=payload.risk_type,
        description=payload.description,
        probability_level=payload.probability_level,
        impact_level=payload.impact_level,
        risk_level_auto=score,
        category=_risk_category(score),
        owner_user_id=payload.owner_user_id,
        status="active",
    )
    db.add(risk)
    db.commit()
    db.refresh(risk)
    return risk


@router.get("/incidents", response_model=list[IncidentOut])
def list_incidents(
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user),
):
    require_feature(current_user, Feature.VIEW_INCIDENTS)
    _, user_ids = _target_user_and_scope(current_user, db)
    return (
        db.query(Incident)
        .filter(Incident.tenant_id.in_(user_ids))
        .order_by(Incident.created_at.desc())
        .all()
    )


@router.post("/incidents", response_model=IncidentOut, status_code=status.HTTP_201_CREATED)
def create_incident(
    payload: IncidentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user),
):
    require_feature(current_user, Feature.CREATE_INCIDENTS)
    target_user_id, user_ids = _target_user_and_scope(current_user, db)

    if payload.risk_id is not None:
        risk = db.query(RiskRegistry).filter(
            RiskRegistry.id == payload.risk_id,
            RiskRegistry.tenant_id.in_(user_ids),
        ).first()
        if not risk:
            raise HTTPException(status_code=404, detail="Risk not found")

    event = OperationalEvent(
        tenant_id=target_user_id,
        event_type="incident_reported",
        severity="high" if (payload.injured_people_count > 0 or payload.lost_days > 0) else "medium",
        probability_score=Decimal("0"),
        impact_score=Decimal("0"),
        risk_score=Decimal("0"),
        trigger_source="user",
        payload_json=payload.description,
    )
    db.add(event)
    db.flush()

    incident = Incident(
        tenant_id=target_user_id,
        event_id=event.id,
        risk_id=payload.risk_id,
        area=payload.area,
        incident_type=payload.incident_type,
        injured_people_count=payload.injured_people_count,
        lost_days=payload.lost_days,
        direct_cost=payload.direct_cost,
        indirect_cost=payload.indirect_cost,
        description=payload.description,
        root_cause=payload.root_cause,
        report_channel=payload.report_channel,
        created_by=current_user.id,
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)
    return incident


@router.post("/action-plans", response_model=ActionPlanOut, status_code=status.HTTP_201_CREATED)
def create_action_plan(
    payload: ActionPlanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user),
):
    require_feature(current_user, Feature.MANAGE_RISKS)
    _, user_ids = _target_user_and_scope(current_user, db)

    if payload.incident_id is not None:
        incident = db.query(Incident).filter(
            Incident.id == payload.incident_id,
            Incident.tenant_id.in_(user_ids),
        ).first()
        if not incident:
            raise HTTPException(status_code=404, detail="Incident not found")

    if payload.risk_id is not None:
        risk = db.query(RiskRegistry).filter(
            RiskRegistry.id == payload.risk_id,
            RiskRegistry.tenant_id.in_(user_ids),
        ).first()
        if not risk:
            raise HTTPException(status_code=404, detail="Risk not found")

    plan = ActionPlan(
        incident_id=payload.incident_id,
        risk_id=payload.risk_id,
        title=payload.title,
        owner_user_id=payload.owner_user_id,
        due_date=payload.due_date,
        status="open",
        progress_pct=0,
        estimated_cost=payload.estimated_cost,
        actual_cost=Decimal("0"),
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


@router.get("/expenses", response_model=list[ExpenseOut])
def list_expenses(
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user),
):
    require_feature(current_user, Feature.VIEW_EXPENSES)
    _, user_ids = _target_user_and_scope(current_user, db)
    return (
        db.query(Expense)
        .filter(Expense.tenant_id.in_(user_ids))
        .order_by(Expense.created_at.desc())
        .all()
    )


@router.post("/expenses", response_model=ExpenseOut, status_code=status.HTTP_201_CREATED)
def create_expense(
    payload: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user),
):
    require_feature(current_user, Feature.CREATE_EXPENSES)
    target_user_id, user_ids = _target_user_and_scope(current_user, db)

    if payload.related_incident_id is not None:
        incident = db.query(Incident).filter(
            Incident.id == payload.related_incident_id,
            Incident.tenant_id.in_(user_ids),
        ).first()
        if not incident:
            raise HTTPException(status_code=404, detail="Related incident not found")

    expense = Expense(
        tenant_id=target_user_id,
        employee_id=payload.employee_id or current_user.id,
        category=payload.category,
        amount=payload.amount,
        currency=payload.currency,
        expense_date=payload.expense_date or datetime.utcnow(),
        channel_origin=payload.channel_origin,
        related_event_id=payload.related_event_id,
        related_incident_id=payload.related_incident_id,
        status="submitted",
        receipt_url=payload.receipt_url,
        notes=payload.notes,
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


@router.patch("/expenses/{expense_id}/approve", response_model=ExpenseOut)
def approve_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user),
):
    require_feature(current_user, Feature.APPROVE_EXPENSES)
    _, user_ids = _target_user_and_scope(current_user, db)

    expense = db.query(Expense).filter(
        Expense.id == expense_id,
        Expense.tenant_id.in_(user_ids),
    ).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    expense.status = "approved"
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


@router.get("/kpis", response_model=OperationsKpiOut)
def operations_kpis(
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user),
):
    can_view_risks = has_feature(current_user.plan, Feature.VIEW_RISKS, current_user.role, is_parent_account=not bool(current_user.parent_user_id))
    can_view_expenses = has_feature(current_user.plan, Feature.VIEW_EXPENSES, current_user.role, is_parent_account=not bool(current_user.parent_user_id))
    if not (can_view_risks or can_view_expenses):
        raise HTTPException(status_code=403, detail="Feature not available in your plan")

    _, user_ids = _target_user_and_scope(current_user, db)

    incidents_count = db.query(func.count(Incident.id)).filter(Incident.tenant_id.in_(user_ids)).scalar() or 0

    active_risks_low = db.query(func.count(RiskRegistry.id)).filter(
        RiskRegistry.tenant_id.in_(user_ids),
        RiskRegistry.status == "active",
        RiskRegistry.category == "low",
    ).scalar() or 0
    active_risks_medium = db.query(func.count(RiskRegistry.id)).filter(
        RiskRegistry.tenant_id.in_(user_ids),
        RiskRegistry.status == "active",
        RiskRegistry.category == "medium",
    ).scalar() or 0
    active_risks_high = db.query(func.count(RiskRegistry.id)).filter(
        RiskRegistry.tenant_id.in_(user_ids),
        RiskRegistry.status == "active",
        RiskRegistry.category == "high",
    ).scalar() or 0
    active_risks_critical = db.query(func.count(RiskRegistry.id)).filter(
        RiskRegistry.tenant_id.in_(user_ids),
        RiskRegistry.status == "active",
        RiskRegistry.category == "critical",
    ).scalar() or 0

    total_actions = db.query(func.count(ActionPlan.id)).filter(
        ActionPlan.incident_id.in_(db.query(Incident.id).filter(Incident.tenant_id.in_(user_ids)))
    ).scalar() or 0

    completed_actions = db.query(func.count(ActionPlan.id)).filter(
        ActionPlan.status == "done",
        ActionPlan.incident_id.in_(db.query(Incident.id).filter(Incident.tenant_id.in_(user_ids)))
    ).scalar() or 0

    action_compliance_pct = round((completed_actions / total_actions) * 100, 2) if total_actions else 0.0

    total_incident_cost = db.query(func.coalesce(func.sum(Incident.direct_cost + Incident.indirect_cost), 0)).filter(
        Incident.tenant_id.in_(user_ids)
    ).scalar() or 0

    cost_per_incident = float(total_incident_cost / incidents_count) if incidents_count else 0.0

    critical_area_row = db.query(
        RiskRegistry.area,
        func.count(RiskRegistry.id).label("cnt"),
    ).filter(
        RiskRegistry.tenant_id.in_(user_ids),
        RiskRegistry.status == "active",
    ).group_by(RiskRegistry.area).order_by(func.count(RiskRegistry.id).desc()).first()

    return OperationsKpiOut(
        incidents_count=incidents_count,
        active_risks_low=active_risks_low,
        active_risks_medium=active_risks_medium,
        active_risks_high=active_risks_high,
        active_risks_critical=active_risks_critical,
        action_compliance_pct=action_compliance_pct,
        cost_per_incident=cost_per_incident,
        most_critical_area=critical_area_row[0] if critical_area_row else None,
    )
