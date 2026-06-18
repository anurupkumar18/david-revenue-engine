"""Profile ownership checks when real auth is enabled."""

from fastapi import HTTPException
from sqlalchemy.orm import Session

from models import ICPProfile, User
from services.security import auth_enabled


def assert_profile_access(profile: ICPProfile, user: User) -> None:
    if not auth_enabled():
        return
    if profile.user_id is not None and profile.user_id != user.id:
        raise HTTPException(403, "Not authorized for this profile")


def get_owned_profile(db: Session, profile_id: int, user: User) -> ICPProfile:
    profile = db.query(ICPProfile).filter(ICPProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(404, "Profile not found")
    assert_profile_access(profile, user)
    return profile
