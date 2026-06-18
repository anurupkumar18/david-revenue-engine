import os
from unittest.mock import patch

from models import EmailConnection, User
from services import esp_adapter
from services.email_connections import connection_payload, oauth_configured
from services.security import hash_password


def test_oauth_not_configured_by_default():
    assert oauth_configured("google") is False
    assert oauth_configured("microsoft") is False


def test_connection_payload_disconnected():
    payload = connection_payload(None)
    assert payload["connected"] is False
    assert payload["email_address"] is None


def test_connection_payload_active(db):
    user = User(email="sender@test.com", password_hash="x", name="Sender")
    db.add(user)
    db.commit()
    conn = EmailConnection(
        user_id=user.id,
        provider="google",
        email_address="sender@test.com",
        access_token_enc="enc",
        refresh_token_enc="enc",
        status="active",
    )
    db.add(conn)
    db.commit()
    payload = connection_payload(conn)
    assert payload["connected"] is True
    assert payload["provider"] == "google"
    assert payload["email_address"] == "sender@test.com"


def test_get_connection_requires_auth(client, monkeypatch):
    monkeypatch.setenv("AUTH_SECRET", "test-secret-for-auth")
    resp = client.get("/api/email/connection")
    assert resp.status_code == 401


def test_connect_google_redirect_when_configured(client, db):
    ensure = db.query(User).filter(User.email == "demo@gtm.local").first()
    if not ensure:
        db.add(User(email="demo@gtm.local", password_hash="", name="Demo", is_demo=True))
        db.commit()

    with patch.dict(
        os.environ,
        {
            "GOOGLE_CLIENT_ID": "gid",
            "GOOGLE_CLIENT_SECRET": "gsec",
            "PUBLIC_BASE_URL": "http://localhost:3000",
        },
        clear=False,
    ):
        resp = client.get("/api/email/connect/google", follow_redirects=False)
        assert resp.status_code == 302
        assert "accounts.google.com" in resp.headers["location"]


def test_start_sequence_blocks_without_connection_when_auth_enabled(client, db, monkeypatch):
    monkeypatch.setenv("AUTH_SECRET", "unit-test-auth-secret")

    user = User(email="ops@test.com", password_hash=hash_password("pass"), name="Ops")
    db.add(user)
    db.commit()

    from models import ICPProfile

    profile = ICPProfile(company_name="Acme", status="accepted", user_id=user.id)
    db.add(profile)
    db.commit()

    from services.auth import session_cookie_value

    token = session_cookie_value(user)
    payload = {
        "sends": [
            {
                "account_id": "acc_1",
                "contact_email": "owner@biz.com",
                "grade": "A",
                "step1": {"subject": "hi", "body": "hello there", "validated": True},
            }
        ]
    }
    resp = client.post(
        f"/api/sequences/{profile.id}/start",
        json=payload,
        cookies={"gtm_session": token},
    )
    assert resp.status_code == 400
    assert "mailbox" in resp.json()["detail"].lower()


def test_esp_adapter_fails_without_connection_when_auth_enabled(monkeypatch):
    monkeypatch.setenv("AUTH_SECRET", "unit-test-auth-secret")
    result = esp_adapter.send_email(to="a@b.com", subject="s", body="b")
    assert result["status"] == "failed"
    assert "mailbox" in result["error"].lower()
