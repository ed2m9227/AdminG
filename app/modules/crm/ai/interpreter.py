import re


def detect_intent(question: str) -> str:
    q = (question or "").strip().lower()

    if re.search(r"consultas?.*(semana|semanal|esta semana)", q):
        return "consultations_this_week"
    if re.search(r"mascotas?.*(sin visita|sin control|6 meses|seis meses)", q):
        return "pets_without_visit_6_months"
    if re.search(r"ingresos?.*(mes|mensual|este mes)", q):
        return "monthly_revenue"
    if re.search(r"consultas?.*(periodo|periodo|rango|mes)", q):
        return "consultations_by_period"
    if re.search(r"clientes?.*(recurrentes|frecuentes)", q):
        return "recurrent_clients"

    return "unknown"
