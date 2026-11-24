import base64
import uuid
from typing import List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, Header, HTTPException
from ..config import settings
from sqlalchemy.orm import Session
from ..models.database import get_db, Fact
from ..models.schemas import (
    GuardRequest, GuardResponse, VerificationResult,
    VerificationStatus, ClaimSpan
)
from ..core.extractor import extractor
from ..core.rules_engine import rules_engine
from ..core.retriever import retriever
from ..core.verifier import verifier
from ..core.validator import validator
from ..core.ocr_service import ocr_service

router = APIRouter(prefix="/guard", tags=["Guard API"])

def require_key(x_brandledger_key: Optional[str] = Header(default=None)):
    """If GUARD_API_KEY is configured on the server, callers must send it."""
    if settings.GUARD_API_KEY and x_brandledger_key != settings.GUARD_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing X-BrandLedger-Key")

class GuardImageRequest(BaseModel):
    title: Optional[str] = "Uploaded Visual Creative"
    image_base64: str = Field(..., description="Base64 encoded image string (PNG/JPEG)")

def run_verification_pipeline(text: str, db: Session, draft_id: str = None) -> GuardResponse:
    if not draft_id:
        draft_id = f"draft_{uuid.uuid4().hex[:8]}"

    # Step 1: Claim Extraction
    claims: List[ClaimSpan] = extractor.extract_claims(text)

    # Fetch all active facts
    all_facts: List[Fact] = db.query(Fact).filter(Fact.is_active == True).all()
    facts_by_id = {f.id: f for f in all_facts}

    results: List[VerificationResult] = []

    for claim in claims:
        # Step 2: Exact Rules Engine First
        rule_result = rules_engine.evaluate_rule(claim, all_facts)
        if rule_result:
            validated = validator.validate_result(rule_result, facts_by_id)
            results.append(validated)
            continue

        # Step 3: pgvector Semantic Retrieval of Approved, Unexpired Facts
        candidate_facts = retriever.retrieve_candidates(claim.context, all_facts, top_k=3)

        # Step 4: Cite-or-Abstain LLM Verifier
        verif_result = verifier.verify_claim(claim, candidate_facts)

        # Step 5: Source and Quote Existence Validation
        validated = validator.validate_result(verif_result, facts_by_id)
        results.append(validated)

    # Calculate Trust Score
    total = len(results)
    verified = sum(1 for r in results if r.status == VerificationStatus.VERIFIED)
    flagged = sum(1 for r in results if r.status == VerificationStatus.FLAGGED)
    abstained = sum(1 for r in results if r.status == VerificationStatus.ABSTAIN)

    if total == 0:
        trust_score = 100.0
    else:
        # Weighted score: verified=100%, abstain=50% (pending owner review), flagged=0%
        raw_score = (verified * 1.0 + abstained * 0.5) / total * 100.0
        trust_score = round(raw_score, 1)

    can_publish = (flagged == 0 and abstained == 0)

    summary = (
        f"Verified {verified}/{total} claims. {flagged} policy or factual flags detected. "
        f"{abstained} claim(s) routed to Fact Owners for confirmation."
    )

    return GuardResponse(
        draft_id=draft_id,
        total_claims=total,
        verified_claims=verified,
        flagged_claims=flagged,
        abstained_claims=abstained,
        trust_score=trust_score,
        claims=results,
        can_publish=can_publish,
        audit_summary=summary
    )

@router.post("", response_model=GuardResponse, dependencies=[Depends(require_key)])
def guard_check(request: GuardRequest, db: Session = Depends(get_db)):
    """
    Core /guard endpoint for AI tools, CI/CD, and Chrome extension.
    Accepts draft content and returns real-time claim breakdown,
    flagged issues with suggested fixes, and brand trust score.
    """
    return run_verification_pipeline(request.content, db, request.draft_id)

@router.post("/ocr", response_model=GuardResponse, dependencies=[Depends(require_key)])
def guard_ocr_check(request: GuardImageRequest, db: Session = Depends(get_db)):
    """
    On-premise OCR Verification:
    Decodes base64 image data, runs OCR extraction via Tesseract + OpenCV on-premise,
    and executes the full claim verification pipeline.
    """
    raw_b64 = request.image_base64
    if "," in raw_b64:
        raw_b64 = raw_b64.split(",")[1]
    image_bytes = base64.b64decode(raw_b64)
    extracted_text, _ = ocr_service.process_image(image_bytes)
    return run_verification_pipeline(extracted_text, db)
