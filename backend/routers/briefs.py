from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Brief, ICPProfile
from schemas import BriefRunRequest
from services.briefs import generate_brief

router = APIRouter(prefix="/api/briefs", tags=["briefs"])


def _brief_payload(profile: ICPProfile, brief: Brief) -> dict:
    return {
        "id": brief.id,
        "profile_id": brief.profile_id,
        "client_name": profile.company_name,
        "period": brief.period,
        "period_start": brief.period_start,
        "period_end": brief.period_end,
        "metrics": brief.metrics,
        "recommendations": brief.recommendations,
        "narrative": brief.narrative,
        "created_at": brief.created_at.isoformat() if brief.created_at else None,
    }


def _profile_or_404(db: Session, profile_id: int) -> ICPProfile:
    profile = db.query(ICPProfile).filter(ICPProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(404, "Profile not found")
    return profile


@router.get("")
def list_briefs(db: Session = Depends(get_db)):
    briefs = db.query(Brief).order_by(Brief.created_at.desc()).all()
    profiles = {profile.id: profile for profile in db.query(ICPProfile).all()}
    return {
        "briefs": [_brief_payload(profiles.get(brief.profile_id) or _profile_or_404(db, brief.profile_id), brief) for brief in briefs]
    }


@router.get("/{profile_id}")
def list_profile_briefs(profile_id: int, db: Session = Depends(get_db)):
    profile = _profile_or_404(db, profile_id)
    briefs = (
        db.query(Brief)
        .filter(Brief.profile_id == profile_id)
        .order_by(Brief.created_at.desc())
        .all()
    )
    return {"briefs": [_brief_payload(profile, brief) for brief in briefs]}


@router.post("/{profile_id}/run")
def run_brief(profile_id: int, data: BriefRunRequest, db: Session = Depends(get_db)):
    profile = _profile_or_404(db, profile_id)
    period = "weekly" if data.period == "weekly" else "daily"
    brief_data = generate_brief(db=db, profile=profile, period=period)
    row = Brief(
        profile_id=profile_id,
        period=brief_data["period"],
        period_start=brief_data["periodStart"],
        period_end=brief_data["periodEnd"],
        metrics=brief_data["metrics"],
        recommendations=brief_data["recommendations"],
        narrative=brief_data["narrative"],
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _brief_payload(profile, row) | {"counts": brief_data["counts"], "learningInsights": brief_data["learningInsights"], "source": brief_data.get("source", "deterministic")}
