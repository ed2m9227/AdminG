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


def run_sqlite_startup_migrations(db_path: str = "app.db") -> list[str]:
    path = Path(db_path)
    if not path.exists():
        return []

    conn = sqlite3.connect(path)
    cursor = conn.cursor()
    applied: list[str] = []

    try:
        applied.extend(
            _ensure_columns(
                cursor,
                "users",
                [("plan_start_date", "DATETIME DEFAULT (datetime('now'))")],
            )
        )
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