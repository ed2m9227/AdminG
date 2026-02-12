from fastapi import FastAPI
from app.db.session import SessionLocal
from app.modules.auth.router import router as auth_router
from app.modules.users.router import router as users_router
from app.modules.customers.router import router as customers_router
from app.modules.appointments.router import router as appointments_router
from app.modules.plans.router import router as plans_router
from app.modules.plans.service import seed_plans

app = FastAPI(title="AdminG / AdminPro created by Eduardo")

@app.on_event("startup")
def startup_event():
    """Seed initial data on startup"""
    db = SessionLocal()
    try:
        seed_plans(db)
    finally:
        db.close()

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(customers_router)
app.include_router(appointments_router)
app.include_router(plans_router)

@app.get("/health")
def health():
    return {"status": "ok"}

