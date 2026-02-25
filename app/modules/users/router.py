from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.modules.users.schemas import UserCreate, UserOut
from app.core.permissions import require_permission
from app.modules.auth.service import create_user as create_auth_user
from app.core.security import get_current_user
from app.models.user import User


router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/me", response_model=UserOut)
def get_current_user_info(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current logged-in user information"""
    user = db.query(User).filter(User.id == int(current_user["id"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == "admin" and user.plan != "max":
        user.plan = "max"
        db.commit()
        db.refresh(user)
    return user

@router.get("/")
def list_users(current_user=Depends(get_current_user)):
    return {"message": "Users module working", "user_id": current_user["id"]}

@router.post("/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    created = create_auth_user(user.email, user.password, user.role, user.plan, db)
    return {"email": created.email, "role": created.role}

@router.post("/")
def create_user_endpoint(
    user: UserCreate,
    current_user=Depends(require_permission("users.create")),
    db: Session = Depends(get_db)
):
    created = create_auth_user(user.email, user.password, user.role, user.plan, db)
    return {"message": "User created", "email": created.email}