"""APScheduler spine for scheduled sends and brief generation.

Skeleton for Phase 2a: the scheduler only runs when SCHEDULER_ENABLED is set, and
APScheduler is imported lazily so the backend (and tests) run without it installed or
enabled. The send-queue and brief jobs are registered here; their bodies are filled in
later phases (2b sending, 2d briefs). Sends inside the tick are simulated unless an ESP
key is configured.
"""

import os

from database import SessionLocal
from models import Brief, ICPProfile
from services.briefs import generate_brief

_scheduler = None  # module-level singleton


def scheduler_enabled() -> bool:
    return os.environ.get("SCHEDULER_ENABLED", "").lower() in {"1", "true", "yes", "on"}


def send_queue_tick() -> None:
    """Drain due, approved send jobs under the daily cap."""
    from services.sends import drain_send_queue

    drain_send_queue()


def daily_brief_tick() -> None:
    """Generate daily briefs per customer."""
    _run_brief_tick("daily")


def weekly_brief_tick() -> None:
    """Generate weekly briefs per customer."""
    _run_brief_tick("weekly")


def _run_brief_tick(period: str) -> None:
    db = SessionLocal()
    try:
        profiles = db.query(ICPProfile).all()
        for profile in profiles:
            brief_data = generate_brief(db=db, profile=profile, period=period)
            existing = (
                db.query(Brief)
                .filter(
                    Brief.profile_id == profile.id,
                    Brief.period == brief_data["period"],
                    Brief.period_start == brief_data["periodStart"],
                    Brief.period_end == brief_data["periodEnd"],
                )
                .first()
            )
            if existing:
                continue
            row = Brief(
                profile_id=profile.id,
                period=brief_data["period"],
                period_start=brief_data["periodStart"],
                period_end=brief_data["periodEnd"],
                metrics=brief_data["metrics"],
                recommendations=brief_data["recommendations"],
                narrative=brief_data["narrative"],
            )
            db.add(row)
            db.commit()
    finally:
        db.close()


def start_scheduler():
    """Start the background scheduler if enabled. Returns the scheduler or None."""
    global _scheduler
    if not scheduler_enabled() or _scheduler is not None:
        return _scheduler

    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        from apscheduler.triggers.cron import CronTrigger
        from apscheduler.triggers.interval import IntervalTrigger
    except ImportError:
        # APScheduler not installed: skip silently so the keyless demo still runs.
        return None

    sched = BackgroundScheduler(timezone="UTC")
    sched.add_job(send_queue_tick, IntervalTrigger(minutes=1), id="send_queue", replace_existing=True)
    sched.add_job(daily_brief_tick, CronTrigger(hour=13, minute=0), id="daily_brief", replace_existing=True)
    sched.add_job(
        weekly_brief_tick, CronTrigger(day_of_week="mon", hour=13, minute=5), id="weekly_brief", replace_existing=True
    )
    sched.start()
    _scheduler = sched
    return _scheduler


def shutdown_scheduler():
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
