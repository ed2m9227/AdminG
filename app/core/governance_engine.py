import json
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.models.governance import ConsentType, PolicyVersion, TrialPolicy, UserTrial
from app.models.user import User

GOVERNANCE_MODES = {
    "comunitario",
    "organizacional_civil",
    "territorial_publico",
    "institucional_estatal",
}

OPERATION_LEVELS = {
    "operativo",
    "administrativo",
    "estrategico",
    "control_auditoria",
}

OBJECTIVES = {
    "gestion_proyectos_casos",
    "control_recursos",
    "seguimiento_ciudadano",
    "transparencia_auditoria",
    "prevencion_riesgos",
    "inteligencia_territorial",
}

MATRIX = {
    "base_modules": ["projects_cases", "actors", "documents_evidence", "basic_reports"],
    "advanced_by_objective": {
        "gestion_proyectos_casos": ["projects_cases"],
        "control_recursos": ["fiscal_control"],
        "seguimiento_ciudadano": ["citizen_participation"],
        "transparencia_auditoria": ["fiscal_control", "audit_center"],
        "prevencion_riesgos": ["omnirisk", "pattern_analysis"],
        "inteligencia_territorial": ["territorial_intelligence", "pattern_analysis"],
    },
    "advanced_by_governance": {
        "comunitario": ["citizen_participation"],
        "organizacional_civil": ["pattern_analysis"],
        "territorial_publico": ["public_procurement", "fiscal_control"],
        "institucional_estatal": ["public_procurement", "fiscal_control", "territorial_intelligence"],
    },
}


def build_onboarding_activation(governance_mode: str, operation_level: str, objective: str) -> dict:
    modules = set(MATRIX["base_modules"])
    modules.update(MATRIX["advanced_by_objective"].get(objective, []))
    modules.update(MATRIX["advanced_by_governance"].get(governance_mode, []))

    analytics_depth = {
        "operativo": "low",
        "administrativo": "medium",
        "estrategico": "high",
        "control_auditoria": "audit",
    }.get(operation_level, "low")

    return {
        "modules": sorted(modules),
        "analytics_depth": analytics_depth,
        "traceability_mode": "strict",
    }


def ensure_default_policy_catalog(db: Session) -> None:
    if not db.query(ConsentType).first():
        db.add_all([
            ConsentType(code="terms_use", layer="general", purpose="Aceptacion de terminos de uso", is_mandatory=True, legal_basis_type="contract"),
            ConsentType(code="privacy_base", layer="general", purpose="Tratamiento base de datos operativos", is_mandatory=True, legal_basis_type="legal_obligation"),
            ConsentType(code="ai_decision_support", layer="specific", purpose="Uso de datos para soporte de decision asistida", is_mandatory=False, module_scope="ai"),
            ConsentType(code="ai_automated_scoring", layer="contextual", purpose="Scoring automatizado de riesgo OmniRisk", is_mandatory=False, module_scope="omnirisk"),
            ConsentType(code="behavior_analytics", layer="specific", purpose="Analitica de comportamiento", is_mandatory=False, module_scope="analytics"),
        ])

    if not db.query(PolicyVersion).first():
        now = datetime.utcnow()
        db.add_all([
            PolicyVersion(policy_type="terms_use", version_label="v1.0", jurisdiction_code="*", content_hash="terms_v1_hash", content_summary="Terminos de uso base", is_mandatory=True, effective_from=now),
            PolicyVersion(policy_type="privacy_policy", version_label="v1.0", jurisdiction_code="*", content_hash="privacy_v1_hash", content_summary="Politica de privacidad base", is_mandatory=True, effective_from=now),
        ])

    if not db.query(TrialPolicy).first():
        db.add_all([
            TrialPolicy(code="trial_comunitario_lider", governance_mode="comunitario", role_scope="manager", duration_days=30, approval_mode="auto", module_caps_json=json.dumps({"advanced": ["citizen_participation", "basic_reports"]})),
            TrialPolicy(code="trial_publico_funcionario", governance_mode="territorial_publico", role_scope="manager", duration_days=30, approval_mode="manual", module_caps_json=json.dumps({"advanced": ["fiscal_control"]})),
            TrialPolicy(code="trial_organizaciones", governance_mode="organizacional_civil", role_scope="manager", duration_days=15, approval_mode="auto", module_caps_json=json.dumps({"advanced": ["pattern_analysis"]})),
        ])

    db.commit()


def pick_trial_policy(db: Session, user: User) -> TrialPolicy | None:
    query = db.query(TrialPolicy).filter(TrialPolicy.is_active.is_(True))
    candidates = query.all()

    for policy in candidates:
        if policy.governance_mode and policy.governance_mode != (user.governance_mode or ""):
            continue
        if policy.role_scope and policy.role_scope != (user.role or ""):
            continue
        if policy.operation_level and policy.operation_level != (user.operation_level or ""):
            continue
        if policy.primary_objective and policy.primary_objective != (user.primary_objective or ""):
            continue
        return policy
    return None


def activate_trial_if_eligible(db: Session, user: User, approved_by_user_id: int | None = None) -> UserTrial | None:
    existing = db.query(UserTrial).filter(UserTrial.user_id == user.id, UserTrial.status == "active").first()
    if existing:
        return existing

    policy = pick_trial_policy(db, user)
    if not policy:
        return None

    if policy.approval_mode == "manual" and approved_by_user_id is None:
        return None

    now = datetime.utcnow()
    trial = UserTrial(
        user_id=user.id,
        tenant_id=user.parent_user_id if user.parent_user_id else user.id,
        trial_policy_id=policy.id,
        status="active",
        starts_at=now,
        ends_at=now + timedelta(days=policy.duration_days),
        approved_by_user_id=approved_by_user_id,
    )
    db.add(trial)
    db.commit()
    db.refresh(trial)
    return trial
