def test_demo_bypass_when_auth_disabled(client):
    """No AUTH_SECRET: every request resolves to the seeded demo user, no login."""
    resp = client.get("/api/auth/me")
    assert resp.status_code == 200
    body = resp.json()
    assert body["is_demo"] is True
    assert body["auth_enabled"] is False


def test_real_auth_requires_session(client, monkeypatch):
    monkeypatch.setenv("AUTH_SECRET", "test-secret")

    # Unauthenticated request is rejected.
    assert client.get("/api/auth/me").status_code == 401

    # Signup issues a session cookie.
    signup = client.post(
        "/api/auth/signup",
        json={"email": "op@agency.com", "password": "pw12345678", "name": "Op"},
    )
    assert signup.status_code == 200
    assert signup.json()["auth_enabled"] is True

    me = client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json()["email"] == "op@agency.com"

    # Wrong password is rejected; logout clears the session.
    assert client.post("/api/auth/login", json={"email": "op@agency.com", "password": "nope"}).status_code == 401
    client.post("/api/auth/logout")
    assert client.get("/api/auth/me").status_code == 401
