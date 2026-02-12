from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.schemas.auth import LoginSchema
from app.modules.auth.service import authenticate_user
from app.modules.users.schemas import UserCreate, UserOut
from app.modules.auth.service import create_user as create_user_service
from app.core.security import create_access_token
from app.db.session import get_db

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/login")
def login(data: LoginSchema, db: Session = Depends(get_db)):
    user = authenticate_user(data.email, data.password, db)

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({
        "sub": str(user.id),
        "role": user.role,
        "plan": user.plan
    })

    return {"access_token": token, "token_type": "bearer"}

@router.post("/register", response_model=UserOut, status_code=201)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    user = create_user_service(
        email=payload.email,
        password=payload.password,
        role=payload.role,
        plan=payload.plan,
        db=db
    )
    
    if not user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    return user

