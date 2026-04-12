import base64
import hashlib
import logging

from cryptography.fernet import Fernet, InvalidToken
from sqlalchemy.types import Text, TypeDecorator

from app.core.config import FIELD_ENCRYPTION_KEY, SECRET_KEY

logger = logging.getLogger(__name__)

_PREFIX = "enc::"


def _derive_fernet_key(key_material: str) -> bytes:
    digest = hashlib.sha256(key_material.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(digest)


def _get_fernet() -> Fernet:
    source = FIELD_ENCRYPTION_KEY or SECRET_KEY
    return Fernet(_derive_fernet_key(source))


def encrypt_value(value: str | None) -> str | None:
    if value is None:
        return None
    if value == "":
        return value
    if value.startswith(_PREFIX):
        return value
    token = _get_fernet().encrypt(value.encode("utf-8")).decode("utf-8")
    return f"{_PREFIX}{token}"


def decrypt_value(value: str | None) -> str | None:
    if value is None:
        return None
    if value == "" or not value.startswith(_PREFIX):
        return value
    encrypted = value[len(_PREFIX):]
    try:
        return _get_fernet().decrypt(encrypted.encode("utf-8")).decode("utf-8")
    except InvalidToken:
        logger.warning("SECURITY field_decryption_failed returning masked raw value")
        return value


class EncryptedText(TypeDecorator):
    """Transparent at-rest encryption for sensitive text fields.

    Existing plaintext rows remain readable; new writes are encrypted with Fernet.
    """

    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        return encrypt_value(value)

    def process_result_value(self, value, dialect):
        return decrypt_value(value)