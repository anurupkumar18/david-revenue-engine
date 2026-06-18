"""Pytest fixtures. Runs against an isolated temp SQLite DB; auth/scheduler/ESP keys
are cleared so tests exercise the keyless/demo defaults unless a test opts in."""

import os
import tempfile

# Must be set before `import database` builds the engine.
os.environ.setdefault("ICP_STUDIO_DATA_DIR", tempfile.mkdtemp(prefix="gtm-test-"))
for key in ("AUTH_SECRET", "SCHEDULER_ENABLED", "RESEND_API_KEY"):
    os.environ.pop(key, None)

import pytest  # noqa: E402

import database  # noqa: E402
import models  # noqa: F401,E402


@pytest.fixture(autouse=True)
def fresh_db():
    database.Base.metadata.drop_all(bind=database.engine)
    database.Base.metadata.create_all(bind=database.engine)
    yield


@pytest.fixture
def db():
    session = database.SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client():
    from fastapi.testclient import TestClient

    import main

    return TestClient(main.app)
