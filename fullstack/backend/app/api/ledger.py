import json
import uuid
from datetime import datetime, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..models.database import get_db, Fact, FactVersion, AuditLog
from ..models.schemas import FactCreate, FactUpdate, FactResponse, FactVersionResponse
from ..core.reverse_checker import reverse_checker

router = APIRouter(prefix="/ledger", tags=["Brand Source of Truth"])

def _to_fact_response(fact: Fact) -> FactResponse:
    today = date.today()
    is_expired = fact.expiry_date is not None and fact.expiry_date < today
    tags = json.loads(fact.tags) if fact.tags else []
    
    versions = [
        FactVersionResponse(
            version_number=v.version_number,
            statement=v.statement,
            updated_by=v.updated_by,
            change_reason=v.change_reason,
            created_at=v.created_at
        ) for v in fact.versions
    ]

    return FactResponse(
        id=fact.id,
        statement=fact.statement,
        category=fact.category,
        fact_owner=fact.fact_owner,
        source=fact.source,
        expiry_date=fact.expiry_date,
        visibility=fact.visibility,
        tags=tags,
        version=fact.version,
        is_active=fact.is_active,
        is_expired=is_expired,
        created_at=fact.created_at,
        updated_at=fact.updated_at,
        versions=versions
    )

@router.get("", response_model=List[FactResponse])
def get_all_facts(
    category: Optional[str] = None,
    active_only: bool = True,
    db: Session = Depends(get_db)
):
    """
    List all facts from the Brand Source of Truth.
    """
    query = db.query(Fact)
    if active_only:
        query = query.filter(Fact.is_active == True)
    if category:
        query = query.filter(Fact.category == category)
    facts = query.order_by(Fact.category, Fact.id).all()
    return [_to_fact_response(f) for f in facts]

@router.get("/{fact_id}", response_model=FactResponse)
def get_fact(fact_id: str, db: Session = Depends(get_db)):
    fact = db.query(Fact).filter(Fact.id == fact_id).first()
    if not fact:
        raise HTTPException(status_code=404, detail="Fact not found in ledger")
    return _to_fact_response(fact)

@router.post("", response_model=FactResponse)
def create_fact(fact_in: FactCreate, db: Session = Depends(get_db)):
    """
    Add a new fact to the ledger with owner, source and expiry date.
    """
    fact_id = f"fact_{uuid.uuid4().hex[:8]}"
    db_fact = Fact(
        id=fact_id,
        statement=fact_in.statement,
        category=fact_in.category,
        fact_owner=fact_in.fact_owner,
        source=fact_in.source,
        expiry_date=fact_in.expiry_date,
        visibility=fact_in.visibility.value,
        tags=json.dumps(fact_in.tags),
        version=1,
        is_active=True
    )
    db.add(db_fact)
    db.flush()

    # Record initial version 1
    init_ver = FactVersion(
        id=f"ver_{uuid.uuid4().hex[:8]}",
        fact_id=db_fact.id,
        version_number=1,
        statement=db_fact.statement,
        updated_by=fact_in.fact_owner,
        change_reason="Initial fact creation in Brand Source of Truth"
    )
    db.add(init_ver)

    # Audit log
    audit = AuditLog(
        id=f"audit_{uuid.uuid4().hex[:8]}",
        action_type="FACT_CREATED",
        actor=fact_in.fact_owner,
        role="fact_owner",
        details_json=json.dumps({"fact_id": fact_id, "statement": fact_in.statement})
    )
    db.add(audit)
    db.commit()
    db.refresh(db_fact)

    return _to_fact_response(db_fact)

@router.put("/{fact_id}", response_model=FactResponse)
def update_fact(fact_id: str, fact_in: FactUpdate, db: Session = Depends(get_db)):
    """
    Update a fact. Creates a new immutable version in PostgreSQL/ledger,
    increments version number, and triggers reverse-check scanning.
    """
    fact = db.query(Fact).filter(Fact.id == fact_id).first()
    if not fact:
        raise HTTPException(status_code=404, detail="Fact not found")

    old_statement = fact.statement
    old_version = fact.version

    if fact_in.statement is not None:
        fact.statement = fact_in.statement
    if fact_in.category is not None:
        fact.category = fact_in.category
    if fact_in.fact_owner is not None:
        fact.fact_owner = fact_in.fact_owner
    if fact_in.source is not None:
        fact.source = fact_in.source
    if fact_in.expiry_date is not None:
        fact.expiry_date = fact_in.expiry_date
    if fact_in.visibility is not None:
        fact.visibility = fact_in.visibility.value
    if fact_in.tags is not None:
        fact.tags = json.dumps(fact_in.tags)

    # Increment version
    new_version = old_version + 1
    fact.version = new_version
    fact.updated_at = datetime.utcnow()

    # Create new version record
    ver_record = FactVersion(
        id=f"ver_{uuid.uuid4().hex[:8]}",
        fact_id=fact.id,
        version_number=new_version,
        statement=fact.statement,
        updated_by=fact.fact_owner,
        change_reason=fact_in.change_reason or "Fact modified by brand manager"
    )
    db.add(ver_record)

    # Log to audit trail
    audit = AuditLog(
        id=f"audit_{uuid.uuid4().hex[:8]}",
        action_type="FACT_UPDATED",
        actor=fact.fact_owner,
        role="brand_manager",
        details_json=json.dumps({
            "fact_id": fact.id,
            "old_version": old_version,
            "new_version": new_version,
            "old_statement": old_statement,
            "new_statement": fact.statement,
            "reason": fact_in.change_reason
        })
    )
    db.add(audit)
    db.commit()

    # Automatically trigger reverse check across all published assets
    reverse_checker.scan_for_stale_content(db, target_fact_id=fact.id)

    db.refresh(fact)
    return _to_fact_response(fact)
