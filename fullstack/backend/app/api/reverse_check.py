import json
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..models.database import get_db, PublishedAsset
from ..models.schemas import ReverseCheckAlert, PublishedAssetResponse
from ..core.reverse_checker import reverse_checker

router = APIRouter(prefix="/reverse-check", tags=["Reverse Check Engine"])

@router.post("/scan", response_model=List[ReverseCheckAlert])
def run_reverse_check_scan(db: Session = Depends(get_db)):
    """
    Executes a reverse-check scan across all published content.
    Identifies any published asset currently displaying an outdated fact version.
    """
    alerts = reverse_checker.scan_for_stale_content(db)
    return alerts

@router.get("/alerts", response_model=List[ReverseCheckAlert])
def get_stale_alerts(db: Session = Depends(get_db)):
    """
    Get active reverse-check alerts for content requiring updates.
    """
    return reverse_checker.scan_for_stale_content(db)

@router.get("/published-assets", response_model=List[PublishedAssetResponse])
def get_published_assets(db: Session = Depends(get_db)):
    """
    List all assets currently registered in the Published Claims Registry.
    """
    assets = db.query(PublishedAsset).order_by(PublishedAsset.published_at.desc()).all()
    results = []
    for a in assets:
        linked_facts = json.loads(a.linked_facts_json) if a.linked_facts_json else {}
        results.append(PublishedAssetResponse(
            id=a.id,
            draft_id=a.draft_id,
            title=a.title,
            channel=a.channel,
            published_at=a.published_at,
            status=a.status,
            claims_count=len(a.claims),
            linked_fact_versions=linked_facts
        ))
    return results
