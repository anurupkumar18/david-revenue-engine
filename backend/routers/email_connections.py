from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import User
from services.auth import get_current_user
from services.email_connections import (
    complete_oauth,
    connection_payload,
    delete_connection,
    get_connection,
    google_authorize_url,
    microsoft_authorize_url,
    oauth_configured,
    public_base_url,
)
from services import esp_adapter
from services.compliance import compliance_footer, unsubscribe_url
from services.sends import public_base_url as sends_public_base_url

router = APIRouter(prefix="/api/email", tags=["email"])


class TestSendRequest(BaseModel):
    to: str


@router.get("/connect/google")
def connect_google(user: User = Depends(get_current_user)):
    return RedirectResponse(google_authorize_url(user.id), status_code=302)


@router.get("/connect/microsoft")
def connect_microsoft(user: User = Depends(get_current_user)):
    return RedirectResponse(microsoft_authorize_url(user.id), status_code=302)


@router.get("/callback/google")
def callback_google(code: str = "", state: str = "", db: Session = Depends(get_db)):
    if not code:
        raise HTTPException(400, "Missing authorization code.")
    complete_oauth(db, "google", code, state)
    return RedirectResponse(f"{public_base_url()}/dashboard?email_connected=1", status_code=302)


@router.get("/callback/microsoft")
def callback_microsoft(code: str = "", state: str = "", db: Session = Depends(get_db)):
    if not code:
        raise HTTPException(400, "Missing authorization code.")
    complete_oauth(db, "microsoft", code, state)
    return RedirectResponse(f"{public_base_url()}/dashboard?email_connected=1", status_code=302)


@router.get("/connection")
def get_email_connection(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    conn = get_connection(db, user.id)
    payload = connection_payload(conn)
    payload["live_mode"] = bool(conn) or esp_adapter.is_live()
    return payload


@router.delete("/connection")
def remove_email_connection(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    delete_connection(db, user.id)
    return {"ok": True}


@router.post("/connection/test")
def test_email_connection(
    data: TestSendRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conn = get_connection(db, user.id)
    if not conn:
        raise HTTPException(400, "No mailbox connected. Connect Gmail or Microsoft 365 first.")
    link = unsubscribe_url(sends_public_base_url(), data.to, profile_id=0)
    body = f"<p>This is a test send from AI GTM Campaign Builder.</p>{compliance_footer(link)}"
    result = esp_adapter.send_email(
        to=data.to,
        subject="Test send — AI GTM Campaign Builder",
        body=body,
        connection=conn,
        db=db,
    )
    if result["status"] != "sent":
        raise HTTPException(502, result.get("error", "Test send failed."))
    return {"ok": True, "message_id": result.get("id"), "simulated": result.get("simulated", False)}


@router.get("/oauth-status")
def oauth_status():
    return {
        "google": oauth_configured("google"),
        "microsoft": oauth_configured("microsoft"),
    }
