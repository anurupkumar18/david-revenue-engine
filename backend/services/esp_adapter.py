"""Email service provider adapter.

Routes outbound sends through the user's OAuth-connected mailbox (Gmail or Microsoft
Graph) when available. Falls back to Resend when configured, otherwise simulates.
"""

import os
import uuid

import httpx

from models import EmailConnection
from services import gmail_send, graph_send
from services.email_connections import ensure_fresh_token
from services.security import auth_enabled

RESEND_API_URL = "https://api.resend.com/emails"
DEFAULT_FROM = "GTM Campaign Builder <onboarding@resend.dev>"


def is_live() -> bool:
    return bool(os.environ.get("RESEND_API_KEY"))


def default_from() -> str:
    return os.environ.get("EMAIL_FROM") or DEFAULT_FROM


def _simulate() -> dict:
    return {
        "id": f"sim_{uuid.uuid4().hex[:24]}",
        "status": "sent",
        "simulated": True,
    }


def _send_via_resend(*, to: str, subject: str, body: str, from_addr: str, reply_to: str | None, headers: dict | None) -> dict:
    payload = {
        "from": from_addr,
        "to": [to],
        "subject": subject,
        "html": body if "<" in body else f"<p>{body}</p>",
        "text": body,
    }
    if reply_to:
        payload["reply_to"] = reply_to
    if headers:
        payload["headers"] = headers
    try:
        resp = httpx.post(
            RESEND_API_URL,
            json=payload,
            headers={"Authorization": f"Bearer {os.environ['RESEND_API_KEY']}"},
            timeout=15.0,
        )
        resp.raise_for_status()
        data = resp.json()
        return {"id": data.get("id", ""), "status": "sent", "simulated": False, "provider": "resend"}
    except Exception as exc:
        return {"id": "", "status": "failed", "simulated": False, "provider": "resend", "error": str(exc)}


def send_email(
    *,
    to: str,
    subject: str,
    body: str,
    from_addr: str | None = None,
    reply_to: str | None = None,
    headers: dict | None = None,
    connection: EmailConnection | None = None,
    db=None,
) -> dict:
    """Send (or simulate) one email via OAuth mailbox, Resend, or simulation."""
    sender = from_addr or (connection.email_address if connection else default_from())
    reply = reply_to or (connection.email_address if connection else None)

    if connection and db is not None:
        try:
            access = ensure_fresh_token(db, connection)
            if connection.provider == "google":
                result = gmail_send.send_via_gmail(
                    access_token=access,
                    to=to,
                    subject=subject,
                    body=body,
                    from_addr=sender,
                    reply_to=reply,
                    headers=headers,
                )
            elif connection.provider == "microsoft":
                result = graph_send.send_via_graph(
                    access_token=access,
                    to=to,
                    subject=subject,
                    body=body,
                    from_addr=sender,
                    reply_to=reply,
                    headers=headers,
                )
            else:
                result = {"id": "", "status": "failed", "error": "Unknown mailbox provider."}
            if result["status"] == "failed" and result.get("error", "").startswith("401"):
                connection.status = "error"
                connection.last_error = result.get("error")
                db.commit()
            return result
        except Exception as exc:
            if connection and db is not None:
                connection.status = "error"
                connection.last_error = str(exc)
                db.commit()
            return {"id": "", "status": "failed", "simulated": False, "error": str(exc)}

    if auth_enabled():
        return {
            "id": "",
            "status": "failed",
            "simulated": False,
            "error": "No mailbox connected. Connect Gmail or Microsoft 365 in Email settings.",
        }

    if is_live():
        return _send_via_resend(to=to, subject=subject, body=body, from_addr=sender, reply_to=reply, headers=headers)

    return _simulate()
