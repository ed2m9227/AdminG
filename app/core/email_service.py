import smtplib
from datetime import datetime
from email.message import EmailMessage
import logging

from app.core.config import (
    FRONTEND_BASE_URL,
    SMTP_FROM_EMAIL,
    SMTP_HOST,
    SMTP_PASSWORD,
    SMTP_PORT,
    SMTP_USERNAME,
    SMTP_USE_TLS,
)

logger = logging.getLogger(__name__)


def can_send_mail() -> bool:
    return bool(SMTP_HOST and SMTP_FROM_EMAIL)


def _send(msg: EmailMessage) -> bool:
    """Internal helper — connect to SMTP and send message. Returns True on success."""
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as server:
            if SMTP_USE_TLS:
                server.starttls()
            if SMTP_USERNAME and SMTP_PASSWORD:
                server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(msg)
        return True
    except Exception as exc:
        logger.error("SECURITY email_send_failed to=%s error=%s", msg["To"], exc)
        return False


def send_password_reset_email(to_email: str, token: str, expires_at: datetime) -> bool:
    """Send reset email via SMTP. Returns True when delivered to SMTP server."""
    if not can_send_mail():
        logger.warning("SECURITY reset_email_not_sent reason=smtp_not_configured email=%s", to_email)
        return False

    reset_link = f"{FRONTEND_BASE_URL.rstrip('/')}/#forgot-password?token={token}"
    expires_text = expires_at.strftime("%Y-%m-%d %H:%M UTC")

    msg = EmailMessage()
    msg["Subject"] = "AdminG - Restablecer contraseña"
    msg["From"] = SMTP_FROM_EMAIL
    msg["To"] = to_email
    msg.set_content(
        "Recibimos una solicitud para restablecer tu contraseña.\n\n"
        f"Token: {token}\n"
        f"Enlace: {reset_link}\n"
        f"Vence: {expires_text}\n\n"
        "Si no solicitaste este cambio, ignora este mensaje."
    )

    ok = _send(msg)
    if ok:
        logger.info("SECURITY reset_email_sent email=%s", to_email)
    return ok


def send_new_login_alert(to_email: str, ip: str) -> bool:
    """Alert user of a new login. Non-blocking — failure is logged but not raised."""
    if not can_send_mail():
        return False

    msg = EmailMessage()
    msg["Subject"] = "AdminG - Nuevo inicio de sesión"
    msg["From"] = SMTP_FROM_EMAIL
    msg["To"] = to_email
    msg.set_content(
        f"Se inició sesión en tu cuenta desde la dirección IP: {ip}\n\n"
        "Si no fuiste tú, cambia tu contraseña de inmediato desde:\n"
        f"{FRONTEND_BASE_URL.rstrip('/')}/#forgot-password\n\n"
        "Si fuiste tú, puedes ignorar este mensaje."
    )

    ok = _send(msg)
    if ok:
        logger.info("SECURITY login_alert_sent email=%s ip=%s", to_email, ip)
    return ok


def send_password_changed_alert(to_email: str) -> bool:
    """Alert user that their password was changed."""
    if not can_send_mail():
        return False

    msg = EmailMessage()
    msg["Subject"] = "AdminG - Tu contraseña fue cambiada"
    msg["From"] = SMTP_FROM_EMAIL
    msg["To"] = to_email
    msg.set_content(
        "Tu contraseña en AdminG fue modificada.\n\n"
        "Si no realizaste este cambio, restablece tu contraseña inmediatamente:\n"
        f"{FRONTEND_BASE_URL.rstrip('/')}/#forgot-password\n\n"
        "Si fuiste tú, puedes ignorar este mensaje."
    )

    ok = _send(msg)
    if ok:
        logger.info("SECURITY password_changed_alert_sent email=%s", to_email)
    return ok


def send_2fa_change_alert(to_email: str, action: str) -> bool:
    """Alert user when 2FA is enabled or disabled. action: 'activado' | 'desactivado'."""
    if not can_send_mail():
        return False

    msg = EmailMessage()
    msg["Subject"] = f"AdminG - Verificación en dos pasos {action}"
    msg["From"] = SMTP_FROM_EMAIL
    msg["To"] = to_email
    msg.set_content(
        f"La verificación en dos pasos (2FA) fue {action} en tu cuenta de AdminG.\n\n"
        "Si no realizaste este cambio, contacta soporte de inmediato y cambia tu contraseña:\n"
        f"{FRONTEND_BASE_URL.rstrip('/')}/#forgot-password"
    )

    ok = _send(msg)
    if ok:
        logger.info("SECURITY 2fa_change_alert_sent email=%s action=%s", to_email, action)
    return ok
