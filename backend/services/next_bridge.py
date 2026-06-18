"""Tiny helper for FastAPI -> Next.js brain calls.

The backend asks Next for draft/review decisions and brief generation. If the Next
app is unavailable, callers can fall back to deterministic local logic so the demo
still works in tests and offline.
"""

from __future__ import annotations

import os
from typing import Any

import httpx


def next_internal_url() -> str:
    return os.environ.get("NEXT_INTERNAL_URL") or "http://127.0.0.1:3000"


def call_next_brain(path: str, payload: dict[str, Any]) -> dict[str, Any] | None:
    url = f"{next_internal_url().rstrip('/')}{path}"
    try:
        resp = httpx.post(url, json=payload, timeout=15.0)
        resp.raise_for_status()
        data = resp.json()
        return data if isinstance(data, dict) else None
    except Exception:
        return None
