"""Send-time enforcement: daily caps, conservative auto-decision, and the queue drainer."""

import os
from datetime import datetime

from sqlalchemy.orm import Session

from database import SessionLocal
from models import DailySendCount, ICPProfile, Message, SendJob
from services import esp_adapter
from services.compliance import compliance_footer, is_suppressed, unsubscribe_url
from services.email_connections import get_connection_for_profile


def daily_send_cap() -> int:
    try:
        return int(os.environ.get("DAILY_SEND_CAP", "50"))
    except ValueError:
        return 50


def public_base_url() -> str:
    return os.environ.get("PUBLIC_BASE_URL") or os.environ.get("NEXT_INTERNAL_URL") or "http://localhost:3000"


def _today(now: datetime | None = None) -> str:
    return (now or datetime.utcnow()).strftime("%Y-%m-%d")


def cap_remaining(db: Session, profile_id: int, now: datetime | None = None) -> int:
    row = (
        db.query(DailySendCount)
        .filter(DailySendCount.profile_id == profile_id, DailySendCount.date == _today(now))
        .first()
    )
    used = row.count if row else 0
    return max(0, daily_send_cap() - used)


def record_send(db: Session, profile_id: int, now: datetime | None = None) -> None:
    today = _today(now)
    row = (
        db.query(DailySendCount)
        .filter(DailySendCount.profile_id == profile_id, DailySendCount.date == today)
        .first()
    )
    if row:
        row.count = (row.count or 0) + 1
    else:
        row = DailySendCount(profile_id=profile_id, date=today, count=1)
        db.add(row)
    db.commit()


def decide_outbound(db: Session, profile_id: int, email: str, validated: bool, grade: str | None) -> tuple[bool, str]:
    if is_suppressed(db, email, profile_id):
        return False, "Recipient is suppressed — do not send."
    if not validated:
        return False, "Copy failed compliance validation — needs review."
    if grade == "D":
        return False, "Low-fit account (grade D) — needs review."
    return True, "Clean, high-confidence send."


def _resolve_connection(db: Session, profile_id: int):
    profile = db.query(ICPProfile).filter(ICPProfile.id == profile_id).first()
    if not profile:
        return None
    return get_connection_for_profile(db, profile.user_id)


def _send_message(db: Session, job: SendJob, message: Message, now: datetime) -> str:
    if is_suppressed(db, message.contact_email, job.profile_id):
        job.status = "skipped"
        message.status = "skipped"
        return "skipped"

    connection = _resolve_connection(db, job.profile_id)
    link = unsubscribe_url(public_base_url(), message.contact_email, job.profile_id)
    body = f"{message.body}{compliance_footer(link)}"
    result = esp_adapter.send_email(
        to=message.contact_email,
        subject=message.subject,
        body=body,
        headers={"List-Unsubscribe": f"<{link}>"},
        connection=connection,
        db=db,
    )
    if result["status"] == "sent":
        message.status = "sent"
        message.sent_at = now
        message.esp_message_id = result.get("id", "")
        message.auto_sent = bool(job.auto)
        job.status = "sent"
        record_send(db, job.profile_id, now)
        return "sent"

    job.status = "failed"
    job.attempts = (job.attempts or 0) + 1
    job.last_error = result.get("error", "send failed")
    message.status = "failed"
    return "failed"


def drain_send_queue(now: datetime | None = None, db: Session | None = None) -> dict:
    now = now or datetime.utcnow()
    own_session = db is None
    db = db or SessionLocal()
    summary = {"sent": 0, "skipped": 0, "failed": 0, "held": 0}
    try:
        jobs = (
            db.query(SendJob)
            .filter(SendJob.status.in_(["pending", "approved"]), SendJob.scheduled_at <= now)
            .order_by(SendJob.scheduled_at.asc())
            .all()
        )
        for job in jobs:
            if cap_remaining(db, job.profile_id, now) <= 0:
                summary["held"] += 1
                continue
            message = db.query(Message).filter(Message.id == job.draft_message_id).first()
            if not message:
                job.status = "failed"
                job.last_error = "draft message missing"
                summary["failed"] += 1
                db.commit()
                continue
            outcome = _send_message(db, job, message, now)
            summary[outcome] += 1
            db.commit()
        return summary
    finally:
        if own_session:
            db.close()
