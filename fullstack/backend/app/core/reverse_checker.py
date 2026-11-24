import json
from datetime import datetime
from typing import List, Dict
from sqlalchemy.orm import Session
from ..models.database import Fact, PublishedAsset, PublishedClaim
from ..models.schemas import ReverseCheckAlert

class ReverseCheckEngine:
    """
    Reverse Check Engine:
    When a brand fact is updated or modified in the ledger, this engine
    audits all historical and live published assets (articles, landing pages,
    decks, AI generated copy).
    It pinpoints every published asset linked to an outdated fact version,
    flags the asset status as 'REQUIRES_UPDATE', and produces an actionable
    alert with recommended corrections.
    """

    def scan_for_stale_content(self, db: Session, target_fact_id: str = None) -> List[ReverseCheckAlert]:
        alerts: List[ReverseCheckAlert] = []

        # Query all active facts
        facts_query = db.query(Fact)
        if target_fact_id:
            facts_query = facts_query.filter(Fact.id == target_fact_id)
        current_facts: Dict[str, Fact] = {f.id: f for f in facts_query.all()}

        # Scan published claims
        claims_query = db.query(PublishedClaim).join(PublishedAsset)
        if target_fact_id:
            claims_query = claims_query.filter(PublishedClaim.fact_id == target_fact_id)

        published_claims = claims_query.all()

        for pub_claim in published_claims:
            current_fact = current_facts.get(pub_claim.fact_id)
            if not current_fact:
                continue

            # Check if published claim was based on an older version
            if pub_claim.fact_version < current_fact.version or not current_fact.is_active:
                # Update claim status
                pub_claim.status = "OUTDATED"
                pub_claim.asset.status = "REQUIRES_UPDATE"

                alert = ReverseCheckAlert(
                    published_asset_id=pub_claim.asset.id,
                    asset_title=pub_claim.asset.title,
                    channel=pub_claim.asset.channel,
                    fact_id=current_fact.id,
                    fact_statement=current_fact.statement,
                    old_version_used=pub_claim.fact_version,
                    current_version=current_fact.version,
                    outdated_claim_text=pub_claim.claim_text,
                    recommended_action=(
                        f"Fact '{current_fact.id}' was updated from v{pub_claim.fact_version} to v{current_fact.version} "
                        f"by {current_fact.fact_owner}. Update live text to reflect: '{current_fact.statement}'."
                    ),
                    stale_since=current_fact.updated_at or datetime.utcnow()
                )
                alerts.append(alert)

        db.commit()
        return alerts

reverse_checker = ReverseCheckEngine()
