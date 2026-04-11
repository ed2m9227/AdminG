import hashlib
import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.schemas.auth import LoginSchema, ForgotPasswordSchema, ResetPasswordSchema
from app.modules.auth.service import authenticate_user
from app.modules.users.schemas import UserCreate, UserOut
from app.modules.auth.service import create_user as create_user_service
from app.core.security import create_access_token, hash_password
from app.core.rate_limit import allow_request
from app.core.email_service import send_password_reset_email
from app.core.config import AUTH_EXPOSE_RESET_TOKEN
from app.db.session import get_db
from app.models.user import User
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Auth"])


def _client_ip(request: Request) -> str:
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def _enforce_rate_limit(action: str, key: str, max_requests: int, window_seconds: int) -> None:
    bucket = f"{action}:{key}"
    allowed, retry_after = allow_request(bucket, max_requests, window_seconds)
    if allowed:
        return
    logger.warning("SECURITY rate_limited action=%s key=%s retry_after=%s", action, key, retry_after)
    raise HTTPException(
        status_code=429,
        detail="Demasiados intentos. Intenta nuevamente en unos minutos.",
        headers={"Retry-After": str(retry_after)},
    )

@router.post("/login")
def login(payload: LoginSchema, request: Request, db: Session = Depends(get_db)):
    """Login endpoint - JSON body (email/password)"""
    email = payload.email
    password = payload.password
    ip = _client_ip(request)

    _enforce_rate_limit("login_ip", ip, max_requests=20, window_seconds=60)
    _enforce_rate_limit("login_email", email.lower(), max_requests=8, window_seconds=60)

    logger.info("SECURITY login_attempt email=%s ip=%s", email, ip)

    user = authenticate_user(email, password, db)

    if not user:
        logger.warning("SECURITY login_failed email=%s ip=%s", email, ip)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({
        "sub": str(user.id),
        "role": user.role,
        "plan": user.plan
    })

    logger.info("SECURITY login_success user_id=%s email=%s ip=%s", user.id, user.email, ip)
    return {"access_token": token, "token_type": "bearer"}


@router.post("/token")
def token(form_data: OAuth2PasswordRequestForm = Depends(), request: Request = None, db: Session = Depends(get_db)):
    """OAuth2 token endpoint for Swagger UI"""
    email = form_data.username
    password = form_data.password
    ip = _client_ip(request) if request else "unknown"

    _enforce_rate_limit("token_ip", ip, max_requests=20, window_seconds=60)
    _enforce_rate_limit("token_email", email.lower(), max_requests=8, window_seconds=60)

    logger.info("SECURITY token_attempt email=%s ip=%s", email, ip)

    user = authenticate_user(email, password, db)

    if not user:
        logger.warning("SECURITY token_failed email=%s ip=%s", email, ip)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({
        "sub": str(user.id),
        "role": user.role,
        "plan": user.plan
    })

    logger.info("SECURITY token_success user_id=%s email=%s ip=%s", user.id, user.email, ip)
    return {"access_token": token, "token_type": "bearer"}

@router.post("/register", response_model=UserOut, status_code=201)
def register(payload: UserCreate, request: Request, db: Session = Depends(get_db)):
    ip = _client_ip(request)
    _enforce_rate_limit("register_ip", ip, max_requests=10, window_seconds=3600)
    _enforce_rate_limit("register_email", payload.email.lower(), max_requests=3, window_seconds=3600)

    user = create_user_service(
        email=payload.email,
        password=payload.password,
        role=payload.role,
        plan=payload.plan,
        db=db
    )
    
    if not user:
        logger.warning("SECURITY register_conflict email=%s ip=%s", payload.email, ip)
        raise HTTPException(status_code=400, detail="Email already registered")

    logger.info("SECURITY register_success user_id=%s email=%s ip=%s", user.id, user.email, ip)
    return user


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordSchema, request: Request, db: Session = Depends(get_db)):
    """Request a password reset token. Always returns generic success."""
    email = (payload.email or "").strip().lower()
    ip = _client_ip(request)

    _enforce_rate_limit("forgot_ip", ip, max_requests=15, window_seconds=900)
    _enforce_rate_limit("forgot_email", email, max_requests=4, window_seconds=900)

    if not email:
        raise HTTPException(status_code=400, detail="Email requerido")

    user = db.query(User).filter(User.email == email).first()
    response = {
        "success": True,
        "message": "Si el correo existe, enviamos instrucciones de restablecimiento.",
    }

    if not user:
        logger.info("SECURITY forgot_password_nonexistent email=%s ip=%s", email, ip)
        return response

    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    expires_at = datetime.utcnow() + timedelta(minutes=30)

    setattr(user, "password_reset_token_hash", token_hash)
    setattr(user, "password_reset_expires_at", expires_at)
    db.add(user)
    db.commit()

    logger.info("SECURITY forgot_password_issued user_id=%s email=%s ip=%s", user.id, user.email, ip)

    sent = send_password_reset_email(user.email, raw_token, expires_at)
    response["delivery"] = "email" if sent else "not_configured"

    # Dev-only fallback to unblock local testing when SMTP is not configured.
    if AUTH_EXPOSE_RESET_TOKEN:
        response["reset_token"] = raw_token
        response["expires_at"] = expires_at.isoformat()

    return response


@router.post("/reset-password")
def reset_password(payload: ResetPasswordSchema, request: Request, db: Session = Depends(get_db)):
    ip = _client_ip(request)
    _enforce_rate_limit("reset_ip", ip, max_requests=20, window_seconds=900)

    token = (payload.token or "").strip()
    new_password = payload.new_password or ""

    if len(token) < 20:
        raise HTTPException(status_code=400, detail="Token inválido")
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="La nueva contraseña debe tener al menos 6 caracteres")

    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    user = db.query(User).filter(User.password_reset_token_hash == token_hash).first()
    if not user:
        logger.warning("SECURITY reset_password_invalid_token ip=%s", ip)
        raise HTTPException(status_code=400, detail="Token inválido o expirado")

    expires_at = getattr(user, "password_reset_expires_at", None)
    if not expires_at or datetime.utcnow() > expires_at:
        setattr(user, "password_reset_token_hash", None)
        setattr(user, "password_reset_expires_at", None)
        db.add(user)
        db.commit()
        logger.warning("SECURITY reset_password_expired user_id=%s email=%s ip=%s", user.id, user.email, ip)
        raise HTTPException(status_code=400, detail="Token inválido o expirado")

    user.hashed_password = hash_password(new_password)
    setattr(user, "password_reset_token_hash", None)
    setattr(user, "password_reset_expires_at", None)
    db.add(user)
    db.commit()

    logger.info("SECURITY reset_password_success user_id=%s email=%s ip=%s", user.id, user.email, ip)

    return {"success": True, "message": "Contraseña actualizada correctamente"}

