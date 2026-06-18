from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from schemas import ThreadActionRequest
from services.thread_inbox import apply_thread_action, list_threads, thread_detail

router = APIRouter(prefix="/api/threads", tags=["threads"])


@router.get("/{profile_id}")
def get_threads(profile_id: int, db: Session = Depends(get_db)):
    return list_threads(db, profile_id)


@router.get("/detail/{thread_id}")
def get_thread(thread_id: str, db: Session = Depends(get_db)):
    try:
        return thread_detail(db, thread_id)
    except ValueError as exc:
        raise HTTPException(404, str(exc)) from exc


@router.patch("/{thread_id}")
def patch_thread(thread_id: str, data: ThreadActionRequest, db: Session = Depends(get_db)):
    try:
        return apply_thread_action(db, thread_id, data.model_dump())
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
