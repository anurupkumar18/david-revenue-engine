"""Email service provider adapter.

Resend is the first concrete provider, behind a swappable function interface. With no
RESEND_API_KEY the adapter performs a *simulated send* — it returns a synthetic message
id and never touches the network — so the demo and tests run keyless and offline. With a
key present it really sends via the Resend HTTP API.
"""

import os
import uuid

import httpx

RESEND_API_URL = "https://api.resend.com/emails"
DEFAULT_FROM = "GTM Campaign Builder <onboarding@resend.dev>"


def is_live() -> bool:
    """True when a real ESP key is configured (real sends), False = simulated."""
    return bool(os.environ.get("RESEND_API_KEY"))


def default_from() -> str:
    return os.environ.get("EMAIL_FROM") or DEFAULT_FROM


def send_email(
    *,
    to: str,
    subject: str,
    body: str,
    from_addr: str | None = None,
    reply_to: str | None = None,
    headers: dict | None = None,
) -> dict:
    """Send (or simulate) one email.

    Returns {id, status, simulated, error?}. status is "sent" on success (real or
    simulated) and "failed" when a live send errors. Callers persist this result.
    """
    sender = from_addr or default_from()

    if not is_live():
        return {
            "id": f"sim_{uuid.uuid4().hex[:24]}",
            "status": "sent",
            "simulated": True,
        }

    payload = {
        "from": sender,
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
        return {"id": data.get("id", ""), "status": "sent", "simulated": False}
    except Exception as exc:  # network/HTTP error: report, never crash the scheduler
        return {"id": "", "status": "failed", "simulated": False, "error": str(exc)}
