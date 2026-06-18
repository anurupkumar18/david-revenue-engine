"""Brief generation helpers for the FastAPI spine."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from models import Brief, ICPProfile, Message, SendJob, Suppression
from services.next_bridge import call_next_brain


def _normalize_counts(counts: dict[str, Any] | None) -> dict[str, int]:
    counts = counts or {}
    return {
        "sent": int(counts.get("sent") or 0),
        "inbound": int(counts.get("inbound") or 0),
        "routed": int(counts.get("routed") or 0),
        "positive": int(counts.get("positive") or 0),
        "meetings": int(counts.get("meetings") or 0),
        "badFits": int(counts.get("badFits") or 0),
        "approvals": int(counts.get("approvals") or 0),
        "edits": int(counts.get("edits") or 0),
        "suppressed": int(counts.get("suppressed") or 0),
    }


def period_window(period: str, now: datetime | None = None) -> tuple[datetime, datetime]:
    now = now or datetime.utcnow()
    if period == "weekly":
        start = now - timedelta(days=now.weekday())
        start = start.replace(hour=0, minute=0, second=0, microsecond=0)
    else:
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    return start, now


def _campaign_from_profile(profile: ICPProfile) -> dict[str, Any]:
    state = profile.revenue_state or {}
    campaign = state.get("campaign") or {}
    if campaign:
        return campaign
    return {
        "metrics": {
            "winningSignal": "missed calls",
            "commonObjection": "No budget for a new workflow right now",
        },
        "learningInsights": {
            "winningSignal": "missed calls",
            "commonObjection": "No budget for a new workflow right now",
            "nextCampaignRecommendation": "Lead with the strongest leak and keep reply routing ahead of sending.",
        },
        "agencyWorkspace": {"clientName": profile.company_name},
    }


def aggregate_brief_counts(db, profile_id: int, start: datetime, end: datetime) -> dict[str, int]:
    sent = (
        db.query(Message)
        .filter(
            Message.profile_id == profile_id,
            Message.direction == "outbound",
            Message.status == "sent",
            Message.sent_at >= start,
            Message.sent_at <= end,
        )
        .count()
    )
    inbound_messages = (
        db.query(Message)
        .filter(
            Message.profile_id == profile_id,
            Message.direction == "inbound",
            Message.created_at >= start,
            Message.created_at <= end,
        )
        .all()
    )
    routed = len([m for m in inbound_messages if m.intent])
    positive = len([m for m in inbound_messages if m.intent == "positive_call"])
    meetings = positive
    bad_fits = len([m for m in inbound_messages if m.intent in {"not_interested", "objection_no_time", "wrong_person"}])
    suppressed = (
        db.query(Suppression)
        .filter(Suppression.created_at >= start, Suppression.created_at <= end, Suppression.profile_id == profile_id)
        .count()
    )
    approvals = (
        db.query(SendJob)
        .filter(
            SendJob.profile_id == profile_id,
            SendJob.status == "approved",
            SendJob.created_at >= start,
            SendJob.created_at <= end,
        )
        .count()
    )
    edits = len([m for m in inbound_messages if m.reviewed_at is not None])
    return {
        "sent": sent,
        "inbound": len(inbound_messages),
        "routed": routed,
        "positive": positive,
        "meetings": meetings,
        "badFits": bad_fits,
        "approvals": approvals,
        "edits": edits,
        "suppressed": suppressed,
    }


def build_brief_local(
    *,
    period: str,
    period_start: str,
    period_end: str,
    counts: dict[str, Any],
    campaign: dict[str, Any],
    client_name: str,
) -> dict[str, Any]:
    counts = _normalize_counts(counts)
    metrics = campaign.get("metrics") or {}
    learning = campaign.get("learningInsights") or {}
    winning_signal = learning.get("winningSignal") or metrics.get("winningSignal") or "missed calls"
    common_objection = learning.get("commonObjection") or metrics.get("commonObjection") or "No budget for a new workflow right now"
    next_campaign = learning.get("nextCampaignRecommendation") or "Lead with the strongest leak and keep reply routing ahead of sending."
    reply_rate = f"{round((counts['inbound'] / counts['sent']) * 100) if counts['sent'] else 0}%"
    route_rate = f"{round((counts['routed'] / counts['inbound']) * 100) if counts['inbound'] else 0}%"

    narrative = (
        f"{period.title()} brief for {client_name}. "
        f"{counts['sent']} sends produced {counts['inbound']} inbound replies ({reply_rate}) and "
        f"{counts['routed']} routed replies ({route_rate}). "
        f"Suppressed threads held at {counts['suppressed']}; the current winning signal remains {winning_signal}. "
        f"Common objection: {common_objection}."
    )

    recommendations = [
        str(next_campaign),
        f"Keep the first-line hook anchored on {winning_signal}.",
        f"Protect the \"{common_objection}\" suppression rule before scaling volume.",
    ]
    if counts["edits"] > 0 or counts["approvals"] > 0:
        recommendations.append(
            f"Track {counts['edits']} edited drafts against {counts['approvals']} approvals to keep the human-review loop tight."
        )

    return {
        "period": period,
        "periodStart": period_start,
        "periodEnd": period_end,
        "clientName": client_name,
        "counts": counts,
        "metrics": metrics,
        "learningInsights": {
            "winningSignal": winning_signal,
            "commonObjection": common_objection,
            "nextCampaignRecommendation": next_campaign,
        },
        "narrative": narrative,
        "recommendations": recommendations,
        "source": "deterministic",
    }


def generate_brief(
    *,
    db,
    profile: ICPProfile,
    period: str,
    now: datetime | None = None,
) -> dict[str, Any]:
    start, end = period_window(period, now)
    campaign = _campaign_from_profile(profile)
    counts = aggregate_brief_counts(db, profile.id, start, end)
    payload = {
        "period": period,
        "periodStart": start.date().isoformat(),
        "periodEnd": end.date().isoformat(),
        "clientName": campaign.get("agencyWorkspace", {}).get("clientName") or profile.company_name,
        "counts": counts,
        "campaign": campaign,
    }

    llm = call_next_brain("/api/briefs/generate", payload)
    if llm and isinstance(llm, dict):
        narrative = str(llm.get("narrative") or "").strip()
        recommendations = [str(item).strip() for item in llm.get("recommendations") or [] if str(item).strip()]
        if narrative and recommendations:
            base = build_brief_local(
                period=period,
                period_start=payload["periodStart"],
                period_end=payload["periodEnd"],
                counts=counts,
                campaign=campaign,
                client_name=payload["clientName"],
            )
            return {**base, "narrative": narrative, "recommendations": recommendations, "source": "llm"}

    return build_brief_local(
        period=period,
        period_start=payload["periodStart"],
        period_end=payload["periodEnd"],
        counts=counts,
        campaign=campaign,
        client_name=payload["clientName"],
    )
