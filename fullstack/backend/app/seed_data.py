import json
from datetime import datetime, date, timedelta
from .models.database import SessionLocal, init_db, Fact, FactVersion, PublishedAsset, PublishedClaim, AuditLog

def seed_database():
    init_db()
    db = SessionLocal()

    # Check if already seeded
    if db.query(Fact).count() > 0:
        db.close()
        return

    print("Seeding BrandLedger Source of Truth...")

    facts_data = [
        {
            "id": "fact_pricing_enterprise",
            "statement": "BrandLedger Enterprise Cloud starts at $99 per month billed annually.",
            "category": "Pricing",
            "fact_owner": "Sarah Jenkins (Head of Pricing)",
            "source": "https://brandledger.internal/pricing/v2-enterprise",
            "expiry_date": date.today() + timedelta(days=365),
            "visibility": "PUBLIC",
            "tags": ["pricing", "enterprise", "subscription", "cloud"]
        },
        {
            "id": "fact_sla_uptime",
            "statement": "BrandLedger guarantees a 99.99% uptime SLA for Enterprise Cloud customers with 24/7 dedicated support.",
            "category": "SLA & Infrastructure",
            "fact_owner": "Marcus Vance (VP of Infrastructure)",
            "source": "https://brandledger.internal/legal/sla-2025",
            "expiry_date": date.today() + timedelta(days=180),
            "visibility": "PUBLIC",
            "tags": ["sla", "uptime", "support", "reliability"]
        },
        {
            "id": "fact_compliance_soc2",
            "statement": "BrandLedger completed SOC 2 Type II certification in 2025 covering Security, Availability, and Confidentiality.",
            "category": "Security & Compliance",
            "fact_owner": "Elena Rostova (Chief Information Security Officer)",
            "source": "https://compliance.brandledger.internal/reports/soc2-type2-2025.pdf",
            "expiry_date": date.today() + timedelta(days=300),
            "visibility": "PUBLIC",
            "tags": ["soc2", "security", "compliance", "certification"]
        },
        {
            "id": "fact_naming_brand",
            "statement": "The official product name is BrandLedger (single word, camel-case). Never write as 'Brand Ledger' or 'Brand-Ledger'.",
            "category": "Brand & Nomenclature",
            "fact_owner": "Meenalochani S (Brand Governance Lead)",
            "source": "https://brandledger.internal/design/brand-identity-v4",
            "expiry_date": None,
            "visibility": "PUBLIC",
            "tags": ["brand", "nomenclature", "style-guide", "trademarks"]
        },
        {
            "id": "fact_privacy_local",
            "statement": "All OCR processing and text embeddings run strictly on our own server; brand assets and customer drafts never leave private infrastructure.",
            "category": "Privacy & AI Architecture",
            "fact_owner": "AI Governance Committee",
            "source": "https://legal.brandledger.internal/ai-data-processing-agreement",
            "expiry_date": date.today() + timedelta(days=400),
            "visibility": "PUBLIC",
            "tags": ["privacy", "on-premise", "ocr", "embeddings", "responsible-ai"]
        }
    ]

    for fd in facts_data:
        fact = Fact(
            id=fd["id"],
            statement=fd["statement"],
            category=fd["category"],
            fact_owner=fd["fact_owner"],
            source=fd["source"],
            expiry_date=fd["expiry_date"],
            visibility=fd["visibility"],
            tags=json.dumps(fd["tags"]),
            version=1,
            is_active=True
        )
        db.add(fact)
        db.flush()

        ver = FactVersion(
            id=f"ver_{fd['id']}_v1",
            fact_id=fact.id,
            version_number=1,
            statement=fact.statement,
            updated_by=fact.fact_owner,
            change_reason="Initial baseline approved fact added to Brand Source of Truth"
        )
        db.add(ver)

    # Pre-seed a published asset using version 1 of pricing and SLA
    pub_asset = PublishedAsset(
        id="asset_q1_landing_page",
        draft_id="draft_landing_q1",
        title="Q1 Global Enterprise Marketing Landing Page",
        content="Deploy BrandLedger Enterprise Cloud starting at $99 per month. Backed by our 99.99% uptime SLA.",
        channel="Web / Marketing Page",
        status="PUBLISHED",
        linked_facts_json=json.dumps({"fact_pricing_enterprise": 1, "fact_sla_uptime": 1})
    )
    db.add(pub_asset)
    db.flush()

    pub_claim1 = PublishedClaim(
        id="pubclaim_1",
        asset_id=pub_asset.id,
        claim_text="Starting at $99 per month",
        fact_id="fact_pricing_enterprise",
        fact_version=1,
        status="CURRENT"
    )
    pub_claim2 = PublishedClaim(
        id="pubclaim_2",
        asset_id=pub_asset.id,
        claim_text="99.99% uptime SLA",
        fact_id="fact_sla_uptime",
        fact_version=1,
        status="CURRENT"
    )
    db.add(pub_claim1)
    db.add(pub_claim2)

    # Initial audit log
    audit = AuditLog(
        id="audit_init_seed",
        action_type="SYSTEM_INITIALIZED",
        actor="System",
        role="system_admin",
        details_json=json.dumps({"seeded_facts": len(facts_data), "seeded_assets": 1})
    )
    db.add(audit)

    db.commit()
    db.close()
    print("Database successfully seeded with realistic brand facts and baseline published assets.")

if __name__ == "__main__":
    seed_database()
