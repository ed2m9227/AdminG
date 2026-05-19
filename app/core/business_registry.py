"""
Business Type Registry
======================
Single source of truth for all business-type-specific configuration.

To add a new business type: add ONE entry to BUSINESS_REGISTRY.
No other file needs to change.

Design principles applied:
  - OCP (Open/Closed):           extend by adding registry entries, not by
                                  modifying existing filtering logic.
  - SRP (Single Responsibility):  this module owns ONLY business-type config.
  - DIP (Dependency Inversion):   feature-filtering, AI-intent resolution,
                                  and vocabulary lookup all depend on this
                                  abstraction rather than on scattered
                                  hardcoded sets in routers or components.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Tuple

# ─── AI intent group constants ─────────────────────────────────────────────────
# Progressively richer sets; each tier is a superset of the previous one.

SHARED_INTENTS: Tuple[str, ...] = (
    "monthly_revenue",
    "recurrent_clients",
    "top_services",
    "recent_appointments",
)

HEALTHCARE_INTENTS: Tuple[str, ...] = SHARED_INTENTS + (
    "appointments_this_week",
    "patients_without_visit_6_months",
)

VETERINARY_INTENTS: Tuple[str, ...] = HEALTHCARE_INTENTS + (
    "consultations_this_week",
    "pets_without_visit_6_months",
)

# ─── Feature group constants ────────────────────────────────────────────────────
_CRM_FEATURES: Tuple[str, ...] = (
    "view_crm",
    "create_crm",
    "edit_crm",
    "delete_crm",
    "view_crm_analytics",
    "use_crm_ai_chat",
)

_MEDICAL_DOC_FEATURES: Tuple[str, ...] = (
    "view_documents",
    "create_documents",
    "edit_documents",
    "delete_documents",
    "view_authorizations",
    "create_authorizations",
    "manage_authorizations",
)

# Non-healthcare types lose medical-document workflows AND vet CRM
_NON_HEALTHCARE_BLOCKED: Tuple[str, ...] = _CRM_FEATURES + _MEDICAL_DOC_FEATURES

# Healthcare non-vet types only lose the veterinary-specific CRM
_HEALTHCARE_NON_VET_BLOCKED: Tuple[str, ...] = _CRM_FEATURES


# ─── Config dataclass ───────────────────────────────────────────────────────────
@dataclass(frozen=True)
class BusinessTypeConfig:
    """Immutable descriptor for a single business type.

    Attributes:
        id:               Unique key that matches the stored DB/localStorage value.
        display_name:     Human-readable label (Spanish).
        category:         Broad category: ``"healthcare"``, ``"service"``, or
                          ``"commercial"``.
        vocabulary:       Maps generic keys to localised UI labels,
                          e.g. ``{"customer": "Paciente"}``.
        blocked_features: Tuple of feature-value strings not available for
                          this business type, regardless of plan.
        ai_intents:       Ordered tuple of AI intent IDs the type can access.
    """

    id: str
    display_name: str
    category: str
    vocabulary: Dict[str, str]
    blocked_features: Tuple[str, ...]
    ai_intents: Tuple[str, ...]


# ─── Registry ───────────────────────────────────────────────────────────────────
BUSINESS_REGISTRY: Dict[str, BusinessTypeConfig] = {
    "veterinaria": BusinessTypeConfig(
        id="veterinaria",
        display_name="Veterinaria",
        category="healthcare",
        vocabulary={
            "customer": "Propietario",
            "customers": "Propietarios",
            "appointment": "Cita",
            "appointments": "Citas",
            "product": "Medicamento / Producto",
            "service": "Procedimiento",
        },
        blocked_features=(),          # no restrictions — CRM is designed for vets
        ai_intents=VETERINARY_INTENTS,
    ),
    "consultorio": BusinessTypeConfig(
        id="consultorio",
        display_name="Consultorio Médico",
        category="healthcare",
        vocabulary={
            "customer": "Paciente",
            "customers": "Pacientes",
            "appointment": "Consulta",
            "appointments": "Consultas",
            "product": "Medicamento / Insumo",
            "service": "Procedimiento",
        },
        blocked_features=_HEALTHCARE_NON_VET_BLOCKED,
        ai_intents=HEALTHCARE_INTENTS,
    ),
    "clinica": BusinessTypeConfig(
        id="clinica",
        display_name="Clínica",
        category="healthcare",
        vocabulary={
            "customer": "Paciente",
            "customers": "Pacientes",
            "appointment": "Consulta",
            "appointments": "Consultas",
            "product": "Medicamento / Insumo",
            "service": "Procedimiento",
        },
        blocked_features=_HEALTHCARE_NON_VET_BLOCKED,
        ai_intents=HEALTHCARE_INTENTS,
    ),
    "dentista": BusinessTypeConfig(
        id="dentista",
        display_name="Dentista",
        category="healthcare",
        vocabulary={
            "customer": "Paciente",
            "customers": "Pacientes",
            "appointment": "Cita",
            "appointments": "Citas",
            "product": "Insumo",
            "service": "Tratamiento",
        },
        blocked_features=_HEALTHCARE_NON_VET_BLOCKED,
        ai_intents=HEALTHCARE_INTENTS,
    ),
    "dental": BusinessTypeConfig(
        id="dental",
        display_name="Clínica Dental",
        category="healthcare",
        vocabulary={
            "customer": "Paciente",
            "customers": "Pacientes",
            "appointment": "Cita",
            "appointments": "Citas",
            "product": "Insumo",
            "service": "Tratamiento",
        },
        blocked_features=_HEALTHCARE_NON_VET_BLOCKED,
        ai_intents=HEALTHCARE_INTENTS,
    ),
    "fisioterapia": BusinessTypeConfig(
        id="fisioterapia",
        display_name="Fisioterapia",
        category="healthcare",
        vocabulary={
            "customer": "Paciente",
            "customers": "Pacientes",
            "appointment": "Sesión",
            "appointments": "Sesiones",
            "product": "Insumo",
            "service": "Sesión de terapia",
        },
        blocked_features=_HEALTHCARE_NON_VET_BLOCKED,
        ai_intents=HEALTHCARE_INTENTS,
    ),
    "nutricion": BusinessTypeConfig(
        id="nutricion",
        display_name="Nutrición",
        category="healthcare",
        vocabulary={
            "customer": "Paciente",
            "customers": "Pacientes",
            "appointment": "Consulta",
            "appointments": "Consultas",
            "product": "Suplemento",
            "service": "Consulta nutricional",
        },
        blocked_features=_HEALTHCARE_NON_VET_BLOCKED,
        ai_intents=HEALTHCARE_INTENTS,
    ),
    "medicina_general": BusinessTypeConfig(
        id="medicina_general",
        display_name="Medicina General",
        category="healthcare",
        vocabulary={
            "customer": "Paciente",
            "customers": "Pacientes",
            "appointment": "Consulta",
            "appointments": "Consultas",
            "product": "Medicamento",
            "service": "Consulta",
        },
        blocked_features=_HEALTHCARE_NON_VET_BLOCKED,
        ai_intents=HEALTHCARE_INTENTS,
    ),
    "barberia": BusinessTypeConfig(
        id="barberia",
        display_name="Barbería",
        category="service",
        vocabulary={
            "customer": "Cliente",
            "customers": "Clientes",
            "appointment": "Turno",
            "appointments": "Turnos",
            "product": "Producto",
            "service": "Servicio",
        },
        blocked_features=_NON_HEALTHCARE_BLOCKED,
        ai_intents=SHARED_INTENTS,
    ),
    "salon": BusinessTypeConfig(
        id="salon",
        display_name="Salón de Belleza",
        category="service",
        vocabulary={
            "customer": "Cliente",
            "customers": "Clientes",
            "appointment": "Turno",
            "appointments": "Turnos",
            "product": "Producto",
            "service": "Servicio",
        },
        blocked_features=_NON_HEALTHCARE_BLOCKED,
        ai_intents=SHARED_INTENTS,
    ),
    "spa": BusinessTypeConfig(
        id="spa",
        display_name="Spa",
        category="service",
        vocabulary={
            "customer": "Cliente",
            "customers": "Clientes",
            "appointment": "Reserva",
            "appointments": "Reservas",
            "product": "Producto",
            "service": "Tratamiento",
        },
        blocked_features=_NON_HEALTHCARE_BLOCKED,
        ai_intents=SHARED_INTENTS,
    ),
    "inmobiliaria": BusinessTypeConfig(
        id="inmobiliaria",
        display_name="Inmobiliaria",
        category="commercial",
        vocabulary={
            "customer": "Cliente",
            "customers": "Clientes",
            "appointment": "Visita",
            "appointments": "Visitas",
            "product": "Producto",
            "service": "Servicio",
        },
        blocked_features=_NON_HEALTHCARE_BLOCKED,
        ai_intents=SHARED_INTENTS,
    ),
    "propiedad_horizontal": BusinessTypeConfig(
        id="propiedad_horizontal",
        display_name="Propiedad Horizontal",
        category="commercial",
        vocabulary={
            "customer": "Residente",
            "customers": "Residentes",
            "appointment": "Reserva",
            "appointments": "Reservas",
            "product": "Producto",
            "service": "Servicio",
        },
        blocked_features=_NON_HEALTHCARE_BLOCKED,
        ai_intents=SHARED_INTENTS,
    ),
    "consultoria": BusinessTypeConfig(
        id="consultoria",
        display_name="Consultoría",
        category="professional",
        vocabulary={
            "customer": "Cliente",
            "customers": "Clientes",
            "appointment": "Sesión",
            "appointments": "Sesiones",
            "product": "Entregable",
            "service": "Consultoría",
        },
        blocked_features=_NON_HEALTHCARE_BLOCKED,
        ai_intents=SHARED_INTENTS,
    ),
    "publicidad": BusinessTypeConfig(
        id="publicidad",
        display_name="Publicidad / Marketing",
        category="commercial",
        vocabulary={
            "customer": "Cliente",
            "customers": "Clientes",
            "appointment": "Reunión",
            "appointments": "Reuniones",
            "product": "Material",
            "service": "Campaña",
        },
        blocked_features=_NON_HEALTHCARE_BLOCKED,
        ai_intents=SHARED_INTENTS,
    ),
}

_DEFAULT_CONFIG = BusinessTypeConfig(
    id="otro",
    display_name="Otro",
    category="commercial",
    vocabulary={
        "customer": "Cliente",
        "customers": "Clientes",
        "appointment": "Cita",
        "appointments": "Citas",
        "product": "Producto",
        "service": "Servicio",
    },
    blocked_features=_NON_HEALTHCARE_BLOCKED,
    ai_intents=SHARED_INTENTS,
)

BUSINESS_REGISTRY["otro"] = _DEFAULT_CONFIG


# ─── Public API ──────────────────────────────────────────────────────────────────
def get_config(business_type: str | None) -> BusinessTypeConfig:
    """Return the config for *business_type*, falling back to ``'otro'``."""
    key = (business_type or "").strip().lower()
    return BUSINESS_REGISTRY.get(key, _DEFAULT_CONFIG)


def filter_features(features: list[str], business_type: str | None) -> list[str]:
    """Return *features* with any entries blocked for this business type removed."""
    blocked = set(get_config(business_type).blocked_features)
    if not blocked:
        return features
    return [f for f in features if f not in blocked]


def get_ai_intents(business_type: str | None) -> Tuple[str, ...]:
    """Return the ordered tuple of AI intent IDs available for this type."""
    return get_config(business_type).ai_intents


def get_vocabulary(business_type: str | None, key: str, default: str = "") -> str:
    """Return the localised label for *key*, falling back to *default*."""
    return get_config(business_type).vocabulary.get(key, default)


def is_feature_allowed(feature: str, business_type: str | None) -> bool:
    """Return ``True`` when *feature* is NOT blocked for this business type."""
    return feature not in set(get_config(business_type).blocked_features)
