"""
AI Chat Router
==============
Cross-business-type AI assistant.

Endpoints:
  POST /ai/chat           — answer a natural-language business question
  GET  /ai/examples       — question examples for the current business type
  GET  /ai/config         — full business-type config for the current user

Design:
  - Available intents are resolved from the user's ``business_type`` via
    ``business_registry``; no hardcoded type checks in this handler.
  - Query building and response formatting are delegated to specialised
    modules (interpreter, query_builder, response_formatter), keeping this
    file focused on HTTP concerns only (SRP).
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.business_registry import get_ai_intents, get_config
from app.core.features import Feature, has_feature
from app.core.security import get_current_user
from app.core.collaboration import resolve_collaboration_owner_id, get_scope_user_ids
from app.db.session import get_db
from app.models.user import User
from app.modules.ai.interpreter import detect_intent
from app.modules.ai.query_builder import run_query_for_intent
from app.modules.ai.response_formatter import format_answer, to_table
from app.modules.ai.schemas import ChatRequest, ChatResponse

router = APIRouter(prefix="/ai", tags=["AI"])


def _resolve_user(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    user = db.query(User).filter(User.id == int(current_user["id"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.post("/chat", response_model=ChatResponse)
def ai_chat(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(_resolve_user),
):
    """Business-type-aware AI chat.

    Available intents are determined by the user's ``business_type`` via
    ``business_registry.get_ai_intents`` — no hardcoded type checks here.
    """
    can_use = has_feature(
        current_user.plan, Feature.USE_AI_CHAT, current_user.role
    ) or has_feature(
        current_user.plan, Feature.USE_CRM_AI_CHAT, current_user.role
    )
    if not can_use:
        raise HTTPException(
            status_code=403, detail="AI chat not available in your plan"
        )

    business_type = current_user.business_type
    available_intents = get_ai_intents(business_type)
    intent = detect_intent(payload.question, available_intents)

    owner_id = resolve_collaboration_owner_id(
        current_user,
        db,
        allow_external=True,
        allowed_owner_plans={"max", "admin"},
    )
    user_ids = get_scope_user_ids(owner_id, db)

    result = run_query_for_intent(intent, db, user_ids, business_type)
    rows = result.get("rows", [])

    return ChatResponse(
        intent=intent,
        answer=format_answer(intent, rows),
        table=to_table(rows),
        chart=result.get("chart"),
        available_intents=list(available_intents),
    )


@router.get("/examples")
def ai_examples(current_user: User = Depends(_resolve_user)):
    """Return example questions tailored to the current business type."""
    available_intents = get_ai_intents(current_user.business_type)
    examples_by_intent: dict[str, str] = {
        "monthly_revenue": "¿Cuánto ingresé este mes?",
        "recurrent_clients": "¿Clientes recurrentes?",
        "top_services": "¿Cuáles son los servicios más solicitados?",
        "recent_appointments": "¿Citas recientes?",
        "appointments_this_week": "¿Cuántas citas esta semana?",
        "patients_without_visit_6_months": "¿Pacientes sin visita en 6 meses?",
        "consultations_this_week": "¿Cuántas consultas hubo esta semana?",
        "pets_without_visit_6_months": "¿Mascotas sin visita en 6 meses?",
    }
    return {
        "examples": [
            examples_by_intent[i]
            for i in available_intents
            if i in examples_by_intent
        ],
        "available_intents": list(available_intents),
        "business_type": current_user.business_type,
    }


@router.get("/config")
def ai_config(current_user: User = Depends(_resolve_user)):
    """Return the business-type configuration for the current user."""
    config = get_config(current_user.business_type)
    return {
        "business_type": current_user.business_type,
        "display_name": config.display_name,
        "category": config.category,
        "vocabulary": config.vocabulary,
        "available_intents": list(config.ai_intents),
    }
