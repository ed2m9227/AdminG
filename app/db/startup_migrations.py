import sqlite3
from pathlib import Path


def _table_columns(cursor: sqlite3.Cursor, table_name: str) -> set[str]:
    cursor.execute(f"PRAGMA table_info({table_name})")
    return {row[1] for row in cursor.fetchall()}


def _ensure_columns(cursor: sqlite3.Cursor, table_name: str, columns: list[tuple[str, str]]) -> list[str]:
    existing = _table_columns(cursor, table_name)
    added: list[str] = []
    for column_name, definition in columns:
        if column_name not in existing:
            cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {definition}")
            added.append(f"{table_name}.{column_name}")
    return added


def _ensure_business_types(cursor: sqlite3.Cursor) -> list[str]:
    tables = {row[0] for row in cursor.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()}
    if "business_types" not in tables:
        return []

    defaults = [
        ("veterinaria", "Veterinaria", "Clinicas veterinarias y hospitales para animales", "🏥", 1, "Cliente", "Consulta", "Mascota", 1, 1),
        ("barberia", "Barberia", "Barberias y peluquerias para hombres", "💈", 1, "Cliente", "Cita", "N/A", 0, 2),
        ("nutricion", "Nutricion", "Consultorio de nutricion y alimentacion", "🥗", 1, "Paciente", "Consulta", "N/A", 0, 3),
        ("medicina_general", "Medicina General", "Consultorio de medicina general", "🩺", 1, "Paciente", "Consulta", "N/A", 0, 4),
        ("spa", "Spa / Estetica", "Centros de estetica, spas y salones de belleza", "💆", 1, "Cliente", "Reserva", "N/A", 0, 5),
        ("clinica", "Clinica Medica", "Clinicas medicas y consultorios", "⚕️", 1, "Paciente", "Consulta", "N/A", 0, 6),
        ("peluqueria", "Peluqueria", "Peluquerias y salones de belleza", "✂️", 1, "Cliente", "Turno", "N/A", 0, 7),
        ("dental", "Odontologia", "Consultorios dentales y clinicas odontologicas", "🦷", 1, "Paciente", "Consulta", "N/A", 0, 8),
        ("propiedad_horizontal", "Propiedad Horizontal", "Administracion de copropiedades, torres y conjuntos", "🏢", 1, "Residente", "Solicitud", "N/A", 0, 9),
        ("otro", "Otro", "Otro tipo de negocio", "📋", 1, "Cliente", "Cita", "N/A", 0, 99),
    ]

    added: list[str] = []
    for row in defaults:
        code = row[0]
        exists = cursor.execute("SELECT 1 FROM business_types WHERE code = ? LIMIT 1", (code,)).fetchone()
        if exists:
            cursor.execute(
                """
                UPDATE business_types
                SET label = ?, description = ?, icon = ?, is_active = ?,
                    default_label_customers = ?, default_label_appointments = ?, default_label_pets = ?,
                    supports_pets = ?, "order" = ?
                WHERE code = ?
                """,
                (row[1], row[2], row[3], row[4], row[5], row[6], row[7], row[8], row[9], code),
            )
            continue
        cursor.execute(
            """
            INSERT INTO business_types (
                code, label, description, icon, is_active,
                default_label_customers, default_label_appointments, default_label_pets,
                supports_pets, "order"
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            row,
        )
        added.append(f"business_types.{code}")
    return added


def _sync_user_business_type_from_config(cursor: sqlite3.Cursor) -> list[str]:
    tables = {row[0] for row in cursor.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()}
    if "users" not in tables or "business_configurations" not in tables:
        return []

    cursor.execute(
        """
        UPDATE users
        SET business_type = (
            SELECT bc.business_type
            FROM business_configurations bc
            WHERE bc.user_id = users.id
        )
        WHERE EXISTS (
            SELECT 1
            FROM business_configurations bc
            WHERE bc.user_id = users.id
              AND bc.business_type IS NOT NULL
              AND bc.business_type != ''
        )
          AND (users.business_type IS NULL OR users.business_type = '' OR users.business_type = 'general')
        """
    )

    if cursor.rowcount and cursor.rowcount > 0:
        return [f"users.business_type_synced:{cursor.rowcount}"]
    return []


def run_sqlite_startup_migrations(db_path: str = "app.db") -> list[str]:
    path = Path(db_path)
    if not path.exists():
        return []

    conn = sqlite3.connect(path)
    cursor = conn.cursor()
    applied: list[str] = []

    try:
        applied.extend(_ensure_business_types(cursor))
        applied.extend(
            _ensure_columns(
                cursor,
                "users",
                [
                    ("plan_start_date", "DATETIME DEFAULT (datetime('now'))"),
                    ("full_name", "TEXT"),
                    # plan_paid: DEFAULT 1 so existing accounts are grandfathered as paid
                    ("plan_paid", "INTEGER NOT NULL DEFAULT 1"),
                    ("plan_payment_reference", "TEXT"),
                    ("free_trial_used", "INTEGER NOT NULL DEFAULT 0"),
                    ("free_trial_started_at", "DATETIME"),
                    ("password_reset_token_hash", "TEXT"),
                    ("password_reset_expires_at", "DATETIME"),
                ],
            )
        )
        applied.extend(_sync_user_business_type_from_config(cursor))
        applied.extend(
            _ensure_columns(
                cursor,
                "customers",
                [("user_id", "INTEGER")],
            )
        )

        if "authorizations" in {row[0] for row in cursor.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()}:
            applied.extend(
                _ensure_columns(
                    cursor,
                    "authorizations",
                    [
                        ("assigned_approver_user_id", "INTEGER REFERENCES users(id)"),
                        ("resolved_by_user_id", "INTEGER REFERENCES users(id)"),
                        ("service_id", "INTEGER REFERENCES services(id)"),
                        ("decision_reason", "TEXT"),
                    ],
                )
            )

        if "invoices" in {row[0] for row in cursor.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()}:
            applied.extend(
                _ensure_columns(
                    cursor,
                    "invoices",
                    [("authorization_id", "INTEGER REFERENCES authorizations(id)")],
                )
            )

        if "payments" in {row[0] for row in cursor.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()}:
            applied.extend(
                _ensure_columns(
                    cursor,
                    "payments",
                    [("authorization_id", "INTEGER REFERENCES authorizations(id)")],
                )
            )

        conn.commit()
        return applied
    finally:
        conn.close()