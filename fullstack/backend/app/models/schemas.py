from datetime import datetime, date
from typing import List, Optional, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field

class ClaimType(str, Enum):
    NUMERIC = "NUMERIC"
    PROMISE = "PROMISE"
    DATE = "DATE"
    GLOSSARY_TERM = "GLOSSARY_TERM"
    ENTITY_NAME = "ENTITY_NAME"
    IMAGE_TEXT = "IMAGE_TEXT"

class VerificationStatus(str, Enum):
    VERIFIED = "VERIFIED"
    FLAGGED = "FLAGGED"
    ABSTAIN = "ABSTAIN"
    PENDING = "PENDING"

class FactVisibility(str, Enum):
    PUBLIC = "PUBLIC"
    INTERNAL = "INTERNAL"
    CONFIDENTIAL = "CONFIDENTIAL"

class ReviewDecision(str, Enum):
    ACCEPT_FIX = "ACCEPT_FIX"
    DISPUTE = "DISPUTE"
    ASK_OWNER = "ASK_OWNER"
    OVERRIDE = "OVERRIDE"

# --- Fact Ledger Schemas ---

class FactBase(BaseModel):
    statement: str = Field(..., description="The verified factual statement")
    category: str = Field(..., description="E.g., Pricing, Security, SLA, Nomenclature")
    fact_owner: str = Field(..., description="Name or email of the fact owner")
    source: str = Field(..., description="URL, doc reference, or legal policy cite")
    expiry_date: Optional[date] = Field(None, description="Expiry date after which fact is stale")
    visibility: FactVisibility = FactVisibility.PUBLIC
    tags: List[str] = []

class FactCreate(FactBase):
    pass

class FactUpdate(BaseModel):
    statement: Optional[str] = None
    category: Optional[str] = None
    fact_owner: Optional[str] = None
    source: Optional[str] = None
    expiry_date: Optional[date] = None
    visibility: Optional[FactVisibility] = None
    tags: Optional[List[str]] = None
    change_reason: Optional[str] = "Fact updated by brand manager"

class FactVersionResponse(BaseModel):
    version_number: int
    statement: str
    updated_by: str
    change_reason: str
    created_at: datetime

class FactResponse(FactBase):
    id: str
    version: int
    is_active: bool
    is_expired: bool
    created_at: datetime
    updated_at: datetime
    versions: List[FactVersionResponse] = []

    class Config:
        from_attributes = True

# --- Claim Extraction & Verification Schemas ---

class ClaimSpan(BaseModel):
    id: str
    text: str
    claim_type: ClaimType
    start_pos: int
    end_pos: int
    context: str

class VerificationResult(BaseModel):
    claim_id: str
    claim_text: str
    claim_type: ClaimType
    start_pos: int
    end_pos: int
    status: VerificationStatus
    confidence: float
    source_id: Optional[str] = None
    source_quote: Optional[str] = None
    source_owner: Optional[str] = None
    suggested_fix: Optional[str] = None
    explanation: str
    validator_confirmed: bool = False
    routed_to_owner: bool = False

# --- Review & Workflow Schemas ---

class HumanReviewAction(BaseModel):
    claim_id: str
    decision: ReviewDecision
    reviewer_role: str = Field(..., description="writer, brand_manager, or fact_owner")
    reviewer_name: str
    comment: Optional[str] = None
    override_reason: Optional[str] = None
    # Context so decisions survive re-verification (claim ids are regenerated on every run)
    draft_id: Optional[str] = None
    claim_text: Optional[str] = None
    claim_type: Optional[str] = None
    source_id: Optional[str] = None
    source_owner: Optional[str] = None

class OwnerResponse(BaseModel):
    ticket_id: str
    response: str = Field(..., description="CONFIRMED_CLAIM, CONFIRMED_FACT, or UPDATE_FACT")
    owner_name: str
    note: Optional[str] = None

class AuditLogEntry(BaseModel):
    id: str
    action_type: str
    actor: str
    role: str
    timestamp: datetime
    details: Dict[str, Any]

# --- Guard API Request & Response ---

class GuardRequest(BaseModel):
    draft_id: Optional[str] = None
    title: Optional[str] = "Untitled Draft"
    content: str = Field(..., description="Draft text or AI-generated output to verify")
    author: Optional[str] = "AI Assistant / Content Author"
    channel: Optional[str] = "Web / Blog / Social"

class GuardResponse(BaseModel):
    draft_id: str
    total_claims: int
    verified_claims: int
    flagged_claims: int
    abstained_claims: int
    trust_score: float = Field(..., description="Score 0.0 to 100.0 based on verified facts")
    claims: List[VerificationResult]
    can_publish: bool
    audit_summary: str

# --- Published Claims & Reverse Check Schemas ---

class PublishDraftRequest(BaseModel):
    draft_id: str
    title: str
    content: str
    channel: str
    publisher: str
    claims_verified: List[str] = Field(..., description="List of claim IDs accepted")

class PublishedAssetResponse(BaseModel):
    id: str
    draft_id: str
    title: str
    channel: str
    published_at: datetime
    status: str
    claims_count: int
    linked_fact_versions: Dict[str, int] = Field(default_factory=dict, description="fact_id -> version_number")

class ReverseCheckAlert(BaseModel):
    published_asset_id: str
    asset_title: str
    channel: str
    fact_id: str
    fact_statement: str
    old_version_used: int
    current_version: int
    outdated_claim_text: str
    recommended_action: str
    stale_since: datetime
