from fastapi import FastAPI
from app.modules.users.router import router as users_router

app = FastAPI(title="AdminG / AdminPro")

app.include_router(users_router, prefix="/users", tags=["users"])

@app.get("/health")
def health():
    return {"status": "ok"}