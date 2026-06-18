from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas import LoginRequest, SignupRequest
from services.auth import (
    SESSION_COOKIE,
    authenticate,
    create_user,
    get_current_user,
    session_cookie_value,
)
from services.security import auth_enabled

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _user_payload(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "is_demo": bool(user.is_demo),
        "auth_enabled": auth_enabled(),
    }


def _set_session(response: Response, user: User) -> None:
    response.set_cookie(
        SESSION_COOKIE,
        session_cookie_value(user),
        httponly=True,
        samesite="lax",
        max_age=60 * 60 * 24 * 30,
    )


@router.post("/signup")
def signup(data: SignupRequest, response: Response, db: Session = Depends(get_db)):
    user = create_user(db, data.email, data.password, data.name)
    _set_session(response, user)
    return _user_payload(user)


@router.post("/login")
def login(data: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = authenticate(db, data.email, data.password)
    if not user:
        from fastapi import HTTPException

        raise HTTPException(401, "Invalid email or password.")
    _set_session(response, user)
    return _user_payload(user)


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(SESSION_COOKIE)
    return {"ok": True}


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return _user_payload(user)
