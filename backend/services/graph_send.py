"""Send email via Microsoft Graph."""

import httpx

GRAPH_SEND_URL = "https://graph.microsoft.com/v1.0/me/sendMail"


def send_via_graph(
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
    payload = {
        "message": {
            "subject": subject,
            "body": {"contentType": "HTML", "content": body_html},
            "toRecipients": [{"emailAddress": {"address": to}}],
        },
        "saveToSentItems": True,
    }
    if reply_to:
        payload["message"]["replyTo"] = [{"emailAddress": {"address": reply_to}}]
    extra = headers or {}
    if extra:
        payload["message"]["internetMessageHeaders"] = [
            {"name": k, "value": v} for k, v in extra.items()
        ]
    try:
        resp = httpx.post(
            GRAPH_SEND_URL,
            json=payload,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=20.0,
        )
        resp.raise_for_status()
        return {"id": f"ms_{to}_{subject[:12]}", "status": "sent", "simulated": False, "provider": "microsoft"}
    except Exception as exc:
        return {"id": "", "status": "failed", "simulated": False, "provider": "microsoft", "error": str(exc)}
