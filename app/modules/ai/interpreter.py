"""
AI Intent Interpreter
=====================
Maps a free-text question to an intent ID string.

Design principles:
  - SRP: only responsible for intent detection — no DB access, no formatting.
  - OCP: adding a new intent only requires adding an entry to INTENT_PATTERNS
         and registering it in business_registry.BUSINESS_REGISTRY; this file
         does not need to change.
"""

from __future__ import annotations

import re
from typing import Sequence

# ─── Pattern registry ──────────────────────────────────────────────────────────
# Maps intent_id → list of regex patterns.  Any match triggers the intent.
# Ordered from most-specific to least-specific so narrower patterns win first.
INTENT_PATTERNS: dict[str, list[str]] = {

    # ── Veterinary-specific ─────────────────────────────────────────────
    "pets_without_visit_6_months": [
        r"mascotas?.*(sin visita|sin control|6 meses|seis meses)",
        r"animales?.*(sin visita|perdidos|que no vienen)",
    ],
    "consultations_this_week": [
        r"consultas?.*(semana|semanal|esta semana)",
        r"(cuántas|cuantas).*(consultas?).*(semana)",
    ],

    # ── Healthcare (non-vet + vet) ───────────────────────────────────────
    "patients_without_visit_6_months": [
        r"(pacientes?|clientes?).*(sin visita|sin consulta|6 meses|seis meses)",
        r"(pacientes?|clientes?).*(perdidos|que no vienen)",
    ],
    "appointments_this_week": [
        r"citas?.*(semana|semanal|esta semana)",
        r"(cuántas|cuantas).*(citas?|atenciones?).*(semana)",
    ],

    # ── Shared (all business types) ──────────────────────────────────────
    "top_services": [
        r"(servicios?|procedimientos?|tratamientos?).*(popular|más solicitad|top|frecuente)",
        r"qué.*(servicio|procedimiento|tratamiento).*(más se|se más)",
        r"servicios?.*(más vendid|más solicitad)",
    ],
    "recurrent_clients": [
        r"(clientes?|pacientes?|propietarios?).*(recurrentes?|frecuentes?|fieles?)",
        r"(clientes?|pacientes?).*(más de una|volvieron|retorno)",
    ],
    "recent_appointments": [
        r"(citas?|atenciones?|consultas?).*(recientes?|últimas?|hoy)",
        r"(últimas|recientes).*(citas?|visitas?|atenciones?)",
    ],
    "monthly_revenue": [
        r"ingresos?.*(mes|mensual|este mes)",
        r"(cuánto|cuanto).*(gané|gano|gane|ingresé|ingrese|facturé|facture)",
        r"facturación?.*(mes|mensual)",
        r"(dinero|plata|ganancias?).*(mes|mensual)",
    ],
}


def detect_intent(
    question: str,
    available_intents: Sequence[str],
) -> str:
    """Return the first matching intent that exists in *available_intents*.

    The caller supplies *available_intents* from ``business_registry.get_ai_intents``
    so only intents relevant to the user's business type can fire.

    Falls back to ``"unknown"`` when no pattern matches.
    """
    q = (question or "").strip().lower()
    for intent_id, patterns in INTENT_PATTERNS.items():
        if intent_id not in available_intents:
            continue
        for pattern in patterns:
            if re.search(pattern, q):
                return intent_id
    return "unknown"
