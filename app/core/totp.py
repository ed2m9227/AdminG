"""
TOTP helpers for 2FA (RFC 6238 — Google Authenticator compatible).

Backup codes: 8 single-use codes, 8 hex chars each.
Each is stored as a SHA-256 hex digest; plain codes are shown to the user once.
"""
import hashlib
import json
import secrets

import pyotp

APP_NAME = "AdminG"


# ---------------------------------------------------------------------------
# TOTP
# ---------------------------------------------------------------------------

def generate_totp_secret() -> str:
    """Return a new random Base32 TOTP secret."""
    return pyotp.random_base32()


def get_totp_provisioning_uri(secret: str, email: str) -> str:
    """Provisioning URI understood by Google Authenticator / Authy."""
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(name=email, issuer_name=APP_NAME)


def verify_totp_code(secret: str, code: str, valid_window: int = 1) -> bool:
    """
    Verify a 6-digit TOTP code.
    valid_window=1 allows ±30 seconds clock drift.
    """
    if not secret or not code:
        return False
    totp = pyotp.TOTP(secret)
    return totp.verify(code.strip(), valid_window=valid_window)


# ---------------------------------------------------------------------------
# Backup codes
# ---------------------------------------------------------------------------

def generate_backup_codes() -> tuple[list[str], str]:
    """
    Generate 8 single-use backup codes.
    Returns (plain_codes, hashed_json) — store hashed_json, show plain once.
    """
    plain = [secrets.token_hex(4).upper() for _ in range(8)]  # e.g. "A3F2B1C0"
    hashed = [hashlib.sha256(c.encode()).hexdigest() for c in plain]
    return plain, json.dumps(hashed)


def verify_backup_code(code: str, hashed_codes_json: str | None) -> tuple[bool, str]:
    """
    Try to redeem a backup code.
    Returns (valid, updated_hashed_json) — call site must persist updated json.
    The used code is removed from the list so each code can only be used once.
    """
    try:
        hashed_codes: list[str] = json.loads(hashed_codes_json or "[]")
    except Exception:
        return False, hashed_codes_json or "[]"

    code_hash = hashlib.sha256(code.strip().upper().encode()).hexdigest()
    if code_hash in hashed_codes:
        hashed_codes.remove(code_hash)
        return True, json.dumps(hashed_codes)
    return False, hashed_codes_json or "[]"
