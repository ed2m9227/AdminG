from fastapi import APIRouter, Depends, HTTPException
from app.modules.users.schemas import UserCreate, UserLogin
from app.modules.users.service import authenticate_user
from app.core.security import create_access_token
from app.middleware.auth import require_permission

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/")
def list_users():
    return {"message": "Users module working"}

@router.post("/register")
def register(user: UserCreate):
    created = create_user(user.email, user.password, user.role)
    return {"email": created["email"], "role": created["role"]}

@router.post("/login")
def login(user: UserLogin):
    auth = authenticate_user(user.email, user.password)
    if not auth:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": auth["email"], "role": auth["role"]})

    return {"access_token": token, "token_type": "bearer"}

@router.post("/")
def create_user(
    user=Depends(require_permission("users: create", module="users"))
):
    return {"message": "User created"}