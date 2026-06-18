"""Dependency-free signing + password hashing.

Avoids native crypto deps (bcrypt/passlib) and external signers (itsdangerous/svix)
so the backend installs cleanly on any Python and the keyless demo has zero extra
moving parts. Uses stdlib HMAC-SHA256 for signed tokens and PBKDF2 for passwords.
"""

import base64
import hashlib
import hmac
import json
import os
import secrets

# When AUTH_SECRET is unset the app runs in demo mode; we still sign cookies/tokens
# with a stable dev fallback so signed values round-trip locally.
DEV_FALLBACK_SECRET = "dev-insecure-demo-secret"
PBKDF2_ITERATIONS = 200_000


def app_secret() -> str:
    return os.environ.get("AUTH_SECRET") or DEV_FALLBACK_SECRET


def auth_enabled() -> bool:
    """Real auth is enforced only when AUTH_SECRET is set; otherwise demo bypass."""
    return bool(os.environ.get("AUTH_SECRET"))


def _hmac(raw: str) -> str:
    digest = hmac.new(app_secret().encode(), raw.encode(), hashlib.sha256).digest()
    return base64.urlsafe_b64encode(digest).decode().rstrip("=")


def sign(data: dict) -> str:
    raw = base64.urlsafe_b64encode(
        json.dumps(data, separators=(",", ":"), sort_keys=True).encode()
    ).decode().rstrip("=")
    return f"{raw}.{_hmac(raw)}"


def unsign(token: str) -> dict | None:
    if not token or "." not in token:
        return None
    raw, sig = token.rsplit(".", 1)
    if not hmac.compare_digest(sig, _hmac(raw)):
        return None
    try:
        pad = "=" * (-len(raw) % 4)
        return json.loads(base64.urlsafe_b64decode(raw + pad))
    except (ValueError, json.JSONDecodeError):
        return None


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, PBKDF2_ITERATIONS)
    return (
        f"pbkdf2_sha256${PBKDF2_ITERATIONS}$"
        f"{base64.b64encode(salt).decode()}${base64.b64encode(dk).decode()}"
    )


def verify_password(password: str, stored: str) -> bool:
    try:
        algo, iters, salt_b64, hash_b64 = stored.split("$")
        if algo != "pbkdf2_sha256":
            return False
        dk = hashlib.pbkdf2_hmac(
            "sha256", password.encode(), base64.b64decode(salt_b64), int(iters)
        )
        return hmac.compare_digest(dk, base64.b64decode(hash_b64))
    except (ValueError, TypeError):
        return False
