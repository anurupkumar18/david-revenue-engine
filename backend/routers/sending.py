import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import ICPProfile, Message, SendJob
from schemas import StartSequenceRequest
from services.sends import cap_remaining, daily_send_cap, decide_outbound, drain_send_queue

router = APIRouter(prefix="/api", tags=["sending"])

# Mirrors lib/sending.ts STEP_TWO_DELAY_DAYS.
STEP_TWO_DELAY_DAYS = 3


def _require_profile(db: Session, profile_id: int) -> ICPProfile:
    profile = db.query(ICPProfile).filter(ICPProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(404, "Profile not found")
    return profile


def _create_step(db: Session, *, thread_id: str, profile_id: int, send, step_label: str,
                 step_payload, scheduled_at: datetime, auto: bool) -> SendJob:
    message = Message(
        thread_id=thread_id,
        profile_id=profile_id,
        account_id=send.account_id,
        contact_email=send.contact_email,
        direction="outbound",
        step=step_label,
        subject=step_payload.subject,
        body=step_payload.body,
        status="queued",
    )
    db.add(message)
    db.flush()  # assign message.id
    job = SendJob(
        thread_id=thread_id,
        profile_id=profile_id,
        account_id=send.account_id,
        contact_email=send.contact_email,
        step=step_label,
        scheduled_at=scheduled_at,
        status="pending" if auto else "needs_review",
        draft_message_id=message.id,
        auto=auto,
    )
    db.add(job)
    return job


@router.post("/sequences/{profile_id}/start")
def start_sequence(profile_id: int, data: StartSequenceRequest, db: Session = Depends(get_db)):
    _require_profile(db, profile_id)
    now = datetime.utcnow()
    summary = {"threads": 0, "jobs_created": 0, "auto": 0, "needs_review": 0}

    for send in data.sends:
        if not send.contact_email:
            continue
        thread_id = uuid.uuid4().hex
        auto, _reason = decide_outbound(db, profile_id, send.contact_email, send.step1.validated, send.grade)
        _create_step(db, thread_id=thread_id, profile_id=profile_id, send=send,
                     step_label="1", step_payload=send.step1, scheduled_at=now, auto=auto)
        summary["jobs_created"] += 1
        summary["auto" if auto else "needs_review"] += 1

        if send.step2:
            auto2, _r2 = decide_outbound(db, profile_id, send.contact_email, send.step2.validated, send.grade)
            _create_step(db, thread_id=thread_id, profile_id=profile_id, send=send,
                         step_label="2", step_payload=send.step2,
                         scheduled_at=now + timedelta(days=STEP_TWO_DELAY_DAYS), auto=auto2)
            summary["jobs_created"] += 1
            summary["auto" if auto2 else "needs_review"] += 1
        summary["threads"] += 1

    db.commit()
    return summary


def _job_payload(db: Session, job: SendJob) -> dict:
    message = db.query(Message).filter(Message.id == job.draft_message_id).first()
    return {
        "id": job.id,
        "thread_id": job.thread_id,
        "account_id": job.account_id,
        "contact_email": job.contact_email,
        "step": job.step,
        "status": job.status,
        "auto": bool(job.auto),
        "scheduled_at": job.scheduled_at.isoformat() if job.scheduled_at else None,
        "last_error": job.last_error,
        "subject": message.subject if message else "",
        "sent_at": message.sent_at.isoformat() if message and message.sent_at else None,
    }


@router.get("/send-jobs/{profile_id}")
def list_send_jobs(profile_id: int, db: Session = Depends(get_db)):
    jobs = (
        db.query(SendJob)
        .filter(SendJob.profile_id == profile_id)
        .order_by(SendJob.scheduled_at.asc())
        .all()
    )
    return {
        "jobs": [_job_payload(db, j) for j in jobs],
        "cap": daily_send_cap(),
        "cap_remaining": cap_remaining(db, profile_id),
    }


@router.post("/send-jobs/{job_id}/approve")
def approve_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(SendJob).filter(SendJob.id == job_id).first()
    if not job:
        raise HTTPException(404, "Send job not found")
    if job.status in ("needs_review", "pending"):
        job.status = "approved"
        db.commit()
    return {"ok": True, "status": job.status}


@router.post("/send-jobs/{job_id}/skip")
def skip_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(SendJob).filter(SendJob.id == job_id).first()
    if not job:
        raise HTTPException(404, "Send job not found")
    job.status = "skipped"
    db.commit()
    return {"ok": True, "status": job.status}


@router.post("/send-jobs/{profile_id}/run")
def run_send_queue(profile_id: int, db: Session = Depends(get_db)):
    """Manually drain due sends now (keyless demo + tests; mirrors the scheduler tick)."""
    return drain_send_queue(db=db)
