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


def format_answer(intent: str, rows: list[dict]) -> str:
    """Return a human-readable answer for *intent* given *rows*."""
    formatter = _FORMATTERS.get(intent)
    if formatter is None:
        return _FALLBACK
    return formatter(rows=rows)
