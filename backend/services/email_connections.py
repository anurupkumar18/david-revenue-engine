"""OAuth mailbox connections: Google Gmail and Microsoft Graph."""

import base64
import hashlib
import json
import os
import secrets
from datetime import datetime, timedelta
from urllib.parse import urlencode

import httpx
from fastapi import HTTPException
from sqlalchemy.orm import Session

from models import EmailConnection, User
from services.security import auth_enabled, sign, unsign
from services.token_encryption import decrypt_secret, encrypt_secret

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"

MS_AUTH_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize"
MS_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
MS_GRAPH_ME = "https://graph.microsoft.com/v1.0/me"

GOOGLE_SCOPES = [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/gmail.send",
]
MS_SCOPES = [
    "openid",
    "email",
    "profile",
    "offline_access",
    "Mail.Send",
    "User.Read",
]


def public_base_url() -> str:
    return os.environ.get("PUBLIC_BASE_URL") or "http://localhost:3000"


def oauth_configured(provider: str) -> bool:
    if provider == "google":
        return bool(os.environ.get("GOOGLE_CLIENT_ID") and os.environ.get("GOOGLE_CLIENT_SECRET"))
    if provider == "microsoft":
        return bool(os.environ.get("MICROSOFT_CLIENT_ID") and os.environ.get("MICROSOFT_CLIENT_SECRET"))
    return False


def _pkce_pair() -> tuple[str, str]:
    verifier = secrets.token_urlsafe(48)
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).decode().rstrip("=")
    return verifier, challenge


def build_oauth_state(user_id: int, provider: str, code_verifier: str) -> str:
    return sign(
        {
            "uid": user_id,
            "provider": provider,
            "cv": code_verifier,
            "exp": int((datetime.utcnow() + timedelta(minutes=15)).timestamp()),
        }
    )


def parse_oauth_state(state: str) -> dict:
    data = unsign(state)
    if not data or "uid" not in data or "provider" not in data or "cv" not in data:
        raise HTTPException(400, "Invalid OAuth state.")
    if data.get("exp") and int(data["exp"]) < int(datetime.utcnow().timestamp()):
        raise HTTPException(400, "OAuth state expired.")
    return data


def google_authorize_url(user_id: int) -> str:
    if not oauth_configured("google"):
        raise HTTPException(503, "Google OAuth is not configured.")
    verifier, challenge = _pkce_pair()
    state = build_oauth_state(user_id, "google", verifier)
    params = {
        "client_id": os.environ["GOOGLE_CLIENT_ID"],
        "redirect_uri": f"{public_base_url()}/api/email/callback/google",
        "response_type": "code",
        "scope": " ".join(GOOGLE_SCOPES),
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
        "code_challenge": challenge,
        "code_challenge_method": "S256",
    }
    return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"


def microsoft_authorize_url(user_id: int) -> str:
    if not oauth_configured("microsoft"):
        raise HTTPException(503, "Microsoft OAuth is not configured.")
    verifier, challenge = _pkce_pair()
    state = build_oauth_state(user_id, "microsoft", verifier)
    params = {
        "client_id": os.environ["MICROSOFT_CLIENT_ID"],
        "redirect_uri": f"{public_base_url()}/api/email/callback/microsoft",
        "response_type": "code",
        "scope": " ".join(MS_SCOPES),
        "state": state,
        "code_challenge": challenge,
        "code_challenge_method": "S256",
    }
    return f"{MS_AUTH_URL}?{urlencode(params)}"


def _exchange_google(code: str, code_verifier: str) -> dict:
    resp = httpx.post(
        GOOGLE_TOKEN_URL,
        data={
            "code": code,
            "client_id": os.environ["GOOGLE_CLIENT_ID"],
            "client_secret": os.environ["GOOGLE_CLIENT_SECRET"],
            "redirect_uri": f"{public_base_url()}/api/email/callback/google",
            "grant_type": "authorization_code",
            "code_verifier": code_verifier,
        },
        timeout=20.0,
    )
    resp.raise_for_status()
    return resp.json()


def _exchange_microsoft(code: str, code_verifier: str) -> dict:
    resp = httpx.post(
        MS_TOKEN_URL,
        data={
            "code": code,
            "client_id": os.environ["MICROSOFT_CLIENT_ID"],
            "client_secret": os.environ["MICROSOFT_CLIENT_SECRET"],
            "redirect_uri": f"{public_base_url()}/api/email/callback/microsoft",
            "grant_type": "authorization_code",
            "code_verifier": code_verifier,
        },
        timeout=20.0,
    )
    resp.raise_for_status()
    return resp.json()


def _google_email(access_token: str) -> str:
    resp = httpx.get(GOOGLE_USERINFO_URL, headers={"Authorization": f"Bearer {access_token}"}, timeout=15.0)
    resp.raise_for_status()
    data = resp.json()
    email = data.get("email")
    if not email:
        raise HTTPException(400, "Could not read Google account email.")
    return email


def _microsoft_email(access_token: str) -> str:
    resp = httpx.get(MS_GRAPH_ME, headers={"Authorization": f"Bearer {access_token}"}, timeout=15.0)
    resp.raise_for_status()
    data = resp.json()
    email = data.get("mail") or data.get("userPrincipalName")
    if not email:
        raise HTTPException(400, "Could not read Microsoft account email.")
    return email


def _expires_at(expires_in: int | None) -> datetime | None:
    if not expires_in:
        return None
    return datetime.utcnow() + timedelta(seconds=int(expires_in) - 60)


def upsert_connection(
    db: Session,
    *,
    user_id: int,
    provider: str,
    email_address: str,
    access_token: str,
    refresh_token: str,
    expires_in: int | None,
    scopes: list[str],
) -> EmailConnection:
    row = db.query(EmailConnection).filter(EmailConnection.user_id == user_id).first()
    if not row:
        row = EmailConnection(user_id=user_id, provider=provider, email_address=email_address)
        db.add(row)
    row.provider = provider
    row.email_address = email_address
    row.access_token_enc = encrypt_secret(access_token)
    if refresh_token:
        row.refresh_token_enc = encrypt_secret(refresh_token)
    row.token_expires_at = _expires_at(expires_in)
    row.scopes = json.dumps(scopes)
    row.status = "active"
    row.last_error = None
    row.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(row)
    return row


def complete_oauth(db: Session, provider: str, code: str, state: str) -> EmailConnection:
    parsed = parse_oauth_state(state)
    if parsed["provider"] != provider:
        raise HTTPException(400, "OAuth provider mismatch.")

    if provider == "google":
        tokens = _exchange_google(code, parsed["cv"])
        access = tokens["access_token"]
        refresh = tokens.get("refresh_token", "")
        email = _google_email(access)
        return upsert_connection(
            db,
            user_id=int(parsed["uid"]),
            provider="google",
            email_address=email,
            access_token=access,
            refresh_token=refresh,
            expires_in=tokens.get("expires_in"),
            scopes=GOOGLE_SCOPES,
        )

    if provider == "microsoft":
        tokens = _exchange_microsoft(code, parsed["cv"])
        access = tokens["access_token"]
        refresh = tokens.get("refresh_token", "")
        email = _microsoft_email(access)
        return upsert_connection(
            db,
            user_id=int(parsed["uid"]),
            provider="microsoft",
            email_address=email,
            access_token=access,
            refresh_token=refresh,
            expires_in=tokens.get("expires_in"),
            scopes=MS_SCOPES,
        )

    raise HTTPException(400, "Unknown provider.")


def get_connection(db: Session, user_id: int) -> EmailConnection | None:
    return (
        db.query(EmailConnection)
        .filter(EmailConnection.user_id == user_id, EmailConnection.status == "active")
        .first()
    )


def get_connection_for_profile(db: Session, profile_user_id: int | None) -> EmailConnection | None:
    if profile_user_id is None:
        return None
    return get_connection(db, profile_user_id)


def connection_payload(conn: EmailConnection | None) -> dict:
    if not conn:
        return {
            "connected": False,
            "provider": None,
            "email_address": None,
            "status": None,
            "oauth_configured": {
                "google": oauth_configured("google"),
                "microsoft": oauth_configured("microsoft"),
            },
            "auth_enabled": auth_enabled(),
        }
    return {
        "connected": True,
        "provider": conn.provider,
        "email_address": conn.email_address,
        "status": conn.status,
        "last_error": conn.last_error,
        "connected_at": conn.connected_at.isoformat() if conn.connected_at else None,
        "oauth_configured": {
            "google": oauth_configured("google"),
            "microsoft": oauth_configured("microsoft"),
        },
        "auth_enabled": auth_enabled(),
    }


def delete_connection(db: Session, user_id: int) -> None:
    row = db.query(EmailConnection).filter(EmailConnection.user_id == user_id).first()
    if row:
        db.delete(row)
        db.commit()


def refresh_access_token(db: Session, conn: EmailConnection) -> EmailConnection:
    refresh = decrypt_secret(conn.refresh_token_enc)
    if not refresh:
        conn.status = "error"
        conn.last_error = "Missing refresh token — reconnect your mailbox."
        db.commit()
        raise HTTPException(401, conn.last_error)

    try:
        if conn.provider == "google":
            resp = httpx.post(
                GOOGLE_TOKEN_URL,
                data={
                    "client_id": os.environ["GOOGLE_CLIENT_ID"],
                    "client_secret": os.environ["GOOGLE_CLIENT_SECRET"],
                    "refresh_token": refresh,
                    "grant_type": "refresh_token",
                },
                timeout=20.0,
            )
            resp.raise_for_status()
            data = resp.json()
            conn.access_token_enc = encrypt_secret(data["access_token"])
            if data.get("refresh_token"):
                conn.refresh_token_enc = encrypt_secret(data["refresh_token"])
            conn.token_expires_at = _expires_at(data.get("expires_in"))
        elif conn.provider == "microsoft":
            resp = httpx.post(
                MS_TOKEN_URL,
                data={
                    "client_id": os.environ["MICROSOFT_CLIENT_ID"],
                    "client_secret": os.environ["MICROSOFT_CLIENT_SECRET"],
                    "refresh_token": refresh,
                    "grant_type": "refresh_token",
                    "scope": " ".join(MS_SCOPES),
                },
                timeout=20.0,
            )
            resp.raise_for_status()
            data = resp.json()
            conn.access_token_enc = encrypt_secret(data["access_token"])
            if data.get("refresh_token"):
                conn.refresh_token_enc = encrypt_secret(data["refresh_token"])
            conn.token_expires_at = _expires_at(data.get("expires_in"))
        else:
            raise HTTPException(400, "Unknown provider.")
        conn.status = "active"
        conn.last_error = None
        conn.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(conn)
        return conn
    except Exception as exc:
        conn.status = "error"
        conn.last_error = str(exc)
        db.commit()
        raise


def ensure_fresh_token(db: Session, conn: EmailConnection) -> str:
    if conn.token_expires_at and conn.token_expires_at > datetime.utcnow():
        return decrypt_secret(conn.access_token_enc)
    refresh_access_token(db, conn)
    return decrypt_secret(conn.access_token_enc)
