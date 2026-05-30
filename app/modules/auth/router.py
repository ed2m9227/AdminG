import hashlib
import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.schemas.auth import (
    LoginSchema, ForgotPasswordSchema, ResetPasswordSchema, ChangePasswordSchema,
    TotpChallengeSchema, TotpVerifySchema, TotpDisableSchema, RefreshTokenSchema,
)
from app.modules.auth.service import authenticate_user
from app.modules.users.schemas import UserCreate, UserOut
from app.modules.auth.service import create_user as create_user_service
from app.core.security import (
    create_access_token, hash_password, verify_password,
    create_totp_challenge_token, decode_totp_challenge_token,
    create_refresh_token_raw,
)
from app.core.rate_limit import allow_request
from app.core.email_service import (
    send_password_reset_email,
    send_new_login_alert,
    send_password_changed_alert,
    send_2fa_change_alert,
)
from app.core.config import AUTH_EXPOSE_RESET_TOKEN
from app.core.totp import (
    generate_totp_secret, get_totp_provisioning_uri,
    verify_totp_code, generate_backup_codes, verify_backup_code,
)
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.models.refresh_token import RefreshToken
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


def _issue_tokens(user: User, db: Session) -> dict:
    """Create access + refresh token pair for a user and persist the refresh token."""
    access_token = create_access_token({
        "sub": str(user.id),
        "role": user.role,
        "plan": user.plan,
    })
    raw_refresh, refresh_hash, refresh_expires = create_refresh_token_raw()
    db_token = RefreshToken(
        user_id=user.id,
        token_hash=refresh_hash,
        expires_at=refresh_expires,
    )
    db.add(db_token)
    db.commit()
    return {
        "access_token": access_token,
        "refresh_token": raw_refresh,
        "token_type": "bearer",
    }


def _revoke_all_refresh_tokens(user_id: int, db: Session) -> None:
    """Revoke every active refresh token for the user (on password change / 2FA toggle)."""
    now = datetime.utcnow()
    db.query(RefreshToken).filter(
        RefreshToken.user_id == user_id,
        RefreshToken.revoked_at.is_(None),
    ).update({"revoked_at": now})
    db.commit()


def _is_2fa_eligible(user: User) -> bool:
    """Entrega B scope: allow 2FA for admin and owner accounts."""
    return user.role == "admin" or not bool(user.parent_user_id)


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------

@router.post("/login")
def login(payload: LoginSchema, request: Request, db: Session = Depends(get_db)):
    """Login with email + password. Returns tokens or 2FA challenge."""
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

    # If 2FA is enabled, return a short-lived challenge token instead of full access.
    if getattr(user, "totp_enabled", False):
        challenge_token = create_totp_challenge_token(user.id)
        logger.info("SECURITY login_2fa_required user_id=%s ip=%s", user.id, ip)
        return {
            "requires_2fa": True,
            "challenge_token": challenge_token,
        }

    tokens = _issue_tokens(user, db)
    logger.info("SECURITY login_success user_id=%s email=%s ip=%s", user.id, user.email, ip)
    send_new_login_alert(user.email, ip)
    return tokens


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

    access_token = create_access_token({
        "sub": str(user.id),
        "role": user.role,
        "plan": user.plan
    })

    logger.info("SECURITY token_success user_id=%s email=%s ip=%s", user.id, user.email, ip)
    return {"access_token": access_token, "token_type": "bearer"}


# ---------------------------------------------------------------------------
# 2FA — verify challenge (login step 2)
# ---------------------------------------------------------------------------

@router.post("/2fa/verify-login")
def verify_2fa_login(payload: TotpChallengeSchema, request: Request, db: Session = Depends(get_db)):
    """
    Step 2 of login when 2FA is enabled.
    Client sends the challenge_token from /auth/login plus the TOTP code.
    """
    ip = _client_ip(request)
    _enforce_rate_limit("2fa_login_ip", ip, max_requests=10, window_seconds=60)

    user_id = decode_totp_challenge_token(payload.challenge_token)
    if not user_id:
        logger.warning("SECURITY 2fa_invalid_challenge ip=%s", ip)
        raise HTTPException(status_code=401, detail="Sesión de verificación inválida o expirada")

    user = db.query(User).filter(User.id == user_id).first()
    if not user or not getattr(user, "totp_enabled", False):
        raise HTTPException(status_code=401, detail="2FA no configurado")

    code = payload.code.strip()

    # Try TOTP first, then backup codes
    if verify_totp_code(user.totp_secret, code):
        pass  # valid TOTP
    else:
        valid, updated_json = verify_backup_code(code, user.totp_backup_codes_json)
        if not valid:
            logger.warning("SECURITY 2fa_invalid_code user_id=%s ip=%s", user_id, ip)
            raise HTTPException(status_code=401, detail="Código incorrecto")
        # Consume the backup code
        user.totp_backup_codes_json = updated_json
        db.add(user)
        db.commit()
        logger.info("SECURITY 2fa_backup_code_used user_id=%s ip=%s", user_id, ip)

    tokens = _issue_tokens(user, db)
    logger.info("SECURITY login_2fa_success user_id=%s ip=%s", user_id, ip)
    send_new_login_alert(user.email, ip)
    return tokens


# ---------------------------------------------------------------------------
# Refresh token
# ---------------------------------------------------------------------------

@router.post("/refresh")
def refresh_token(payload: RefreshTokenSchema, db: Session = Depends(get_db)):
    """Exchange a valid refresh token for new access + refresh token (rotation)."""
    raw = (payload.refresh_token or "").strip()
    if not raw:
        raise HTTPException(status_code=401, detail="Refresh token requerido")

    token_hash = hashlib.sha256(raw.encode()).hexdigest()
    db_token = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()

    if not db_token:
        logger.warning("SECURITY refresh_token_not_found")
        raise HTTPException(status_code=401, detail="Token inválido")

    if db_token.revoked_at:
        logger.warning("SECURITY refresh_token_reuse_detected user_id=%s", db_token.user_id)
        # Potential token theft — revoke ALL tokens for this user
        _revoke_all_refresh_tokens(db_token.user_id, db)
        raise HTTPException(status_code=401, detail="Token inválido")

    if datetime.utcnow() > db_token.expires_at:
        raise HTTPException(status_code=401, detail="Sesión expirada. Por favor inicia sesión nuevamente.")

    user = db.query(User).filter(User.id == db_token.user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")

    # Rotate: revoke old, issue new
    db_token.revoked_at = datetime.utcnow()
    db.add(db_token)

    new_access = create_access_token({"sub": str(user.id), "role": user.role, "plan": user.plan})
    raw_new, new_hash, new_expires = create_refresh_token_raw()
    db.add(RefreshToken(user_id=user.id, token_hash=new_hash, expires_at=new_expires))
    db.commit()

    logger.info("SECURITY refresh_success user_id=%s", user.id)
    return {"access_token": new_access, "refresh_token": raw_new, "token_type": "bearer"}


@router.post("/logout")
def logout(payload: RefreshTokenSchema, db: Session = Depends(get_db)):
    """Revoke the provided refresh token."""
    raw = (payload.refresh_token or "").strip()
    if raw:
        token_hash = hashlib.sha256(raw.encode()).hexdigest()
        db_token = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()
        if db_token and not db_token.revoked_at:
            db_token.revoked_at = datetime.utcnow()
            db.add(db_token)
            db.commit()
    return {"success": True}


# ---------------------------------------------------------------------------
# 2FA Setup (authenticated endpoints)
# ---------------------------------------------------------------------------

@router.post("/2fa/setup")
def setup_2fa(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Begin 2FA setup. Returns the TOTP secret + provisioning URI.
    The provisioning URI can be encoded as a QR code on the frontend.
    2FA is NOT enabled yet — user must call /2fa/confirm after scanning.
    """
    user_id = int(current_user["id"])
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if not _is_2fa_eligible(user):
        raise HTTPException(status_code=403, detail="2FA disponible solo para cuentas admin y propietarias")

    if getattr(user, "totp_enabled", False):
        raise HTTPException(status_code=400, detail="2FA ya está activado")

    secret = generate_totp_secret()
    provisioning_uri = get_totp_provisioning_uri(secret, user.email)

    # Store secret temporarily (not enabled yet)
    user.totp_secret = secret
    db.add(user)
    db.commit()

    return {
        "secret": secret,
        "provisioning_uri": provisioning_uri,
        "qr_url": f"https://api.qrserver.com/v1/create-qr-code/?size=200x200&data={provisioning_uri}",
    }


@router.post("/2fa/confirm")
def confirm_2fa(
    payload: TotpVerifySchema,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Confirm 2FA setup by verifying the first code from the authenticator app.
    On success, enables 2FA and returns backup codes (shown once, store securely).
    """
    user_id = int(current_user["id"])
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if not _is_2fa_eligible(user):
        raise HTTPException(status_code=403, detail="2FA disponible solo para cuentas admin y propietarias")

    if getattr(user, "totp_enabled", False):
        raise HTTPException(status_code=400, detail="2FA ya está activado")

    if not user.totp_secret:
        raise HTTPException(status_code=400, detail="Primero llama a /auth/2fa/setup")

    if not verify_totp_code(user.totp_secret, payload.code):
        logger.warning("SECURITY 2fa_confirm_invalid_code user_id=%s", user_id)
        raise HTTPException(status_code=400, detail="Código incorrecto. Verifica que el reloj del dispositivo esté sincronizado.")

    plain_codes, hashed_json = generate_backup_codes()
    user.totp_enabled = True
    user.totp_backup_codes_json = hashed_json
    db.add(user)

    # Revoke all existing refresh tokens so all sessions re-authenticate with 2FA
    _revoke_all_refresh_tokens(user.id, db)
    db.commit()

    logger.info("SECURITY 2fa_enabled user_id=%s", user_id)
    send_2fa_change_alert(user.email, "activado")

    return {
        "success": True,
        "backup_codes": plain_codes,
        "message": "2FA activado correctamente. Guarda estos códigos de respaldo en un lugar seguro.",
    }


@router.post("/2fa/disable")
def disable_2fa(
    payload: TotpDisableSchema,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Disable 2FA. Requires current password confirmation."""
    user_id = int(current_user["id"])
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if not _is_2fa_eligible(user):
        raise HTTPException(status_code=403, detail="2FA disponible solo para cuentas admin y propietarias")

    if not getattr(user, "totp_enabled", False):
        raise HTTPException(status_code=400, detail="2FA no está activado")

    if not verify_password(payload.password, user.hashed_password):
        logger.warning("SECURITY 2fa_disable_wrong_password user_id=%s", user_id)
        raise HTTPException(status_code=401, detail="Contraseña incorrecta")

    user.totp_enabled = False
    user.totp_secret = None
    user.totp_backup_codes_json = None
    db.add(user)
    _revoke_all_refresh_tokens(user.id, db)
    db.commit()

    logger.info("SECURITY 2fa_disabled user_id=%s", user_id)
    send_2fa_change_alert(user.email, "desactivado")
    return {"success": True, "message": "2FA desactivado"}


@router.get("/2fa/status")
def get_2fa_status(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user_id = int(current_user["id"])
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {
        "eligible": _is_2fa_eligible(user),
        "totp_enabled": bool(getattr(user, "totp_enabled", False)),
    }


# ---------------------------------------------------------------------------
# Password reset (public)
# ---------------------------------------------------------------------------

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

    # Revoke all refresh tokens on password change
    _revoke_all_refresh_tokens(user.id, db)
    db.commit()

    logger.info("SECURITY reset_password_success user_id=%s email=%s ip=%s", user.id, user.email, ip)
    send_password_changed_alert(user.email)


@router.post("/change-password")
def change_password(
    payload: ChangePasswordSchema,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    user = db.query(User).filter(User.id == int(current_user["id"])) .first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if not verify_password(payload.current_password, user.hashed_password):
        raise HTTPException(status_code=403, detail="Contraseña actual incorrecta")

    if len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail="La nueva contraseña debe tener al menos 8 caracteres")

    user.hashed_password = hash_password(payload.new_password)
    db.add(user)
    _revoke_all_refresh_tokens(user.id, db)
    db.commit()

    logger.info("SECURITY change_password_success user_id=%s ip=%s", user.id, _client_ip(request))
    send_password_changed_alert(user.email)

    return {"success": True, "message": "Contraseña actualizada con éxito"}


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


