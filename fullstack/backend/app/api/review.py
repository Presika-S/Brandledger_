import json
import uuid
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..models.database import (
    get_db, PublishedAsset, PublishedClaim, Fact, AuditLog
)
from ..models.schemas import (
    HumanReviewAction, PublishDraftRequest, PublishedAssetResponse,
    AuditLogEntry, OwnerResponse
)

router = APIRouter(prefix="/review", tags=["Review & Publishing Workflow"])

@router.post("/action")
def record_review_action(action: HumanReviewAction, db: Session = Depends(get_db)):
    """
    Review Workflow: Accepts, Disputes, Requests Owner Review, or Overrides a claim.
    Overrides require a mandatory justification and are logged in the audit trail.
    """
    decision_value = action.decision.value if hasattr(action.decision, "value") else str(action.decision)

    if decision_value == "OVERRIDE" and not (action.override_reason or "").strip():
        raise HTTPException(status_code=400, detail="Overrides strictly require an explicit governance override reason.")
    if decision_value == "OVERRIDE" and action.reviewer_role != "brand_manager":
        raise HTTPException(status_code=403, detail="Only a Brand Manager can override a flagged claim.")
    if decision_value == "DISPUTE" and not (action.comment or "").strip():
        raise HTTPException(status_code=400, detail="A dispute needs a written reason.")

    audit = AuditLog(
        id=f"audit_{uuid.uuid4().hex[:8]}",
        # Store the enum's wire value so inbox/decision queries match exactly.
        action_type=f"REVIEW_{decision_value}",
        actor=action.reviewer_name,
        role=action.reviewer_role,
        details_json=json.dumps({
            "claim_id": action.claim_id,
            "decision": decision_value,
            "comment": action.comment,
            "override_reason": action.override_reason,
            "draft_id": action.draft_id,
            "claim_text": action.claim_text,
            "claim_type": action.claim_type,
            "source_id": action.source_id,
            "source_owner": action.source_owner,
        })
    )
    db.add(audit)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    return {
        "status": "SUCCESS",
        "action_recorded": decision_value,
        "audit_id": audit.id,
        # For ASK_OWNER the audit id doubles as the ticket id in the Fact Owner inbox
        "ticket_id": audit.id if decision_value == "ASK_OWNER" else None,
        "message": f"Action {decision_value} logged by {action.reviewer_name} ({action.reviewer_role})"
    }

@router.post("/publish", response_model=PublishedAssetResponse)
def publish_draft(req: PublishDraftRequest, db: Session = Depends(get_db)):
    """
    Publish draft:
    Registers the draft into the Published Asset Registry and links each
    verified claim to its exact Fact ID and Fact Version.
    This creates the cryptographic trace enabling automatic reverse-checking.
    """
    asset_id = f"asset_{uuid.uuid4().hex[:8]}"

    # Fetch facts currently active to bind versions
    facts = db.query(Fact).filter(Fact.is_active == True).all()
    fact_versions_map = {f.id: f.version for f in facts}

    linked_versions = {}
    pub_asset = PublishedAsset(
        id=asset_id,
        draft_id=req.draft_id,
        title=req.title,
        content=req.content,
        channel=req.channel,
        status="PUBLISHED"
    )
    db.add(pub_asset)
    db.flush()

    # Link claims to current fact versions
    for fact_id, version in fact_versions_map.items():
        # Check if fact statement or id was referenced
        if fact_id in req.claims_verified or any(fact_id in c for c in req.claims_verified):
            linked_versions[fact_id] = version
            claim_row = PublishedClaim(
                id=f"pubclaim_{uuid.uuid4().hex[:8]}",
                asset_id=asset_id,
                claim_text=f"Claim referencing {fact_id}",
                fact_id=fact_id,
                fact_version=version,
                status="CURRENT"
            )
            db.add(claim_row)

    pub_asset.linked_facts_json = json.dumps(linked_versions)

    # Log to audit trail
    audit = AuditLog(
        id=f"audit_{uuid.uuid4().hex[:8]}",
        action_type="DRAFT_PUBLISHED",
        actor=req.publisher,
        role="brand_manager",
        details_json=json.dumps({
            "asset_id": asset_id,
            "title": req.title,
            "channel": req.channel,
            "linked_facts": linked_versions
        })
    )
    db.add(audit)
    db.commit()

    return PublishedAssetResponse(
        id=asset_id,
        draft_id=req.draft_id,
        title=req.title,
        channel=req.channel,
        published_at=pub_asset.published_at,
        status=pub_asset.status,
        claims_count=len(linked_versions),
        linked_fact_versions=linked_versions
    )

@router.get("/audit-logs", response_model=List[AuditLogEntry])
def get_audit_logs(limit: int = 50, db: Session = Depends(get_db)):
    """
    Retrieve the immutable brand governance audit log.
    """
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit).all()
    return [
        AuditLogEntry(
            id=l.id,
            action_type=l.action_type,
            actor=l.actor,
            role=l.role,
            timestamp=l.timestamp,
            details=json.loads(l.details_json) if l.details_json else {}
        ) for l in logs
    ]


def _parse(l: AuditLog) -> dict:
    try:
        return json.loads(l.details_json) if l.details_json else {}
    except ValueError:
        return {}


@router.get("/inbox")
def owner_inbox(status: str = "ALL", owner: str = "", db: Session = Depends(get_db)):
    """
    Fact Owner inbox: every claim routed with ASK_OWNER becomes a ticket.
    A ticket is OPEN until an OWNER_RESPONSE audit entry references it.
    """
    routed = db.query(AuditLog).filter(AuditLog.action_type == "REVIEW_ASK_OWNER") \
        .order_by(AuditLog.timestamp.desc()).all()
    answers = {}
    for l in db.query(AuditLog).filter(AuditLog.action_type == "OWNER_RESPONSE").all():
        d = _parse(l)
        answers[d.get("ticket_id")] = (l, d)

    tickets = []
    for l in routed:
        d = _parse(l)
        ans = answers.get(l.id)
        t = {
            "ticket_id": l.id,
            "status": "RESOLVED" if ans else "OPEN",
            "raised_by": l.actor,
            "raised_at": l.timestamp,
            "claim_text": d.get("claim_text"),
            "claim_type": d.get("claim_type"),
            "draft_id": d.get("draft_id"),
            "source_id": d.get("source_id"),
            "owner": d.get("source_owner") or "Brand Governance",
            "question": d.get("comment"),
            "response": ans[1].get("response") if ans else None,
            "response_note": ans[1].get("note") if ans else None,
            "responded_by": ans[0].actor if ans else None,
            "responded_at": ans[0].timestamp if ans else None,
        }
        if status != "ALL" and t["status"] != status:
            continue
        if owner and owner.lower() not in (t["owner"] or "").lower():
            continue
        tickets.append(t)
    return tickets


@router.post("/owner-response")
def owner_response(resp: OwnerResponse, db: Session = Depends(get_db)):
    """A Fact Owner answers a routed claim. Logged to the audit trail and closes the ticket."""
    if resp.response not in {"CONFIRMED_CLAIM", "CONFIRMED_FACT", "UPDATE_FACT"}:
        raise HTTPException(status_code=400, detail="Unknown response type.")
    ticket = db.query(AuditLog).filter(AuditLog.id == resp.ticket_id,
                                       AuditLog.action_type == "REVIEW_ASK_OWNER").first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found.")
    already = [l for l in db.query(AuditLog).filter(AuditLog.action_type == "OWNER_RESPONSE").all()
               if _parse(l).get("ticket_id") == resp.ticket_id]
    if already:
        raise HTTPException(status_code=409, detail="Ticket already answered.")
    audit = AuditLog(
        id=f"audit_{uuid.uuid4().hex[:8]}",
        action_type="OWNER_RESPONSE",
        actor=resp.owner_name,
        role="fact_owner",
        details_json=json.dumps({
            "ticket_id": resp.ticket_id,
            "response": resp.response,
            "note": resp.note,
            "claim_text": _parse(ticket).get("claim_text"),
            "draft_id": _parse(ticket).get("draft_id"),
        })
    )
    db.add(audit)
    db.commit()
    return {"status": "SUCCESS", "audit_id": audit.id, "ticket_id": resp.ticket_id}


@router.get("/decisions")
def latest_decisions(draft_id: str = "", db: Session = Depends(get_db)):
    """
    Latest human decision per claim (keyed by claim_type|claim_text) so the UI can
    restore review state after a re-verification or page reload. Owner answers are merged in.
    """
    logs = db.query(AuditLog).filter(AuditLog.action_type.like("REVIEW_%")) \
        .order_by(AuditLog.timestamp.asc()).all()
    owner_ans = {}
    for l in db.query(AuditLog).filter(AuditLog.action_type == "OWNER_RESPONSE").all():
        owner_ans[_parse(l).get("ticket_id")] = (l, _parse(l))
    out = {}
    for l in logs:
        d = _parse(l)
        if not d.get("claim_text"):
            continue
        if draft_id and d.get("draft_id") != draft_id:
            continue
        key = f"{d.get('claim_type')}|{d.get('claim_text')}"
        entry = {
            "decision": d.get("decision"), "by": l.actor, "at": l.timestamp,
            "reason": d.get("override_reason") or d.get("comment"),
            "ticket_id": l.id if d.get("decision") == "ASK_OWNER" else None,
            "owner_response": None,
        }
        if entry["ticket_id"] and entry["ticket_id"] in owner_ans:
            entry["owner_response"] = owner_ans[entry["ticket_id"]][1].get("response")
        out[key] = entry
    return out
