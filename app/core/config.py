from dotenv import load_dotenv
import os
import secrets

load_dotenv()

_secret = os.getenv("SECRET_KEY")
if not _secret:
    # En desarrollo se genera uno temporal; en producción DEBE venir de la var de entorno.
    _secret = secrets.token_hex(32)
SECRET_KEY = _secret

ALGORITHM = "HS256"
ACCES_TOKEN_EXPIRE_MINUTES = 60  # kept for backwards-compat imports
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")


def _as_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


CORS_ALLOW_ALL_ORIGINS = _as_bool(os.getenv("CORS_ALLOW_ALL_ORIGINS"), False)
CORS_ALLOW_ORIGINS = [
    item.strip()
    for item in os.getenv(
        "CORS_ALLOW_ORIGINS",
        "http://localhost:3000,http://localhost:5173,http://127.0.0.1:8000,http://localhost:8000",
    ).split(",")
    if item.strip()
]

FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "http://127.0.0.1:8000")

SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL")
SMTP_USE_TLS = _as_bool(os.getenv("SMTP_USE_TLS"), True)
FIELD_ENCRYPTION_KEY = os.getenv("FIELD_ENCRYPTION_KEY")
FIELD_ENCRYPTION_KEY_VERSION = os.getenv("FIELD_ENCRYPTION_KEY_VERSION", "v1")

# Dev-only fallback switch. Keep FALSE in production.
AUTH_EXPOSE_RESET_TOKEN = _as_bool(os.getenv("AUTH_EXPOSE_RESET_TOKEN"), False)

APP_ENV = os.getenv("APP_ENV", os.getenv("ENVIRONMENT", "development")).strip().lower()

# ============================================================================
# FEATURE FLAGS - MÓDULOS EN DESARROLLO
# ============================================================================
# Controla qué módulos JAC están habilitados (alternativa a .gitignore)
# En .env: MODULES_ASSEMBLY=true|false, MODULES_INVENTORY_JAC=true|false, etc.
MODULES = {
    "assembly": _as_bool(os.getenv("MODULES_ASSEMBLY"), False),
    "inventory_jac": _as_bool(os.getenv("MODULES_INVENTORY_JAC"), False),
    "projects": _as_bool(os.getenv("MODULES_PROJECTS"), False),
    "strategic_jac": _as_bool(os.getenv("MODULES_STRATEGIC_JAC"), False),
    "treasury": _as_bool(os.getenv("MODULES_TREASURY"), False),
    # Módulos principales (siempre activos)
    "identity": True,
    "auth": True,
    "users": True,
    "customers": True,
    "business": True,
    "appointments": True,
    "services": True,
    "plans": True,
    "inventory": True,
    "payments": True,
    "cashregister": True,
    "invoices": True,
    "notifications": True,
    "documents": True,
    "authorizations": True,
    "crm": True,
    "onboarding": True,
}


def is_module_enabled(module_name: str) -> bool:
    """Check if a module is enabled via feature flags."""
    return MODULES.get(module_name.lower(), False)


def is_production() -> bool:
    return APP_ENV in {"prod", "production"}


def validate_runtime_config() -> None:
    errors: list[str] = []

    if not is_production():
        return

    if not os.getenv("SECRET_KEY") or SECRET_KEY.startswith("cambia_esto"):
        errors.append("SECRET_KEY must be explicitly set in production")

    if CORS_ALLOW_ALL_ORIGINS:
        errors.append("CORS_ALLOW_ALL_ORIGINS must be false in production")

    if not CORS_ALLOW_ORIGINS:
        errors.append("CORS_ALLOW_ORIGINS must include at least one trusted origin in production")

    if FRONTEND_BASE_URL.startswith("http://127.0.0.1") or FRONTEND_BASE_URL.startswith("http://localhost"):
        errors.append("FRONTEND_BASE_URL must point to the real public frontend in production")

    if AUTH_EXPOSE_RESET_TOKEN:
        errors.append("AUTH_EXPOSE_RESET_TOKEN must be false in production")

    if not SMTP_HOST or not SMTP_FROM_EMAIL:
        errors.append("SMTP_HOST and SMTP_FROM_EMAIL are required in production")

    if not FIELD_ENCRYPTION_KEY:
        errors.append("FIELD_ENCRYPTION_KEY must be explicitly set in production")
    if not FIELD_ENCRYPTION_KEY_VERSION:
        errors.append("FIELD_ENCRYPTION_KEY_VERSION must be explicitly set in production")

    if errors:
        raise RuntimeError("Invalid production configuration: " + "; ".join(errors))