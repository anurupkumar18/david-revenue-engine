"""Send email via Gmail API."""

import base64
from email.mime.text import MIMEText

import httpx

GMAIL_SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"


def _build_raw(*, to: str, subject: str, body_html: str, from_addr: str, reply_to: str | None, headers: dict | None) -> str:
    msg = MIMEText(body_html, "html")
    msg["To"] = to
    msg["From"] = from_addr
    msg["Subject"] = subject
    if reply_to:
        msg["Reply-To"] = reply_to
    for key, value in (headers or {}).items():
        msg[key] = value
    return base64.urlsafe_b64encode(msg.as_bytes()).decode().rstrip("=")


def send_via_gmail(
    *,
    access_token: str,
    to: str,
    subject: str,
    body: str,
    from_addr: str,
    reply_to: str | None = None,
    headers: dict | None = None,
) -> dict:
    body_html = body if "<" in body else f"<p>{body.replace(chr(10), '<br/>')}</p>"
    raw = _build_raw(to=to, subject=subject, body_html=body_html, from_addr=from_addr, reply_to=reply_to, headers=headers)
    try:
        resp = httpx.post(
            GMAIL_SEND_URL,
            json={"raw": raw},
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=20.0,
        )
        resp.raise_for_status()
        data = resp.json()
        return {"id": data.get("id", ""), "status": "sent", "simulated": False, "provider": "google"}
    except Exception as exc:
        return {"id": "", "status": "failed", "simulated": False, "provider": "google", "error": str(exc)}
