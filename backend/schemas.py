from pydantic import BaseModel
from typing import Any


class ScrapeRequest(BaseModel):
    url: str


class ProfileCreate(BaseModel):
    fields: dict[str, Any]
    confidence: dict[str, str] = {}
    status: str = "draft"


class ProfileUpdate(BaseModel):
    fields: dict[str, Any] | None = None
    confidence: dict[str, str] | None = None
    status: str | None = None


class OutreachExportRequest(BaseModel):
    profile_id: int


class SignupRequest(BaseModel):
    email: str
    password: str
    name: str = ""


class LoginRequest(BaseModel):
    email: str
    password: str


class SequenceStepPayload(BaseModel):
    subject: str
    body: str
    validated: bool = True


class SequenceSendPayload(BaseModel):
    account_id: str = ""
    contact_email: str
    grade: str | None = None
    step1: SequenceStepPayload
    step2: SequenceStepPayload | None = None


class StartSequenceRequest(BaseModel):
    sends: list[SequenceSendPayload]


class InboundEmailRequest(BaseModel):
    profile_id: int | None = None
    account_id: str | None = None
    contact_email: str
    subject: str = ""
    body: str = ""
    in_reply_to: str | None = None
    message_id: str | None = None
    company_name: str | None = None
    primary_leak_label: str | None = None
    offer_path_label: str | None = None
    first_conversion_action: str | None = None
    grade: str | None = None


class ThreadActionRequest(BaseModel):
    action: str
    subject: str | None = None
    body: str | None = None
    cta: str | None = None


class BriefRunRequest(BaseModel):
    period: str = "daily"


class ContactResponse(BaseModel):
    id: int
    profile_id: int
    company_name: str
    industry: str | None
    decision_maker_name: str | None
    title: str | None
    email: str | None
    phone: str | None
    linkedin_search_url: str | None
    website_url: str | None
    verification_status: str
    source_url: str | None
    hook_angle: str | None
    status: str

    class Config:
        from_attributes = True


class RevenueStateUpdate(BaseModel):
    accounts: list[Any] = []
    loadedScenario: str | None = None
    strategy: Any | None = None
    campaign: Any | None = None
    outreachByAccount: dict[str, Any] = {}
    lastRouted: Any | None = None


class ProfileResponse(BaseModel):
    id: int
    company_name: str
    fields: dict[str, Any]
    confidence: dict[str, str]
    status: str
    created_at: str
    contacts: list[ContactResponse] = []

    class Config:
        from_attributes = True
