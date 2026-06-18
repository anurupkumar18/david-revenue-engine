from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db, get_db_path
from models import ICPContact, ICPProfile, OutreachQueue
from schemas import OutreachExportRequest
from services.contact_discovery import generate_connection_note

router = APIRouter(prefix="/api/outreach", tags=["outreach"])


@router.post("/export")
def export_to_outreach(data: OutreachExportRequest, db: Session = Depends(get_db)):
    profile = db.query(ICPProfile).filter(ICPProfile.id == data.profile_id).first()
    if not profile:
        raise HTTPException(404, "Profile not found")

    contacts = db.query(ICPContact).filter(ICPContact.profile_id == data.profile_id).all()
    if not contacts:
        raise HTTPException(400, "No contacts to export. Run contact discovery first.")

    db.query(OutreachQueue).filter(OutreachQueue.profile_id == data.profile_id).delete()

    exported = 0
    for c in contacts:
        note = generate_connection_note(profile.fields, {
            "decision_maker_name": c.decision_maker_name,
            "company_name": c.company_name,
            "hook_angle": c.hook_angle,
        })
        item = OutreachQueue(
            profile_id=profile.id,
            contact_id=c.id,
            name=c.decision_maker_name,
            company=c.company_name,
            title=c.title,
            email=c.email,
            phone=c.phone,
            linkedin_search_url=c.linkedin_search_url,
            connection_note=note,
            status="pending",
        )
        db.add(item)
        exported += 1

    db.commit()
    return {
        "exported": exported,
        "profile_id": profile.id,
        "db_path": get_db_path(),
        "cli_hint": f"python -m linkedin_outreach import --from-db --profile-id {profile.id}",
    }


@router.get("/queue/{profile_id}")
def get_queue(profile_id: int, db: Session = Depends(get_db)):
    items = db.query(OutreachQueue).filter(OutreachQueue.profile_id == profile_id).all()
    return [
        {
            "id": i.id,
            "name": i.name,
            "company": i.company,
            "title": i.title,
            "email": i.email,
            "phone": i.phone,
            "linkedin_search_url": i.linkedin_search_url,
            "connection_note": i.connection_note,
            "status": i.status,
        }
        for i in items
    ]


@router.patch("/queue/{item_id}")
def update_queue_item(item_id: int, status: str, notes: str = "", db: Session = Depends(get_db)):
    item = db.query(OutreachQueue).filter(OutreachQueue.id == item_id).first()
    if not item:
        raise HTTPException(404, "Queue item not found")
    item.status = status
    if notes:
        item.notes = notes
    if status == "opened":
        item.opened_at = datetime.utcnow()
    if status == "connected":
        item.connected_at = datetime.utcnow()
    db.commit()
    return {"id": item.id, "status": item.status}
