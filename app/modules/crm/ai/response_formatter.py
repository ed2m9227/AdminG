def to_table(rows: list[dict]) -> dict:
    if not rows:
        return {"columns": [], "rows": []}

    columns = list(rows[0].keys())
    table_rows = [[row.get(col) for col in columns] for row in rows]
    return {"columns": columns, "rows": table_rows}


def format_answer(intent: str, rows: list[dict]) -> str:
    if intent == "consultations_this_week":
        value = rows[0]["value"] if rows else 0
        return f"Esta semana hubo {value} consultas registradas."

    if intent == "pets_without_visit_6_months":
        return f"Se encontraron {len(rows)} mascotas/clientes sin visita en los ultimos 6 meses."

    if intent == "monthly_revenue":
        value = rows[0]["value"] if rows else 0
        return f"Los ingresos del mes actual son {value:.2f}."

    if intent == "consultations_by_period":
        total = sum((r.get("total", 0) for r in rows))
        return f"En el periodo analizado se registraron {total} consultas."

    if intent == "recurrent_clients":
        return f"Hay {len(rows)} clientes recurrentes (2 o mas consultas)."

    return "No pude interpretar la consulta. Prueba con: consultas de la semana, ingresos del mes, mascotas sin visita en 6 meses."
