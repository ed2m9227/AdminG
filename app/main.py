from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import logging
import os
from pathlib import Path
from app.db.session import SessionLocal
from app.modules.auth.router import router as auth_router
from app.modules.users.router import router as users_router
from app.modules.customers.router import router as customers_router
from app.modules.appointments.router import router as appointments_router
from app.modules.plans.router import router as plans_router
from app.modules.inventory.router import router as inventory_router
from app.modules.payments.router import router as payments_router
from app.modules.reports.router import router as reports_router
from app.modules.cashregister.router import router as cashregister_router
from app.modules.admin.router import router as admin_router
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

# Manejador global de excepciones
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Error no manejado: {exc}", exc_info=True)
    return Response(
        content=f"{{\"detail\": \"Error interno del servidor: {str(exc)}\"}}",
        status_code=500,
        media_type="application/json"
    )

@app.on_event("startup")
def startup_event():
    """Seed initial data on startup"""
    try:
        from app.db.base import Base
        from app.db.session import engine
        import sqlite3
        
        # Ensure all tables exist
        logger.info("Creating database tables...")
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created/verified")
        
        # Seed plans
        db = SessionLocal()
        try:
            logger.info("Seeding plans...")
            seed_plans(db)
            logger.info("Plans seeded successfully")
        finally:
            db.close()

        # Ensure customers table has user_id (SQLite)
        try:
            conn = sqlite3.connect("app.db")
            cur = conn.cursor()
            cur.execute("PRAGMA table_info(customers)")
            columns = [row[1] for row in cur.fetchall()]
            if "user_id" not in columns:
                cur.execute("ALTER TABLE customers ADD COLUMN user_id INTEGER")
                conn.commit()
                logger.info("Added user_id column to customers table")
            conn.close()
        except Exception as e:
            logger.warning(f"Could not update customers table: {e}")
    except Exception as e:
        logger.error(f"Error in startup: {e}", exc_info=True)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(customers_router)
app.include_router(appointments_router)
app.include_router(plans_router)
app.include_router(inventory_router)
app.include_router(payments_router)
app.include_router(reports_router)
app.include_router(cashregister_router)
app.include_router(admin_router)

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
        api_prefixes = ("auth/", "api/", "users/", "customers/", "appointments/", 
                       "plans/", "inventory/", "payments/", "reports/", "admin/", "docs", "openapi.json")
        
        if any(full_path.startswith(p) for p in api_prefixes):
            raise HTTPException(status_code=404, detail="Not found")
        
        # Skip static file extensions
        static_extensions = (".css", ".js", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".woff", ".woff2")
        if any(full_path.endswith(ext) for ext in static_extensions):
            # Try to serve actual file
            file_path = frontend_dist / full_path
            if file_path.is_file() and file_path.exists():
                return FileResponse(file_path)
            raise HTTPException(status_code=404, detail="File not found")
        
        # Serve index.html for SPA routing (/login, /register, /dashboard, etc.)
        index_path = frontend_dist / "index.html"
        if index_path.exists():
            return FileResponse(index_path)
        
        raise HTTPException(status_code=404, detail="Frontend not found")

