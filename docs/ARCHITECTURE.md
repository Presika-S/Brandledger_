# BrandLedger Architecture & Verification Pipeline

BrandLedger is an end-to-end brand governance and pre-publish claim verification platform. It enforces factual integrity, attribution, and freshness across human drafts and AI-generated content.

```
Draft / AI Output / Image Banner
           │
           ▼
┌──────────────────────────────────────────────┐
│  Stage 1: Claim Extractor                    │
│  - Identifies typed claims & character spans │
│  - Types: NUMERIC, PROMISE, DATE, GLOSSARY   │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│  Stage 2: Deterministic Exact Rules Engine   │
│  - Numbers, SLA %, Pricing, Glossary, Dates  │
│  - Instant match or Flag with Suggested Fix  │
└──────────────────────┬───────────────────────┘
                       │ (if not deterministic)
                       ▼
┌──────────────────────────────────────────────┐
│  Stage 3: pgvector Semantic Retrieval        │
│  - Retrieves ONLY active & unexpired facts   │
│  - Filtered by validity date and visibility  │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│  Stage 4: Cite-or-Abstain LLM Verifier       │
│  - One claim judged at a time                │
│  - Strict contract: Return Source ID + Quote │
│    OR abstain immediately                    │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│  Stage 5: Source & Quote Existence Validator │
│  - Verifies source ID exists in active ledger│
│  - Confirms quote matches canonical text     │
│  - Re-routes hallucinated cites to human     │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│  Stage 6: Human Decision & Audit Trail       │
│  - Accept Fix / Dispute / Route to Owner     │
│  - Overrides require written justification   │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│  Stage 7: Published Registry & Reverse Check │
│  - Links published claims to fact versions   │
│  - When a fact changes: finds all stale      │
│    published content & requests updates      │
└──────────────────────────────────────────────┘
```

## Core Safety Invariants
1. **Cite-or-Abstain Contract**: If a claim is not supported with high confidence by an approved fact, the verifier must return `ABSTAIN` and route to the human Fact Owner. It never guesses or fabricates facts.
2. **On-Premise Privacy**: OCR processing (Tesseract + OpenCV) and embeddings run on our own servers. Drafts and brand assets never leak to unauthorized external endpoints.
3. **Immutable Audit Trail**: Every override, dispute, and publication event is permanently recorded in PostgreSQL with actor, role, timestamp, and justification.
4. **Reverse Check Freshness**: Updates to the Brand Source of Truth automatically trigger reverse dependency analysis across all published assets, eliminating stale claims in the wild.
