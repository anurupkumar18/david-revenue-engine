import json
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
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
