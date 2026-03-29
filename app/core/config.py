from dotenv import load_dotenv
import os
import secrets

load_dotenv()

_secret = os.getenv("SECRET_KEY")
if not _secret:
    # En desarrollo se genera uno temporal; en producción DEBE venir de la var de entorno.
    _secret = secrets.token_hex(32)
SECRET_KEY = _secret

ALGORITHM = "HS256"
ACCES_TOKEN_EXPIRE_MINUTES = 60
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")