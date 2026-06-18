"""Deterministic reply helpers for the FastAPI spine.

The Next.js reply-conversation route is the primary brain path. This module mirrors the
same keyword routing and compact reply drafting so the backend can still function when
the Next app is not reachable during tests or local demo runs.
"""

from __future__ import annotations

import re
from typing import TypedDict


class ReplyContext(TypedDict, total=False):
    company_name: str
    primary_leak_label: str
    offer_path_label: str
    first_conversion_action: str


class RoutedReply(TypedDict):
    intent: str
    confidence: float
    recommendedAction: str
    responseTemplate: str
    updatePipelineStage: str
    shouldSuppress: bool
    source: str


class ReplyDraft(TypedDict):
    subject: str
    body: str
    cta: str
    routed: RoutedReply
    validation: dict
    source: str


SENSITIVE_REPLY_INTENTS = {"objection_no_time", "not_interested", "wrong_person", "ambiguous"}


def _fill(ctx: ReplyContext | None = None) -> dict[str, str]:
    ctx = ctx or {}
    return {
        "company_name": ctx.get("company_name") or "your team",
        "primary_leak_label": ctx.get("primary_leak_label") or "primary leak",
        "offer_path_label": ctx.get("offer_path_label") or "the right campaign angle",
        "first_conversion_action": ctx.get("first_conversion_action") or "a short teardown.",
    }


def should_auto_send(
    *,
    validation_passed: bool,
    suppressed: bool,
    cap_remaining: int,
    confidence: float | None = None,
    intent: str | None = None,
    grade: str | None = None,
) -> tuple[bool, str]:
    if suppressed:
        return False, "Recipient is suppressed - do not send."
    if not validation_passed:
        return False, "Copy failed compliance validation - needs review."
    if cap_remaining <= 0:
        return False, "Daily send cap reached - held for the next window."
    if intent in SENSITIVE_REPLY_INTENTS:
        return False, "Sensitive reply intent - needs human review."
    if confidence is not None and confidence < 0.9:
        return False, f"Confidence {confidence} below 0.9 - needs review."
    if grade == "D":
        return False, "Low-fit account (grade D) - needs review."
    return True, "Clean, high-confidence send."


RULES: list[dict[str, object]] = [
    {
        "intent": "unsubscribe",
        "test": re.compile(
            r"\b(unsubscribe|remove me|take me off|opt[- ]?out|stop (contacting|emailing|messaging)|do not (contact|email)|don'?t contact)\b",
            re.I,
        ),
        "confidence": 0.97,
        "stage": "suppressed",
        "suppress": True,
        "action": "Suppress immediately. Do not generate persuasive follow-up.",
        "template": lambda ctx: "Understood - I'll make sure you are not contacted again.",
        "subject": "re: no more emails",
        "cta": "No further action needed?",
    },
    {
        "intent": "out_of_office",
        "test": re.compile(r"\b(out of office|ooo|on vacation|on holiday|annual leave|away until|back (on|next)|maternity|paternity)\b", re.I),
        "confidence": 0.9,
        "stage": "nurture",
        "suppress": False,
        "action": "Schedule a follow-up for when they return.",
        "template": lambda ctx: f"Thanks for the note. I'll follow up when you're back and keep it to the {ctx['offer_path_label']} angle for {ctx['company_name']}. Should I check back then?",
        "subject": "re: when back",
        "cta": "Should I check back then?",
    },
    {
        "intent": "wrong_person",
        "test": re.compile(r"\b(wrong person|not (the )?right (person|one)|do(n'?t| not) handle|not my (area|department|role)|you should (talk|speak|reach)|forward this|office manager|talk to our)\b", re.I),
        "confidence": 0.88,
        "stage": "replied",
        "suppress": False,
        "action": "Ask for a referral to the owner of this function.",
        "template": lambda ctx: f"Thanks for pointing me to the right person. Who owns {ctx['primary_leak_label']} or {ctx['offer_path_label']} on your side?",
        "subject": "re: right contact",
        "cta": "Who owns it on your side?",
    },
    {
        "intent": "asks_for_info",
        "test": re.compile(r"\b(more info|send (me )?(some |more )?info|details|pricing|how (does|much|would)|learn more|case study|case studies|deck|tell me more|what (do|does|is)|send (me )?(a |the )?(link|overview))\b", re.I),
        "confidence": 0.9,
        "stage": "info_sent",
        "suppress": False,
        "action": "Send the most relevant campaign brief or a short explanation.",
        "template": lambda ctx: f"Of course - the short version is that this campaign targets {ctx['primary_leak_label']} through {ctx['offer_path_label']}. I can send a 3-bullet breakdown of the first step. Want the short version?",
        "subject": "re: the details",
        "cta": "Want the short version?",
    },
    {
        "intent": "objection_no_time",
        "test": re.compile(r"\b(too busy|no time|not (a )?(good )?time|swamped|slammed|maybe later|next (quarter|month|year)|not right now|circle back|busy right now|reach out later)\b", re.I),
        "confidence": 0.85,
        "stage": "objection",
        "suppress": False,
        "action": "Reduce the ask - offer an async teardown instead of a call.",
        "template": lambda ctx: f"Completely fair. I can send an async teardown focused on {ctx['primary_leak_label']} instead of a call. Worth sending?",
        "subject": "re: async teardown",
        "cta": "Worth sending?",
    },
    {
        "intent": "not_interested",
        "test": re.compile(r"\b(not interested|no thanks|no thank you|we'?re (all )?set|already have|we pass|not for us|not a fit)\b", re.I),
        "confidence": 0.85,
        "stage": "nurture",
        "suppress": False,
        "action": "Acknowledge and ask permission to share an idea later.",
        "template": lambda ctx: f"Totally understood. I'll leave it there; if useful later, I can send one idea on {ctx['primary_leak_label']}. Should I circle back another time?",
        "subject": "re: understood",
        "cta": "Should I circle back another time?",
    },
    {
        "intent": "positive_call",
        "test": re.compile(r"\b(sure|happy to|sounds good|let'?s (chat|talk|do it)|yes|interested|what times?|works for me|set (up|something)|grab (a )?(call|time)|book|calendar|when (are|can|works)|love to)\b", re.I),
        "confidence": 0.92,
        "stage": "meeting_ready",
        "suppress": False,
        "action": "Send a calendar link framed around the recommended campaign angle.",
        "template": lambda ctx: f"Sounds good - I can frame the next step around {ctx['offer_path_label']} and the {ctx['primary_leak_label']} we flagged. Would Tuesday or Wednesday work?",
        "subject": "re: next step",
        "cta": "Would Tuesday or Wednesday work?",
    },
]


def route_reply(reply_text: str, context: ReplyContext | None = None) -> RoutedReply:
    ctx = _fill(context)
    text = reply_text.strip()

    for rule in RULES:
        if rule["test"].search(text):  # type: ignore[index]
            return {
                "intent": rule["intent"],  # type: ignore[index]
                "confidence": rule["confidence"],  # type: ignore[index]
                "recommendedAction": rule["action"],  # type: ignore[index]
                "responseTemplate": rule["template"](ctx),  # type: ignore[index]
                "updatePipelineStage": rule["stage"],  # type: ignore[index]
                "shouldSuppress": rule["suppress"],  # type: ignore[index]
                "source": "deterministic",
            }

    return {
        "intent": "ambiguous",
        "confidence": 0.5,
        "recommendedAction": "Low confidence - route to human review before replying.",
        "responseTemplate": f"Thanks for the reply. Just so I point you to the right thing - is {ctx['primary_leak_label']} something worth a quick look, or should I follow up another time?",
        "updatePipelineStage": "replied",
        "shouldSuppress": False,
        "source": "deterministic",
    }


def _count_words(text: str) -> int:
    return len([word for word in text.strip().split() if word])


def _references_leak(body: str, label: str | None) -> bool:
    if not label:
        return False
    return label.lower().strip() in body.lower()


def validate_reply_draft(draft: dict, context: ReplyContext | None = None) -> dict:
    if draft["routed"]["shouldSuppress"]:
        return {
            "subjectLowercase": True,
            "subjectWordCountOk": True,
            "bodyUnder100Words": True,
            "hasLowFrictionCta": True,
            "referencesLeak": True,
            "noInventedClaims": True,
            "passed": True,
            "warnings": [],
        }

    ctx = _fill(context)
    subject = draft["subject"]
    body = draft["body"]
    cta = draft["cta"]
    subject_lowercase = subject == subject.lower()
    subject_words = 2 <= _count_words(subject) <= 4
    body_ok = _count_words(body) < 100
    cta_ok = cta.strip().endswith("?") and _count_words(cta) <= 20
    refs = _references_leak(body, ctx["primary_leak_label"])
    no_claims = not any(
        pattern.search(body)
        for pattern in (
            re.compile(r"noticed (you|your)[^.]*\b(hiring|github|repo|reviews?)", re.I),
            re.compile(r"saw your (github|repo|recent post)", re.I),
            re.compile(r"your reviews are (poor|bad|terrible)", re.I),
            re.compile(r"loved your recent post", re.I),
            re.compile(r"\bguaranteed\b", re.I),
            re.compile(r"\b10x\b", re.I),
        )
    )

    warnings = []
    if not subject_lowercase:
        warnings.append("Subject should be lowercase.")
    if not subject_words:
        warnings.append("Subject should be 2-4 words.")
    if not body_ok:
        warnings.append("Body should be under 100 words.")
    if not cta_ok:
        warnings.append("CTA should be a short, low-friction question.")
    if not refs:
        warnings.append("Body should reference the detected leak.")
    if not no_claims:
        warnings.append("Body may contain an unverifiable claim.")

    return {
        "subjectLowercase": subject_lowercase,
        "subjectWordCountOk": subject_words,
        "bodyUnder100Words": body_ok,
        "hasLowFrictionCta": cta_ok,
        "referencesLeak": refs,
        "noInventedClaims": no_claims,
        "passed": subject_lowercase and subject_words and body_ok and cta_ok and refs and no_claims,
        "warnings": warnings,
    }


def build_reply_draft(reply_text: str, context: ReplyContext | None = None) -> ReplyDraft:
    ctx = _fill(context)
    routed = route_reply(reply_text, ctx)
    template = next(rule for rule in RULES if rule["intent"] == routed["intent"])  # type: ignore[index]
    draft = {
        "subject": template["subject"],  # type: ignore[index]
        "body": template["template"](ctx),  # type: ignore[index]
        "cta": template["cta"],  # type: ignore[index]
    }
    return {
        **draft,
        "routed": routed,
        "validation": validate_reply_draft({**draft, "routed": routed}, ctx),
        "source": "deterministic",
    }
