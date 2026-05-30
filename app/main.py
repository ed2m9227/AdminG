from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import importlib
import logging
import os
from pathlib import Path
from app.db.session import SessionLocal
from app.db.startup_migrations import run_sqlite_startup_migrations
from app.modules.auth.router import router as auth_router
from app.modules.users.router import router as users_router
from app.modules.customers.router import router as customers_router
from app.modules.customers.pet_router import router as pet_router
from app.modules.business.router import router as business_router
from app.modules.appointments.router import router as appointments_router
from app.modules.services.router import router as services_router
from app.modules.plans.router import router as plans_router
from app.modules.inventory.router import router as inventory_router
from app.modules.payments.router import router as payments_router
from app.modules.cashregister.router import router as cashregister_router
from app.modules.invoices.router import router as invoices_router
from app.modules.notifications.router import router as notifications_router
from app.modules.admin.routers.business_types import router as business_types_router
from app.modules.documents.router import router as documents_router
from app.modules.authorizations.router import router as authorizations_router
from app.modules.crm.router import router as crm_router
from app.modules.onboarding.router import router as onboarding_router
from app.modules.identity.router import router as identity_router
from app.modules.veterinary.router import router as veterinary_router
from app.modules.plans.service import seed_plans, seed_business_types
from app.core.config import CORS_ALLOW_ALL_ORIGINS, CORS_ALLOW_ORIGINS, validate_runtime_config, is_module_enabled
# Side-effect import: ensure RefreshToken table is registered with SQLAlchemy metadata
from app.models import refresh_token as _refresh_token_model  # noqa: F401

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def _load_optional_router(module_path: str, enabled: bool = True):
    """Carga un router opcional, saltando si está deshabilitado por feature flag."""
    if not enabled:
        logger.info("Router deshabilitado por feature flag: %s", module_path)
        return None
    try:
        module = importlib.import_module(module_path)
    except ModuleNotFoundError as exc:
        logger.warning("Optional router disabled: %s (%s)", module_path, exc)
        return None
    return getattr(module, "router", None)


# Routers obligatorios (siempre se cargan)
treasury_router = _load_optional_router("app.modules.treasury.router", is_module_enabled("treasury"))
assembly_router = _load_optional_router("app.modules.assembly.router", is_module_enabled("assembly"))
projects_router = _load_optional_router("app.modules.projects.router", is_module_enabled("projects"))
inventory_jac_router = _load_optional_router("app.modules.inventory_jac.router", is_module_enabled("inventory_jac"))
strategic_jac_router = _load_optional_router("app.modules.strategic_jac.router", is_module_enabled("strategic_jac"))

# Routers adicionales opcionales
reports_router = _load_optional_router("app.modules.reports.router")
admin_router = _load_optional_router("app.modules.admin.router")
ai_router = _load_optional_router("app.modules.ai.router")
operations_router = _load_optional_router("app.modules.operations.router")
eoe_router = _load_optional_router("app.modules.eoe.router")

app = FastAPI(title="AdminG / AdminPro created by Eduardo")

allowed_origins = ["*"] if CORS_ALLOW_ALL_ORIGINS else CORS_ALLOW_ORIGINS

# CORS estricto por allowlist (solo usar * cuando CORS_ALLOW_ALL_ORIGINS=true en entorno controlado)
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=not CORS_ALLOW_ALL_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

logger.info("SECURITY cors_config allow_all=%s origins=%s", CORS_ALLOW_ALL_ORIGINS, allowed_origins)

# Middleware para deshabilitar caché en desarrollo (archivos JS/CSS)
@app.middleware("http")
async def disable_cache_middleware(request: Request, call_next):
    response = await call_next(request)
    
    # Deshabilitar caché para archivos JS y CSS
    if request.url.path.endswith(('.js', '.css')) or '/js/' in request.url.path or '/css/' in request.url.path:
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    
    return response

# Manejador global de excepciones
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import json as _json
    logger.error(f"Error no manejado: {exc}", exc_info=True)
    return Response(
        content=_json.dumps({"detail": f"Error interno del servidor: {str(exc)}"}),
        status_code=500,
        media_type="application/json"
    )

@app.on_event("startup")
def startup_event():
    """Seed initial data on startup"""
    validate_runtime_config()

    try:
        from app.db.base import Base
        from app.db.session import engine
        # Ensure all tables exist
        logger.info("Creating database tables...")
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created/verified")

        try:
            migrated = run_sqlite_startup_migrations("app.db")
            if migrated:
                logger.info(f"Startup migrations applied: {', '.join(migrated)}")
        except Exception as e:
            logger.warning(f"Could not run startup migrations: {e}")
        
        # Seed plans
        db = SessionLocal()
        try:
            logger.info("Seeding plans...")
            seed_plans(db)
            logger.info("Plans seeded successfully")
        finally:
            db.close()

        # Seed / sync business types from registry
        db = SessionLocal()
        try:
            logger.info("Seeding business types...")
            seed_business_types(db)
            logger.info("Business types seeded successfully")
        finally:
            db.close()

        # Ensure default admin user exists
        try:
            from app.models.user import User
            from app.core.security import hash_password

            db = SessionLocal()
            admin_email = "admin@adminsystems.com"
            admin = db.query(User).filter(User.email == admin_email).first()
            if not admin:
                admin = User(
                    email=admin_email,
                    hashed_password=hash_password("Admin123"),
                    role="admin",
                    plan="max",
                    is_active=True,
                    business_type="master",
                    parent_user_id=None
                )
                db.add(admin)
                db.commit()
                db.refresh(admin)
                logger.info("Default admin user created")
            else:
                admin.role = "admin"
                admin.plan = "max"
                admin.is_active = True
                admin.hashed_password = hash_password("Admin123")
                db.add(admin)
                db.commit()
                logger.info("Default admin user updated")
        except Exception as e:
            logger.warning(f"Could not ensure admin user exists: {e}")
        finally:
            try:
                db.close()
            except Exception:
                pass

    except Exception as e:
        logger.error(f"Error in startup: {e}", exc_info=True)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(customers_router)
app.include_router(pet_router)
app.include_router(business_router)
app.include_router(appointments_router)
app.include_router(services_router)
app.include_router(plans_router)
app.include_router(inventory_router)
app.include_router(payments_router)
app.include_router(cashregister_router)
app.include_router(invoices_router)
app.include_router(notifications_router)
app.include_router(business_types_router)
app.include_router(documents_router)
app.include_router(authorizations_router)
app.include_router(crm_router)
app.include_router(onboarding_router)
app.include_router(identity_router)
app.include_router(veterinary_router)

# Routers de módulos JAC (controlados por feature flags)
if treasury_router is not None:
    app.include_router(treasury_router)
if assembly_router is not None:
    app.include_router(assembly_router)
if projects_router is not None:
    app.include_router(projects_router)
if inventory_jac_router is not None:
    app.include_router(inventory_jac_router)
if strategic_jac_router is not None:
    app.include_router(strategic_jac_router)

# Routers opcionales adicionales
if reports_router is not None:
    app.include_router(reports_router)
if admin_router is not None:
    app.include_router(admin_router)
if ai_router is not None:
    app.include_router(ai_router)
if operations_router is not None:
    app.include_router(operations_router)
if eoe_router is not None:
    app.include_router(eoe_router)

@app.get("/health")
def health():
    return {"status": "ok", "version": "1.0.0"}

@app.get("/api/version")
def get_version():
    return {
        "name": "AdminG / AdminPro",
        "version": "1.0.0",
        "features": [
            "Multi-tenancy",
            "Plan gating",
            "Inventory management",
            "Payment processing",
            "Advanced reporting",
            "MontelibanoGen integration"
        ]
    }

@app.post("/admin/reset-db")
def reset_database():
    """ADMIN ONLY - Reset database schema (development only)"""
    try:
        from pathlib import Path
        import os
        
        # Remove old DB
        db_file = Path("app.db")
        if db_file.exists():
            db_file.unlink()
            logger.info("Old database removed")
        
        # Recreate tables
        from app.db.base import Base
        from app.db.session import engine
        from app.modules.plans.service import seed_plans
        
        Base.metadata.create_all(bind=engine)
        logger.info("Database schema recreated")
        
        # Seed plans
        db = SessionLocal()
        seed_plans(db)
        db.close()
        logger.info("Plans seeded")
        
        return {
            "success": True,
            "message": "Database reset successfully",
            "status": "ready"
        }
    except Exception as e:
        logger.error(f"Error resetting database: {e}")
        return {
            "success": False,
            "message": str(e),
            "status": "error"
        }

# Servir archivos estáticos del frontend
frontend_dist = Path(__file__).parent.parent / "frontend-dist"
if frontend_dist.exists():
    try:
        # Montar CSS
        css_dir = frontend_dist / "css"
        if css_dir.exists():
            app.mount("/css", StaticFiles(directory=str(css_dir)), name="css")
        
        # Montar JS
        js_dir = frontend_dist / "js"
        if js_dir.exists():
            app.mount("/js", StaticFiles(directory=str(js_dir)), name="js")
        
        # Montar Assets (imágenes, etc)
        assets_dir = frontend_dist / "assets"
        if assets_dir.exists():
            app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")
        
        logger.info("✓ Static files mounted successfully (CSS, JS, Assets)")
    except Exception as e:
        logger.warning(f"Could not mount static files: {e}")
    
    # Serve index.html for SPA routes (not actual files and not APIs)
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """Serve index.html for client-side routes"""
        # Skip if it's an API endpoint
        api_prefixes = {
            "auth",
            "api",
            "users",
            "customers",
            "appointments",
            "services",
            "plans",
            "inventory",
            "payments",
            "reports",
            "cashregister",
            "invoices",
            "documents",
            "authorizations",
            "business",
            "admin",
            "notifications",
            "operations",
            "docs",
            "openapi.json",
            "health",
        }

        if any(full_path == p or full_path.startswith(f"{p}/") for p in api_prefixes):
            raise HTTPException(status_code=404, detail="Not found")
        
        # Skip static file extensions
        static_extensions = (".html", ".css", ".js", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".woff", ".woff2")
        if any(full_path.endswith(ext) for ext in static_extensions):
            # Try to serve actual file
            file_path = frontend_dist / full_path
            if file_path.is_file() and file_path.exists():
                return FileResponse(file_path)
            # Si no es index.html, dar error 404
            if not full_path.endswith("index.html"):
                raise HTTPException(status_code=404, detail="File not found")
            # Si es index.html pero no existe, continuar al siguiente bloque
        
        # Serve index.html for SPA routing (/login, /register, /dashboard, etc.)
        index_path = frontend_dist / "index.html"
        if index_path.exists():
            return FileResponse(index_path)
        
        raise HTTPException(status_code=404, detail="Frontend not found")

