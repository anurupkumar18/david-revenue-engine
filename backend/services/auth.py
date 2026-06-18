"""Minimal session auth with a demo bypass.

When AUTH_SECRET is unset the app runs ungated: every request resolves to a seeded
"Demo Workspace" user, so the keyless demo needs no login. When AUTH_SECRET is set,
signup/login issue a signed session cookie and protected routes require it.
"""

from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from database import get_db
from models import User
from services.security import (
    auth_enabled,
    hash_password,
    sign,
    unsign,
    verify_password,
)

SESSION_COOKIE = "gtm_session"
DEMO_EMAIL = "demo@gtm.local"


def ensure_demo_user(db: Session) -> User:
    user = db.query(User).filter(User.email == DEMO_EMAIL).first()
    if not user:
        user = User(email=DEMO_EMAIL, password_hash="", name="Demo Workspace", is_demo=True)
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


def create_user(db: Session, email: str, password: str, name: str = "") -> User:
    email = email.lower().strip()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(409, "An account with that email already exists.")
    user = User(email=email, password_hash=hash_password(password), name=name)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate(db: Session, email: str, password: str) -> User | None:
    user = db.query(User).filter(User.email == email.lower().strip()).first()
    if not user or not user.password_hash:
        return None
    return user if verify_password(password, user.password_hash) else None


def session_cookie_value(user: User) -> str:
    return sign({"uid": user.id})


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    """Resolve the request's user, or fall back to the demo user in demo mode."""
    if not auth_enabled():
        return ensure_demo_user(db)

    token = request.cookies.get(SESSION_COOKIE)
    data = unsign(token) if token else None
    if not data or "uid" not in data:
        raise HTTPException(401, "Not authenticated.")
    user = db.query(User).filter(User.id == data["uid"]).first()
    if not user:
        raise HTTPException(401, "Session no longer valid.")
    return user
