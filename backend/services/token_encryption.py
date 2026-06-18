"""Encrypt OAuth tokens at rest using Fernet."""

import base64
import hashlib
import os

from cryptography.fernet import Fernet, InvalidToken

from services.security import app_secret


def _fernet_key() -> bytes:
    raw = os.environ.get("TOKEN_ENCRYPTION_KEY", "").strip()
    if raw:
        return raw.encode() if isinstance(raw, str) else raw
    digest = hashlib.sha256(app_secret().encode()).digest()
    return base64.urlsafe_b64encode(digest)


def encrypt_secret(value: str) -> str:
    if not value:
        return ""
    return Fernet(_fernet_key()).encrypt(value.encode()).decode()


def decrypt_secret(value: str) -> str:
    if not value:
        return ""
    try:
        return Fernet(_fernet_key()).decrypt(value.encode()).decode()
    except InvalidToken as exc:
        raise ValueError("Failed to decrypt token") from exc
