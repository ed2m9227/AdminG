"""
AI Response Formatter
=====================
Converts raw query rows into human-readable answers and table format.

Design principles:
  - SRP: only responsible for output formatting — no DB access, no intent
         detection.
  - OCP: add a new intent message by adding one entry to _FORMATTERS.
         No existing formatter changes.
"""

from __future__ import annotations

from typing import Callable


def to_table(rows: list[dict]) -> dict:
    """Convert a list-of-dicts into ``{columns, rows}`` table format."""
    if not rows:
        return {"columns": [], "rows": []}
    columns = list(rows[0].keys())
    return {
        "columns": columns,
        "rows": [[row.get(col) for col in columns] for row in rows],
    }


# ─── Per-intent formatters ─────────────────────────────────────────────────────
def _fmt_monthly_revenue(rows: list[dict], **_) -> str:
    value = rows[0]["value"] if rows else 0
    return f"Los ingresos del mes actual son ${value:,.2f}."


def _fmt_recurrent_clients(rows: list[dict], **_) -> str:
    return f"Hay {len(rows)} clientes recurrentes (con 2 o más visitas)."


def _fmt_top_services(rows: list[dict], **_) -> str:
    if not rows:
        return "No se encontraron servicios con ventas en el período."
    top = rows[0]["service_name"]
    return f"El servicio más solicitado es '{top}'. Se muestran los {len(rows)} servicios principales."


def _fmt_recent_appointments(rows: list[dict], **_) -> str:
    return f"Se encontraron {len(rows)} citas/atenciones en los últimos 7 días."


def _fmt_appointments_this_week(rows: list[dict], **_) -> str:
    value = rows[0]["value"] if rows else 0
    return f"Esta semana hay {value} citas programadas."


def _fmt_patients_without_visit(rows: list[dict], **_) -> str:
    return f"Se encontraron {len(rows)} pacientes sin visita en los últimos 6 meses."


def _fmt_consultations_this_week(rows: list[dict], **_) -> str:
    value = rows[0]["value"] if rows else 0
    return f"Esta semana hubo {value} consultas veterinarias registradas."


def _fmt_pets_without_visit(rows: list[dict], **_) -> str:
    return f"Se encontraron {len(rows)} mascotas sin visita en los últimos 6 meses."


_FORMATTERS: dict[str, Callable] = {
    "monthly_revenue": _fmt_monthly_revenue,
    "recurrent_clients": _fmt_recurrent_clients,
    "top_services": _fmt_top_services,
    "recent_appointments": _fmt_recent_appointments,
    "appointments_this_week": _fmt_appointments_this_week,
    "patients_without_visit_6_months": _fmt_patients_without_visit,
    "consultations_this_week": _fmt_consultations_this_week,
    "pets_without_visit_6_months": _fmt_pets_without_visit,
}

_FALLBACK = (
    "No pude interpretar la consulta. "
    "Prueba preguntas como: 'ingresos del mes', 'clientes recurrentes', "
    "'servicios más solicitados', 'citas de esta semana'."
)


def format_unknown_answer(
    question: str,
    business_type: str | None,
    available_intents: list[str] | None = None,
) -> str:
    q = (question or "").strip().lower()
    biz = (business_type or "otro").strip().lower()
    intents = available_intents or []

    if any(token in q for token in ["estrateg", "mejorar", "crecer", "aumentar", "ventas", "ingresos"]):
        return (
            "No tengo aún ese cálculo automático exacto, pero sí te propongo una ruta práctica:\n"
            "1) Define una meta semanal de ingresos y ticket promedio.\n"
            "2) Prioriza 3 servicios/productos de mayor margen.\n"
            "3) Activa seguimiento de recompra a clientes con más de 30 días sin compra.\n"
            "Si quieres, te lo convierto en un plan de 4 semanas para tu negocio actual."
        )

    if any(token in q for token in ["publicidad", "campaña", "anuncio", "lead", "captaci"]):
        return (
            "Aún no ejecuto analítica de campañas de punta a punta, pero sí puedo orientarte:\n"
            "1) Segmento objetivo claro (1 perfil principal).\n"
            "2) Oferta única medible (CTA + canal).\n"
            "3) Métrica mínima: costo por lead y tasa de conversión a cita/venta.\n"
            "Compárteme canal y presupuesto y te propongo un embudo simple."
        )

    if any(token in q for token in ["gobernanza", "política", "cumplimiento", "riesgo", "control"]):
        return (
            "Esa evaluación aún no está automatizada por completo, pero puedes operar con este marco:\n"
            "1) Define decisión, responsable y plazo.\n"
            "2) Registra evidencia y criterio de aprobación.\n"
            "3) Verifica trazabilidad en auditoría (evento -> acción -> resultado).\n"
            "Si quieres, te genero una plantilla de control para aplicar desde hoy."
        )

    if any(token in q for token in ["consultor", "propuesta", "cliente ideal", "retainer", "honorario"]):
        return (
            "No tengo ese modelo especializado activo todavía, pero sí puedo ayudarte a estructurarlo:\n"
            "1) Define alcance (diagnóstico, implementación, seguimiento).\n"
            "2) Establece entregables por fase y criterio de aceptación.\n"
            "3) Vincula cada entregable a cobro y fecha objetivo.\n"
            "Si me dices tu servicio principal, te armo una propuesta base en formato breve."
        )

    hint = (
        f"Intents disponibles para {biz}: {', '.join(intents)}"
        if intents else
        "Puedo responder mejor con preguntas de ingresos, clientes, servicios o citas."
    )
    return (
        "Esa pregunta está fuera de mis cálculos automáticos actuales, pero puedo darte guía accionable.\n"
        "Reformula con objetivo + periodo + métrica (ej: 'ingresos por semana este mes').\n"
        f"{hint}"
    )


def format_answer(
    intent: str,
    rows: list[dict],
    question: str = "",
    business_type: str | None = None,
    available_intents: list[str] | None = None,
) -> str:
    """Return a human-readable answer for *intent* given *rows*."""
    if intent == "unknown":
        return format_unknown_answer(
            question=question,
            business_type=business_type,
            available_intents=available_intents,
        )

    formatter = _FORMATTERS.get(intent)
    if formatter is None:
        return _FALLBACK
    return formatter(rows=rows)
