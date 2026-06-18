"""Thread inbox helpers for inbound replies and review actions."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from models import ICPProfile, Message
from services import esp_adapter, sends
from services.compliance import add_suppression, compliance_footer, is_suppressed, unsubscribe_url
from services.next_bridge import call_next_brain
from services.replies import build_reply_draft, should_auto_send


def _now() -> datetime:
    return datetime.utcnow()


def _profile_or_404(db: Session, profile_id: int) -> ICPProfile:
    profile = db.query(ICPProfile).filter(ICPProfile.id == profile_id).first()
    if not profile:
        raise ValueError("Profile not found")
    return profile


def _reply_context(payload: dict[str, Any], profile: ICPProfile) -> dict[str, str]:
    return {
        "company_name": payload.get("company_name") or profile.company_name,
        "primary_leak_label": payload.get("primary_leak_label") or "primary leak",
        "offer_path_label": payload.get("offer_path_label") or "the right campaign angle",
        "first_conversion_action": payload.get("first_conversion_action") or "a short teardown.",
    }


def _find_existing_thread_id(db: Session, profile_id: int, payload: dict[str, Any]) -> tuple[str, str | None]:
    probe_ids = [payload.get("in_reply_to"), payload.get("message_id")]
    for probe in [item for item in probe_ids if item]:
        msg = (
            db.query(Message)
            .filter(
                Message.profile_id == profile_id,
                ((Message.esp_message_id == probe) | (Message.in_reply_to == probe)),
            )
            .order_by(Message.created_at.desc())
            .first()
        )
        if msg:
            return msg.thread_id, msg.account_id

    existing = (
        db.query(Message)
        .filter(Message.profile_id == profile_id, Message.contact_email == payload.get("contact_email"))
        .order_by(Message.created_at.desc())
        .first()
    )
    if existing:
        return existing.thread_id, existing.account_id

    return uuid.uuid4().hex, payload.get("account_id")


def _serialize_message(message: Message, *, include_validation: bool = False, validation: dict | None = None, routed: dict | None = None) -> dict[str, Any]:
    data: dict[str, Any] = {
        "id": message.id,
        "thread_id": message.thread_id,
        "profile_id": message.profile_id,
        "account_id": message.account_id,
        "contact_email": message.contact_email,
        "direction": message.direction,
        "step": message.step,
        "subject": message.subject,
        "body": message.body,
        "esp_message_id": message.esp_message_id,
        "in_reply_to": message.in_reply_to,
        "intent": message.intent,
        "confidence": message.confidence,
        "auto_sent": bool(message.auto_sent),
        "status": message.status,
        "reviewed_at": message.reviewed_at.isoformat() if message.reviewed_at else None,
        "created_at": message.created_at.isoformat() if message.created_at else None,
        "sent_at": message.sent_at.isoformat() if message.sent_at else None,
    }
    if include_validation and validation is not None:
        data["validation"] = validation
    if routed is not None:
        data["routed"] = routed
    return data


def _thread_context_from_messages(messages: list[Message], profile: ICPProfile) -> dict[str, str]:
    latest_inbound = next((m for m in reversed(messages) if m.direction == "inbound"), None)
    context = _reply_context({}, profile)
    if latest_inbound:
        context["company_name"] = profile.company_name
    return context


def thread_detail(db: Session, thread_id: str) -> dict[str, Any]:
    messages = (
        db.query(Message)
        .filter(Message.thread_id == thread_id)
        .order_by(Message.created_at.asc())
        .all()
    )
    if not messages:
        raise ValueError("Thread not found")

    profile = _profile_or_404(db, messages[0].profile_id)
    context = _thread_context_from_messages(messages, profile)
    latest_inbound = next((m for m in reversed(messages) if m.direction == "inbound"), None)
    latest_outbound = next((m for m in reversed(messages) if m.direction == "outbound" and m.step == "reply"), None)
    routed = None
    if latest_inbound:
        routed = {
            "intent": latest_inbound.intent or "ambiguous",
            "confidence": float(latest_inbound.confidence or 0.5),
            "recommendedAction": "",
            "responseTemplate": "",
            "updatePipelineStage": "replied",
            "shouldSuppress": bool(latest_inbound.intent == "unsubscribe"),
            "source": "deterministic",
        }

    if latest_inbound and latest_outbound:
        draft = build_reply_draft(
            latest_inbound.body,
            {
                **context,
                "primary_leak_label": context.get("primary_leak_label") or "the leak we flagged",
            },
        )
        # Preserve any manual edits on the persisted draft.
        draft["subject"] = latest_outbound.subject
        draft["body"] = latest_outbound.body
        if "\n\n" in latest_outbound.body:
            draft["cta"] = latest_outbound.body.split("\n\n")[-1].strip()
        draft["validation"] = draft["validation"].copy()
        from services.replies import validate_reply_draft

        draft["validation"] = validate_reply_draft(
            {"subject": latest_outbound.subject, "body": latest_outbound.body, "cta": draft["cta"], "routed": routed or draft["routed"]},
            context,
        )
    elif latest_inbound:
        draft = build_reply_draft(latest_inbound.body, context)
    else:
        draft = None

    return {
        "thread_id": thread_id,
        "profile_id": messages[0].profile_id,
        "account_id": messages[0].account_id,
        "contact_email": messages[0].contact_email,
        "status": latest_outbound.status if latest_outbound else latest_inbound.status if latest_inbound else "open",
        "message_count": len(messages),
        "latest_message_at": messages[-1].created_at.isoformat() if messages[-1].created_at else None,
        "draft": {
            **draft,
            "status": latest_outbound.status if latest_outbound else (latest_inbound.status if latest_inbound else "open"),
        }
        if draft
        else None,
        "routed": routed,
        "messages": [_serialize_message(m, include_validation=False) for m in messages],
    }


def thread_summary(db: Session, thread_id: str) -> dict[str, Any]:
    detail = thread_detail(db, thread_id)
    return {k: v for k, v in detail.items() if k != "messages"}


def list_threads(db: Session, profile_id: int) -> dict[str, Any]:
    messages = (
        db.query(Message)
        .filter(Message.profile_id == profile_id)
        .order_by(Message.created_at.asc())
        .all()
    )
    by_thread: dict[str, list[Message]] = {}
    for message in messages:
        by_thread.setdefault(message.thread_id, []).append(message)
    return {
        "threads": [thread_detail(db, thread_id) | {"messages": []} for thread_id in sorted(by_thread.keys(), key=lambda tid: by_thread[tid][-1].created_at or _now(), reverse=True)]
    }


def _call_next_reply(reply_text: str, context: dict[str, str], account_id: str | None) -> dict[str, Any] | None:
    payload = {
        "replyText": reply_text,
        "accountId": account_id or "",
        "companyName": context["company_name"],
        "primaryLeakLabel": context["primary_leak_label"],
        "offerPathLabel": context["offer_path_label"],
        "firstConversionAction": context["first_conversion_action"],
    }
    return call_next_brain("/api/replies/converse", payload)


def _persist_reply_draft(
    db: Session,
    *,
    profile: ICPProfile,
    thread_id: str,
    contact_email: str,
    account_id: str | None,
    inbound_message: Message,
    draft: dict[str, Any],
    should_send: bool,
) -> tuple[Message, dict[str, Any]]:
    outbound = Message(
        thread_id=thread_id,
        profile_id=profile.id,
        account_id=account_id,
        contact_email=contact_email,
        direction="outbound",
        step="reply",
        subject=draft["subject"],
        body=draft["body"],
        status="sent" if should_send else "needs_review",
        intent=None,
        confidence=str(draft["routed"]["confidence"]),
        auto_sent=should_send,
        in_reply_to=inbound_message.esp_message_id or inbound_message.in_reply_to,
    )
    db.add(outbound)
    db.flush()
    return outbound, draft


def _send_reply(
    db: Session,
    *,
    profile: ICPProfile,
    outbound: Message,
    now: datetime,
) -> dict[str, Any]:
    link = unsubscribe_url(sends.public_base_url(), outbound.contact_email, profile.id)
    body = f"{outbound.body}{compliance_footer(link)}"
    result = esp_adapter.send_email(
        to=outbound.contact_email,
        subject=outbound.subject,
        body=body,
        reply_to=outbound.in_reply_to,
        headers={"List-Unsubscribe": f"<{link}>"},
    )
    if result["status"] == "sent":
        outbound.status = "sent"
        outbound.sent_at = now
        outbound.esp_message_id = result.get("id", "")
        outbound.auto_sent = True
        sends.record_send(db, profile.id, now)
        db.commit()
        return {"ok": True, "status": "sent", "message_id": outbound.id}

    outbound.status = "failed"
    db.commit()
    return {"ok": False, "status": "failed", "error": result.get("error", "send failed")}


def process_inbound_email(db: Session, payload: dict[str, Any]) -> dict[str, Any]:
    profile_id = int(payload.get("profile_id") or 0)
    profile = _profile_or_404(db, profile_id)
    thread_id, account_id = _find_existing_thread_id(db, profile_id, payload)
    context = _reply_context(payload, profile)
    now = _now()

    inbound = Message(
        thread_id=thread_id,
        profile_id=profile_id,
        account_id=account_id or payload.get("account_id"),
        contact_email=payload["contact_email"],
        direction="inbound",
        step="reply",
        subject=payload.get("subject") or "",
        body=payload.get("body") or "",
        in_reply_to=payload.get("in_reply_to") or payload.get("message_id"),
        intent=None,
        confidence=None,
        status="received",
    )
    db.add(inbound)
    db.flush()

    draft = _call_next_reply(inbound.body, context, account_id)
    if not draft:
        draft = build_reply_draft(inbound.body, context)

    if draft.get("routed", {}).get("shouldSuppress"):
        add_suppression(db, inbound.contact_email, profile_id, reason="unsubscribe")

    cap = sends.cap_remaining(db, profile_id, now)
    auto_send, reason = should_auto_send(
        validation_passed=bool(draft.get("validation", {}).get("passed")),
        suppressed=bool(draft.get("routed", {}).get("shouldSuppress")),
        cap_remaining=cap,
        confidence=float(draft.get("routed", {}).get("confidence") or 0),
        intent=str(draft.get("routed", {}).get("intent") or ""),
        grade=payload.get("grade"),
    )
    outbound, draft = _persist_reply_draft(
        db,
        profile=profile,
        thread_id=thread_id,
        contact_email=inbound.contact_email,
        account_id=account_id or payload.get("account_id"),
        inbound_message=inbound,
        draft=draft,
        should_send=auto_send,
    )
    inbound.intent = str(draft["routed"]["intent"])
    inbound.confidence = str(draft["routed"]["confidence"])
    inbound.reviewed_at = now

    if auto_send:
        send_result = _send_reply(db, profile=profile, outbound=outbound, now=now)
        if not send_result.get("ok"):
            auto_send = False
            reason = send_result.get("error", "send failed")
            outbound.status = "failed"
    else:
        db.commit()

    db.commit()
    return {
        "thread": thread_summary(db, thread_id),
        "decision": {"auto_send": auto_send, "reason": reason},
        "draft": draft,
    }


def apply_thread_action(db: Session, thread_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    messages = (
        db.query(Message)
        .filter(Message.thread_id == thread_id)
        .order_by(Message.created_at.asc())
        .all()
    )
    if not messages:
        raise ValueError("Thread not found")
    profile = _profile_or_404(db, messages[0].profile_id)
    latest_inbound = next((m for m in reversed(messages) if m.direction == "inbound"), None)
    latest_outbound = next((m for m in reversed(messages) if m.direction == "outbound" and m.step == "reply"), None)
    if not latest_outbound:
        raise ValueError("Thread has no reply draft")

    action = payload.get("action")
    subject = payload.get("subject")
    body = payload.get("body")
    cta = payload.get("cta")

    if subject:
        latest_outbound.subject = subject
    if body:
        latest_outbound.body = body
    if cta and body:
        latest_outbound.body = f"{body}\n\n{cta}"

    context = _reply_context({}, profile)
    draft = build_reply_draft(latest_inbound.body if latest_inbound else latest_outbound.body, context)
    validation = draft["validation"]
    from services.replies import validate_reply_draft

    validation = validate_reply_draft(
        {
            "subject": latest_outbound.subject,
            "body": latest_outbound.body,
            "cta": cta or draft["cta"],
            "routed": draft["routed"],
        },
        context,
    )
    if not validation["passed"] and action in {"send", "approve"}:
        raise ValueError("Draft failed validation")

    now = _now()
    if action in {"send", "approve"}:
        if is_suppressed(db, latest_outbound.contact_email, profile.id):
            latest_outbound.status = "skipped"
        else:
            send_result = _send_reply(db, profile=profile, outbound=latest_outbound, now=now)
            if not send_result.get("ok"):
                raise ValueError(send_result.get("error", "send failed"))
    elif action == "discard":
        latest_outbound.status = "skipped"
        db.commit()
    elif action == "edit":
        latest_outbound.status = "needs_review"
        db.commit()
    else:
        raise ValueError("Unknown thread action")

    db.commit()
    return thread_summary(db, thread_id)
