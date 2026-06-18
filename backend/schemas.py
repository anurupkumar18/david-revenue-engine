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
