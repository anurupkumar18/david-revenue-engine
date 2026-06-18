"""CAN-SPAM / GDPR compliance helpers: unsubscribe tokens, suppression checks, footer.

The suppression list is the hard gate checked before every send (scheduled or reply).
Unsubscribe links carry a signed token so the one-click endpoint needs no session.
"""

import os

from sqlalchemy import or_
from sqlalchemy.orm import Session

from models import Suppression
from services.security import sign, unsign

DEFAULT_POSTAL_ADDRESS = "GTM Campaign Builder, 123 Demo Street, San Francisco, CA 94105"


def unsubscribe_token(email: str, profile_id: int | None) -> str:
    return sign({"e": email.lower().strip(), "p": profile_id, "k": "unsub"})


def verify_unsubscribe_token(token: str) -> tuple[str, int | None] | None:
    data = unsign(token)
    if not data or data.get("k") != "unsub" or not data.get("e"):
        return None
    return data["e"], data.get("p")


def unsubscribe_url(base_url: str, email: str, profile_id: int | None) -> str:
    token = unsubscribe_token(email, profile_id)
    return f"{base_url.rstrip('/')}/api/unsubscribe?token={token}"


def is_suppressed(db: Session, email: str, profile_id: int | None) -> bool:
    """True if the email is globally suppressed or suppressed for this customer."""
    email = (email or "").lower().strip()
    if not email:
        return False
    q = db.query(Suppression).filter(Suppression.email == email)
    if profile_id is not None:
        q = q.filter(or_(Suppression.profile_id == None, Suppression.profile_id == profile_id))  # noqa: E711
    return db.query(q.exists()).scalar()


def add_suppression(
    db: Session, email: str, profile_id: int | None, reason: str = "unsubscribe"
) -> Suppression:
    email = (email or "").lower().strip()
    existing = (
        db.query(Suppression)
        .filter(Suppression.email == email, Suppression.profile_id == profile_id)
        .first()
    )
    if existing:
        return existing
    row = Suppression(email=email, profile_id=profile_id, reason=reason)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def postal_address() -> str:
    return os.environ.get("COMPANY_POSTAL_ADDRESS") or DEFAULT_POSTAL_ADDRESS


def compliance_footer(unsubscribe_link: str) -> str:
    """CAN-SPAM footer appended to every outbound email."""
    return (
        f"\n\n—\n{postal_address()}\n"
        f"You're receiving this because of a business inquiry. "
        f"Unsubscribe: {unsubscribe_link}"
    )
