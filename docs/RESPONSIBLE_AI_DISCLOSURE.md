# Responsible AI & Transparency Disclosure

As committed in our BrandLedger design, this document explicitly discloses the role of AI tools used across planning, development, and system operation.

## 1. Operating AI Disclosure
- **Role of the LLM Verifier**:
  - The LLM in BrandLedger is used **only** as a reasoning judge for semantic claim comparison against retrieved facts.
  - It operates under a strict **Cite-or-Abstain Contract**: it is strictly forbidden from generating or guessing facts. It is required to return a verified `source_id` and exact `quote` from the retrieved context, or return `ABSTAIN`.
  - Any claim where confidence is under 75% or where the cited source does not validate against the PostgreSQL ledger is automatically stripped of verification and routed to a human Fact Owner.
- **On-Premise Privacy Guarantees**:
  - OCR extraction is handled via local Tesseract and OpenCV on our own server.
  - Sentence embeddings and vector similarity calculations remain localized on-premise.
  - Customer drafts, brand secrets, and unpublished marketing materials are never used to train external foundation models.

## 2. Planning & Development AI Disclosure
- AI coding assistants were leveraged during development for scaffolding boilerplate schemas, writing unit tests, and structuring Vite configurations.
- Core algorithmic verification pipelines (deterministic rules matching, claim character-span extractor, vector cosine ranking, source-quote validation, and backward dependency graph traversal for the Reverse Check Engine) were designed, audited, and tested by our engineering team.
