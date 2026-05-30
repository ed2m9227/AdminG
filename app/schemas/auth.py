from pydantic import BaseModel

class LoginSchema(BaseModel):
    email: str
    password: str

class RegisterSchema(BaseModel):
    email: str
    password: str
    role: str = "viewer"
    plan: str = "free"


class ForgotPasswordSchema(BaseModel):
    email: str


class ResetPasswordSchema(BaseModel):
    token: str
    new_password: str


class ChangePasswordSchema(BaseModel):
    current_password: str
    new_password: str


# --- 2FA / TOTP ---

class TotpVerifySchema(BaseModel):
    """Used in both the login 2FA step and the setup confirmation step."""
    code: str  # 6-digit TOTP code or 8-char backup code


class TotpChallengeSchema(BaseModel):
    """Client sends this after receiving requires_2fa=True from /auth/login."""
    challenge_token: str
    code: str  # 6-digit TOTP code or 8-char backup code


class TotpDisableSchema(BaseModel):
    password: str  # current account password required to disable 2FA


# --- Refresh token ---

class RefreshTokenSchema(BaseModel):
    refresh_token: str
