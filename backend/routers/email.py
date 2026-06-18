from __future__ import annotations

import base64
import hashlib
import hmac
import os
import time
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from database import get_db
from schemas import InboundEmailRequest
from services.compliance import add_suppression, verify_unsubscribe_token
from services.thread_inbox import process_inbound_email

router = APIRouter(prefix="/api/email", tags=["email"])


def _page(title: str, body: str) -> HTMLResponse:
    html = f"""<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<style>
  body {{ background:#0b0a09; color:#ece7dd; font-family:-apple-system,system-ui,sans-serif;
         display:flex; min-height:100vh; align-items:center; justify-content:center; margin:0; }}
  .card {{ max-width:420px; padding:40px; border:1px solid rgba(236,231,222,.12); border-radius:16px;
          background:#141110; text-align:center; }}
  h1 {{ font-size:20px; margin:0 0 12px; }}
  p {{ color:#a39d92; font-size:14px; line-height:1.5; margin:0; }}
</style></head>
<body><div class="card"><h1>{title}</h1><p>{body}</p></div></body></html>"""
    return HTMLResponse(html)


# Note: registered at /api/unsubscribe (not under the /api/email prefix) below.
unsubscribe_router = APIRouter(tags=["email"])


@unsubscribe_router.get("/api/unsubscribe")
def unsubscribe(token: str = "", db: Session = Depends(get_db)):
    parsed = verify_unsubscribe_token(token)
    if not parsed:
        return _page("Link not valid", "This unsubscribe link is invalid or expired. No changes were made.")
    email, profile_id = parsed
    add_suppression(db, email, profile_id, reason="unsubscribe")
    return _page("You're unsubscribed", f"{email} will not be contacted again. You can close this page.")


def _payload_from_request(data: InboundEmailRequest) -> dict[str, object]:
    return {
        "profile_id": data.profile_id,
        "account_id": data.account_id,
        "contact_email": data.contact_email,
        "subject": data.subject,
        "body": data.body,
        "in_reply_to": data.in_reply_to,
        "message_id": data.message_id,
        "company_name": data.company_name,
        "primary_leak_label": data.primary_leak_label,
        "offer_path_label": data.offer_path_label,
        "first_conversion_action": data.first_conversion_action,
        "grade": data.grade,
    }


def _verify_svix_request(raw_body: bytes, request: Request) -> bool:
    secret = os.environ.get("RESEND_WEBHOOK_SECRET") or ""
    if not secret:
        return False

    svix_id = request.headers.get("svix-id") or ""
    svix_timestamp = request.headers.get("svix-timestamp") or ""
    svix_signature = request.headers.get("svix-signature") or ""
    if not svix_id or not svix_timestamp or not svix_signature:
        return False

    try:
        timestamp = int(svix_timestamp)
    except ValueError:
        return False

    # Default to a five-minute replay window.
    if abs(int(time.time()) - timestamp) > 300:
        return False

    signing_input = f"{svix_id}.{svix_timestamp}.{raw_body.decode()}"
    secret_value = secret[6:] if secret.startswith("whsec_") else secret
    try:
        key = base64.b64decode(secret_value)
    except Exception:
        key = secret_value.encode()
    digest = hmac.new(key, signing_input.encode(), hashlib.sha256).digest()
    expected = base64.b64encode(digest).decode()

    candidates: list[str] = []
    for token in svix_signature.replace(",", " ").split():
        if token.startswith("v1="):
            candidates.append(token[3:])
        elif token.startswith("v1,"):
            candidates.append(token[3:])
        elif token != "v1":
            candidates.append(token)
    return any(hmac.compare_digest(candidate, expected) for candidate in candidates)


@router.post("/inbound")
async def inbound(request: Request, db: Session = Depends(get_db)):
    raw_body = await request.body()
    if not _verify_svix_request(raw_body, request):
        raise HTTPException(401, "Invalid webhook signature.")
    data = await request.json()
    return process_inbound_email(db, data)


@router.post("/simulate-inbound")
async def simulate_inbound(data: InboundEmailRequest, db: Session = Depends(get_db)):
    return process_inbound_email(db, _payload_from_request(data))
