from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import ICPContact, ICPProfile, OutreachQueue
from schemas import OutreachExportRequest, ProfileCreate, ProfileResponse, ProfileUpdate, RevenueStateUpdate
from services.contact_discovery import discover_contacts, generate_connection_note

router = APIRouter(prefix="/api/profiles", tags=["profiles"])

EMPTY_REVENUE_STATE = {
    "accounts": [],
    "loadedScenario": None,
    "strategy": None,
    "outreachByAccount": {},
    "lastRouted": None,
}


def _profile_to_response(profile: ICPProfile) -> dict:
    return {
        "id": profile.id,
        "company_name": profile.company_name,
        "fields": profile.fields,
        "confidence": profile.confidence,
        "status": profile.status,
        "created_at": profile.created_at.isoformat() if profile.created_at else "",
        "contacts": [
            {
                "id": c.id,
                "profile_id": c.profile_id,
                "company_name": c.company_name,
                "industry": c.industry,
                "decision_maker_name": c.decision_maker_name,
                "title": c.title,
                "email": c.email,
                "phone": c.phone,
                "linkedin_search_url": c.linkedin_search_url,
                "website_url": c.website_url,
                "verification_status": c.verification_status,
                "source_url": c.source_url,
                "hook_angle": c.hook_angle,
                "status": c.status,
            }
            for c in profile.contacts
        ],
    }


@router.post("")
def create_profile(data: ProfileCreate, db: Session = Depends(get_db)):
    company = data.fields.get("company_name", "Untitled")
    profile = ICPProfile(company_name=company, status=data.status)
    profile.fields = data.fields
    profile.confidence = data.confidence
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return _profile_to_response(profile)


@router.get("")
def list_profiles(db: Session = Depends(get_db)):
    profiles = db.query(ICPProfile).order_by(ICPProfile.created_at.desc()).all()
    return [_profile_to_response(p) for p in profiles]


@router.get("/{profile_id}")
def get_profile(profile_id: int, db: Session = Depends(get_db)):
    profile = db.query(ICPProfile).filter(ICPProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(404, "Profile not found")
    return _profile_to_response(profile)


@router.patch("/{profile_id}")
def update_profile(profile_id: int, data: ProfileUpdate, db: Session = Depends(get_db)):
    profile = db.query(ICPProfile).filter(ICPProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(404, "Profile not found")
    if data.fields is not None:
        profile.fields = data.fields
        profile.company_name = data.fields.get("company_name", profile.company_name)
    if data.confidence is not None:
        profile.confidence = data.confidence
    if data.status is not None:
        profile.status = data.status
    db.commit()
    db.refresh(profile)
    return _profile_to_response(profile)


@router.post("/{profile_id}/discover-contacts")
def discover_profile_contacts(profile_id: int, db: Session = Depends(get_db)):
    profile = db.query(ICPProfile).filter(ICPProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(404, "Profile not found")

    db.query(ICPContact).filter(ICPContact.profile_id == profile_id).delete()
    discovered = discover_contacts(profile.fields)

    for d in discovered:
        contact = ICPContact(
            profile_id=profile_id,
            company_name=d["company_name"],
            industry=d.get("industry"),
            decision_maker_name=d.get("decision_maker_name"),
            title=d.get("title"),
            email=d.get("email") or None,
            phone=d.get("phone") or None,
            linkedin_search_url=d.get("linkedin_search_url"),
            website_url=d.get("website_url"),
            verification_status=d.get("verification_status", "needs_manual"),
            source_url=d.get("source_url"),
            hook_angle=d.get("hook_angle"),
        )
        db.add(contact)
    db.commit()
    db.refresh(profile)
    return {"count": len(discovered), "profile": _profile_to_response(profile)}


@router.get("/{profile_id}/revenue")
def get_revenue_state(profile_id: int, db: Session = Depends(get_db)):
    profile = db.query(ICPProfile).filter(ICPProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(404, "Profile not found")
    state = profile.revenue_state
    if not state:
        return EMPTY_REVENUE_STATE
    return {**EMPTY_REVENUE_STATE, **state}


@router.put("/{profile_id}/revenue")
def save_revenue_state(profile_id: int, data: RevenueStateUpdate, db: Session = Depends(get_db)):
    profile = db.query(ICPProfile).filter(ICPProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(404, "Profile not found")
    profile.revenue_state = data.model_dump()
    db.commit()
    return {"ok": True}


@router.get("/{profile_id}/contacts")
def get_contacts(profile_id: int, db: Session = Depends(get_db)):
    contacts = db.query(ICPContact).filter(ICPContact.profile_id == profile_id).all()
    return [
        {
            "id": c.id,
            "profile_id": c.profile_id,
            "company_name": c.company_name,
            "industry": c.industry,
            "decision_maker_name": c.decision_maker_name,
            "title": c.title,
            "email": c.email,
            "phone": c.phone,
            "linkedin_search_url": c.linkedin_search_url,
            "website_url": c.website_url,
            "verification_status": c.verification_status,
            "source_url": c.source_url,
            "hook_angle": c.hook_angle,
            "status": c.status,
        }
        for c in contacts
    ]
