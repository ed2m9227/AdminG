from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
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
from app.modules.reports.router import router as reports_router
from app.modules.cashregister.router import router as cashregister_router
from app.modules.invoices.router import router as invoices_router
from app.modules.notifications.router import router as notifications_router
from app.modules.admin.router import router as admin_router
from app.modules.admin.routers.business_types import router as business_types_router
from app.modules.documents.router import router as documents_router
from app.modules.authorizations.router import router as authorizations_router
from app.modules.plans.service import seed_plans

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(title="AdminG / AdminPro created by Eduardo")

# Configuración CORS mejorada
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:8000",
        "http://localhost:8000",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

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
app.include_router(reports_router)
app.include_router(cashregister_router)
app.include_router(invoices_router)
app.include_router(notifications_router)
app.include_router(admin_router)
app.include_router(business_types_router)
app.include_router(documents_router)
app.include_router(authorizations_router)

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

