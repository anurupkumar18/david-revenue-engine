import json
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from database import Base


class ICPProfile(Base):
    __tablename__ = "icp_profiles"

    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String(255), nullable=False)
    fields_json = Column(Text, nullable=False, default="{}")
    confidence_json = Column(Text, nullable=False, default="{}")
    status = Column(String(50), default="draft")  # draft, accepted, rejected
    revenue_state_json = Column(Text, nullable=False, default="{}")
    # Phase 2: the workspace owner. Nullable so existing rows (and the keyless demo)
    # keep working; populated for real multi-customer accounts when auth is enabled.
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    contacts = relationship("ICPContact", back_populates="profile", cascade="all, delete-orphan")
    outreach_items = relationship("OutreachQueue", back_populates="profile", cascade="all, delete-orphan")

    @property
    def fields(self) -> dict:
        return json.loads(self.fields_json or "{}")

    @fields.setter
    def fields(self, value: dict):
        self.fields_json = json.dumps(value)

    @property
    def confidence(self) -> dict:
        return json.loads(self.confidence_json or "{}")

    @confidence.setter
    def confidence(self, value: dict):
        self.confidence_json = json.dumps(value)

    @property
    def revenue_state(self) -> dict:
        return json.loads(self.revenue_state_json or "{}")

    @revenue_state.setter
    def revenue_state(self, value: dict):
        self.revenue_state_json = json.dumps(value)


class ICPContact(Base):
    __tablename__ = "icp_contacts"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("icp_profiles.id"), nullable=False)
    company_name = Column(String(255), nullable=False)
    industry = Column(String(100))
    decision_maker_name = Column(String(255))
    title = Column(String(255))
    email = Column(String(255))
    phone = Column(String(100))
    linkedin_search_url = Column(Text)
    website_url = Column(Text)
    verification_status = Column(String(50), default="needs_manual")
    source_url = Column(Text)
    hook_angle = Column(Text)
    status = Column(String(50), default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)

    profile = relationship("ICPProfile", back_populates="contacts")
    outreach_items = relationship("OutreachQueue", back_populates="contact", cascade="all, delete-orphan")


class OutreachQueue(Base):
    __tablename__ = "outreach_queue"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("icp_profiles.id"), nullable=False)
    contact_id = Column(Integer, ForeignKey("icp_contacts.id"), nullable=False)
    name = Column(String(255))
    company = Column(String(255))
    title = Column(String(255))
    email = Column(String(255))
    phone = Column(String(100))
    linkedin_search_url = Column(Text)
    connection_note = Column(Text)
    status = Column(String(50), default="pending")  # pending, opened, connected, skipped
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    opened_at = Column(DateTime)
    connected_at = Column(DateTime)

    profile = relationship("ICPProfile", back_populates="outreach_items")
    contact = relationship("ICPContact", back_populates="outreach_items")


# ---------------------------------------------------------------------------
# Phase 2: accounts, threaded messages, send queue, suppression, caps, briefs.
# All optional/gated — the keyless demo never requires these to be populated.
# ---------------------------------------------------------------------------


class User(Base):
    """Workspace owner (the agency operator). Auth is bypassed in demo mode."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False, default="")
    name = Column(String(255), default="")
    is_demo = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Message(Base):
    """A single threaded outbound or inbound email tied to a campaign + prospect."""

    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    thread_id = Column(String(64), nullable=False, index=True)
    profile_id = Column(Integer, ForeignKey("icp_profiles.id"), nullable=False, index=True)
    account_id = Column(String(64))  # seed/lib account id (prospect)
    contact_email = Column(String(255), index=True)
    direction = Column(String(16), nullable=False)  # outbound | inbound
    step = Column(String(16), default="reply")  # "1" | "2" | "reply"
    subject = Column(Text, default="")
    body = Column(Text, default="")
    esp_message_id = Column(String(255))
    in_reply_to = Column(String(255))
    intent = Column(String(64))  # inbound: classified ReplyIntent
    confidence = Column(String(16))  # stored as text to avoid float drift
    auto_sent = Column(Boolean, default=False)
    status = Column(String(32), default="queued")  # queued|sent|delivered|failed|received
    reviewed_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    sent_at = Column(DateTime)


class SendJob(Base):
    """A scheduled outbound send drained by the scheduler under daily caps."""

    __tablename__ = "send_jobs"

    id = Column(Integer, primary_key=True, index=True)
    thread_id = Column(String(64), index=True)
    profile_id = Column(Integer, ForeignKey("icp_profiles.id"), nullable=False, index=True)
    account_id = Column(String(64))
    contact_email = Column(String(255))
    step = Column(String(16), default="1")  # "1" | "2" | "reply"
    scheduled_at = Column(DateTime, nullable=False, index=True)
    # pending | approved | needs_review | sent | skipped | failed
    status = Column(String(32), default="pending", index=True)
    draft_message_id = Column(Integer, ForeignKey("messages.id"))
    auto = Column(Boolean, default=True)
    attempts = Column(Integer, default=0)
    last_error = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)


class Suppression(Base):
    """Opt-out / suppression list. profile_id NULL == global suppression."""

    __tablename__ = "suppressions"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), nullable=False, index=True)
    profile_id = Column(Integer, ForeignKey("icp_profiles.id"), nullable=True, index=True)
    reason = Column(String(255), default="unsubscribe")
    created_at = Column(DateTime, default=datetime.utcnow)


class DailySendCount(Base):
    """Per-customer per-day send tally for cap enforcement."""

    __tablename__ = "daily_send_counts"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("icp_profiles.id"), nullable=False, index=True)
    date = Column(String(10), nullable=False, index=True)  # YYYY-MM-DD
    count = Column(Integer, default=0)


class Brief(Base):
    """A stored daily/weekly stats-&-insights brief per customer."""

    __tablename__ = "briefs"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("icp_profiles.id"), nullable=False, index=True)
    period = Column(String(16), nullable=False)  # daily | weekly
    period_start = Column(String(10))  # YYYY-MM-DD
    period_end = Column(String(10))
    metrics_json = Column(Text, nullable=False, default="{}")
    recommendations_json = Column(Text, nullable=False, default="[]")
    narrative = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    @property
    def metrics(self) -> dict:
        return json.loads(self.metrics_json or "{}")

    @metrics.setter
    def metrics(self, value: dict):
        self.metrics_json = json.dumps(value)

    @property
    def recommendations(self) -> list:
        return json.loads(self.recommendations_json or "[]")

    @recommendations.setter
    def recommendations(self, value: list):
        self.recommendations_json = json.dumps(value)
