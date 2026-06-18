from services import security


def test_password_hash_roundtrip():
    h = security.hash_password("hunter2")
    assert h.startswith("pbkdf2_sha256$")
    assert security.verify_password("hunter2", h)
    assert not security.verify_password("wrong", h)


def test_verify_rejects_garbage():
    assert not security.verify_password("x", "not-a-valid-hash")


def test_sign_unsign_roundtrip():
    token = security.sign({"uid": 42})
    assert security.unsign(token) == {"uid": 42}


def test_unsign_rejects_tampered_token():
    token = security.sign({"uid": 42})
    assert security.unsign(token + "x") is None
    assert security.unsign("garbage") is None
    assert security.unsign("") is None
