import hashlib
import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.schemas.auth import LoginSchema, ForgotPasswordSchema, ResetPasswordSchema
from app.modules.auth.service import authenticate_user
from app.modules.users.schemas import UserCreate, UserOut
from app.modules.auth.service import create_user as create_user_service
from app.core.security import create_access_token, hash_password
from app.db.session import get_db
from app.models.user import User
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/login")
def login(payload: LoginSchema, db: Session = Depends(get_db)):
    """Login endpoint - JSON body (email/password)"""
    email = payload.email
    password = payload.password

    logger.info(f"Login attempt: email={email}")

    user = authenticate_user(email, password, db)

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({
        "sub": str(user.id),
        "role": user.role,
        "plan": user.plan
    })

    return {"access_token": token, "token_type": "bearer"}


@router.post("/token")
def token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """OAuth2 token endpoint for Swagger UI"""
    email = form_data.username
    password = form_data.password

    logger.info(f"Token request: email={email}")

    user = authenticate_user(email, password, db)

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


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordSchema, db: Session = Depends(get_db)):
    """Request a password reset token. Always returns generic success."""
    email = (payload.email or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email requerido")

    user = db.query(User).filter(User.email == email).first()
    response = {
        "success": True,
        "message": "Si el correo existe, enviamos instrucciones de restablecimiento.",
    }

    if not user:
        return response

    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    expires_at = datetime.utcnow() + timedelta(minutes=30)

    setattr(user, "password_reset_token_hash", token_hash)
    setattr(user, "password_reset_expires_at", expires_at)
    db.add(user)
    db.commit()

    # For now we expose token explicitly so the frontend flow can complete without SMTP infra.
    # When SMTP is configured, this token should be delivered by email and omitted from response.
    response["reset_token"] = raw_token
    response["expires_at"] = expires_at.isoformat()
    return response


@router.post("/reset-password")
def reset_password(payload: ResetPasswordSchema, db: Session = Depends(get_db)):
    token = (payload.token or "").strip()
    new_password = payload.new_password or ""

    if len(token) < 20:
        raise HTTPException(status_code=400, detail="Token inválido")
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="La nueva contraseña debe tener al menos 6 caracteres")

    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    user = db.query(User).filter(User.password_reset_token_hash == token_hash).first()
    if not user:
        raise HTTPException(status_code=400, detail="Token inválido o expirado")

    expires_at = getattr(user, "password_reset_expires_at", None)
    if not expires_at or datetime.utcnow() > expires_at:
        setattr(user, "password_reset_token_hash", None)
        setattr(user, "password_reset_expires_at", None)
        db.add(user)
        db.commit()
        raise HTTPException(status_code=400, detail="Token inválido o expirado")

    user.hashed_password = hash_password(new_password)
    setattr(user, "password_reset_token_hash", None)
    setattr(user, "password_reset_expires_at", None)
    db.add(user)
    db.commit()

    return {"success": True, "message": "Contraseña actualizada correctamente"}

