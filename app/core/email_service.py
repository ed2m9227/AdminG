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

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as server:
            if SMTP_USE_TLS:
                server.starttls()
            if SMTP_USERNAME and SMTP_PASSWORD:
                server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(msg)
        logger.info("SECURITY reset_email_sent email=%s", to_email)
        return True
    except Exception as exc:
        logger.error("SECURITY reset_email_failed email=%s error=%s", to_email, exc)
        return False
