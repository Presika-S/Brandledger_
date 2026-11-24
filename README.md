BrandLedger
Trustworthy content. Verified facts. Accountable publishing.
BrandLedger is a brand-content verification platform that helps teams
ensure every number, name, term, and promise in their content is
supported by an approved source.

It connects content creators with a versioned Brand Source of Truth,
surfaces evidence behind claims, and keeps people in control of every
correction and publishing decision. When reliable evidence is
unavailable, BrandLedger abstains and routes the claim to the
responsible fact owner rather than guessing.

When approved facts change, BrandLedger identifies published content
that may contain outdated information. Every publishing decision is
recorded in an auditable, hash-linked receipt.
Overview
BrandLedger brings brand governance, content verification,
collaboration, and accountability together in one workspace.
Core capabilities
- Role-based workspaces --- dedicated experiences for Writers,
  Fact Owners, Brand Managers, and Admins.
- Brand Source of Truth --- centrally managed facts with owners,
  sources, versions, and expiry dates.
- Intelligent claim inspection --- identifies prices, percentages,
  dates, promises, and brand terminology in content.
- Evidence explorer --- presents approved facts, supporting source
  quotes, and suggested corrections.
- Human-led correction workflow --- users can accept a correction,
  dispute it with a reason, or request input from the fact owner.
- Image text verification --- extracts banner text in the browser
  using Tesseract.js and sends the extracted claims through the
  verification workflow.
- Cite or abstain --- unsupported claims are routed to the
  appropriate fact owner instead of being presented as verified.
- Owner inbox --- gives fact owners a dedicated place to respond
  to verification requests.
- Review and publishing workflow --- supports review progress,
  trust scoring, approval, and publishing.
- Tamper-evident receipts --- creates SHA-256 hash-linked claim
  receipts for publishing decisions.
- Reverse impact analysis --- identifies published items that may
  still contain an older version of a changed fact.
- Audit trail --- records decisions with the responsible actor,
  role, timestamp, justification, and comments.
- Compliance reporting --- provides report export for governance
  and review.
- Quality analytics --- presents precision, recall, a confusion
  matrix, known coverage gaps, and reverse-check performance.
- API access --- provides content verification endpoints and
  interactive API documentation.
- BrandLedger Guard extension --- brings claim verification into
  ChatGPT and supports selected-text verification on websites.
Product experience
BrandLedger includes 22 application pages in a unified interface,
with light and dark themes and voice support.

The application is organized around four role workspaces:
  Workspace                           Purpose
  Writer                          Prepare content, inspect claims,
review evidence, and submit
corrections for approval.

  Fact Owner                      Manage approved facts and respond
to claims that need authoritative
information.

  Brand Manager                   Review content, monitor trust and
quality, approve publication, and
manage compliance.
Admin                           Access platform configuration, API
tools, audit information, roles,
and system-level views.
How BrandLedger works
1. Create content --- a user submits a draft, banner, or supported
   chat response for review.
2. Extract claims --- BrandLedger identifies supported claim types
   and their positions in the content.
3. Evaluate claims --- its rules engine checks values and
   terminology against the approved brand information.
4. Retrieve evidence --- the system searches approved, unexpired
   facts and associates relevant source material.
5. Validate citations --- cited facts and source quotes are checked
   against the ledger.
6. Route the decision --- claims are marked VERIFIED,
   FLAGGED, or ABSTAIN. Unsupported claims can be sent to their
   fact owner.
7. Review and publish --- a human makes the final decision, with a
   written reason required for disputes or overrides.
8. Record the receipt --- the publishing decision is added to a
   SHA-256 hash-linked receipt chain.
9. Track changes --- when a fact is updated, reverse impact
   analysis identifies published content that may need another review.
Technology stack
  Layer                               Technologies
  Web application                     React 19, Vite, HTML, CSS,
JavaScript

  Backend API                         Python, FastAPI, SQLAlchemy

  Database                            PostgreSQL for hosted deployments;
SQLite for local development

  Content verification                Claim extraction, deterministic
rules, keyword retrieval,
cite-or-abstain validation

  Image text extraction               Tesseract.js running in the browser

  Browser integration                 Chrome Extension, Manifest V3,
JavaScript

  Integrity and audit                 SHA-256 hash-linked receipts and
decision audit records
Deployment                          Vercel, Render, Docker, managed
PostgreSQL
System architecture
BrandLedger is composed of three primary parts:
- Web application --- provides the role-based workspaces, content
  review experience, evidence views, reporting, and browser-based OCR.
- FastAPI backend --- manages the verification pipeline, brand
  fact ledger, review workflows, owner requests, reverse checks, and
  audit records.
- BrandLedger Guard extension --- connects supported browser
  experiences to the hosted HTTPS API and presents verification
  results alongside ChatGPT responses.
The web application and extension communicate with the backend through
API endpoints. The backend uses the configured database to persist
facts, decisions, review activity, published assets, and audit history.
Verification principles
BrandLedger is designed around four principles:
1. Evidence before approval --- verification is tied to approved
   facts and source material.
2. Abstention over guessing --- unsupported claims are escalated
   rather than treated as verified.
3. Human accountability --- people retain control over corrections
   and publishing decisions.
4. Traceable change --- fact versions, decisions, and publishing
   receipts support an auditable content history.
BrandLedger Guard --- Chrome extension
BrandLedger Guard connects content verification to the ChatGPT web
experience.

Its key capabilities include:
- Adds a Verify with BrandLedger action beneath ChatGPT responses.
- Evaluates extracted claims through the hosted POST /api/v1/guard
  endpoint.
- Displays VERIFIED, FLAGGED, or ABSTAIN results for
  individual claims.
- Presents supporting source information and approved corrections for
  flagged claims.
- Provides a copy action for suggested corrections.
- Routes unsupported claims to the relevant fact owner.
- Supports selected-text verification through the extension popup on
  websites.
- Uses a background service worker for API communication, timeouts,
  and retry handling.
- Provides an Options page for the hosted API address and optional API
  key.
The extension uses the hosted HTTPS API and is designed without a
localhost dependency.
Backend API
The FastAPI service provides the application with a shared verification
and data layer.

Key API capabilities include:
- Content verification through POST /api/v1/guard.
- Image/OCR claim verification through /guard/ocr.
- Service and database health information through
  GET /api/v1/health.
- Ledger, review, decision, and audit-related endpoints.
- Interactive OpenAPI documentation at /docs.
The backend supports environment-based configuration for the database
connection, CORS origins, and optional API-key protection.
Quality and evaluation
BrandLedger includes a repeatable evaluation suite based on synthetic
drafts and hand-labelled claim examples.

The current evaluation covers 66 synthetic drafts and 82 labelled
sentences across six categories: clean content, incorrect numbers,
outdated values, expired facts, unsupported promotions, and terminology.

Reported results:

  Metric                                                           Result
  Accuracy                                                          87.8%
Macro F1                                                           0.90
Fix accuracy                                                    29 / 31
Reverse-check recall                                      82 / 82 items
Reverse-check comparison          100% versus 33% for exact-text search
Chrome extension client tests                          15 passing tests

The Quality workspace also presents per-claim-type precision and recall,
a confusion matrix, known coverage gaps, and reverse-check timing.
Responsible AI and data handling
BrandLedger is designed to make verification decisions explainable and
accountable.
- The current web prototype uses deterministic rules and keyword
  retrieval for verification.
- Browser-based OCR uses Tesseract.js to extract text from images.
- Image processing in the prototype takes place in the browser;
  uploaded images are not sent to a separate image-processing service.
- Claims without adequate approved evidence are abstained from and can
  be routed to a fact owner.
- Suggested corrections are presented for human review rather than
  applied automatically.
- Audit records preserve decision context, including the actor, role,
  timestamp, and justification.
- Demo content is fictional.
The backend architecture can support an LLM provider under the same
cite-or-abstain approach, where claims must remain grounded in approved
evidence.
Project structure
BrandLedger/
├── index.html
├── fullstack/
│   ├── backend/
│   │   ├── app/
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   └── frontend/
├── extension/
│   ├── manifest.json
│   ├── background.js
│   ├── chatgpt.js
│   ├── options.html
│   └── test/
├── quality/
│   ├── README.md
│   └── test_quality.js
└── docs/
Getting started
Run the browser prototype
Open index.html in a modern browser. Internet access is used for
Google Fonts and for loading the Tesseract.js OCR library and language
data when needed.

The prototype includes the role-based demo experience and browser-local
demo data.
Run the full-stack application locally
Start the backend:
cd fullstack/backend
pip install -r requirements.txt
python -m uvicorn app.main:app --port 8000
In a separate terminal, start the frontend:
cd fullstack/frontend
npm install
npm run dev
Configuration
The backend supports the following environment variables:
  Variable                            Purpose
  DATABASE_URL                      Database connection string. Use
managed PostgreSQL for durable
hosted data.

  GUARD_API_KEY                     Optional API key for protected
guard requests.
CORS_ORIGINS                      Allowed browser origins for API
access.
For hosted deployments, configure DATABASE_URL with a managed
PostgreSQL connection. The application also supports SQLite for local
development.
Deployment
The project supports a separated frontend and backend deployment.
- Frontend: deploy the fullstack/frontend application through
  Vercel.
- Backend: deploy the FastAPI service through Render using the
  included Docker configuration and render.yaml blueprint.
- Database: connect the hosted backend to managed PostgreSQL
  through DATABASE_URL.
- Browser extension: configure BrandLedger Guard to use the
  deployed HTTPS API.
The Render blueprint is configured to provision the backend service and
PostgreSQL database, connect the database through environment
configuration, and generate the optional guard API key.
Roadmap
Next 30 days --- improve verification coverage
- Add stronger handling for spelled-out numbers and abbreviated values
  such as 10k.
- Expand the labelled evaluation dataset from 82 to 300 sentences.
- Introduce individual email accounts and role invitations.
60--90 days --- extend integrations
- Expand browser verification support to Gemini and Claude.
- Prepare BrandLedger Guard for Chrome Web Store publication.
- Add Slack and CMS integrations that can invoke verification before
  content is published.
6 months --- scale governance and trust
- Introduce semantic retrieval using pgvector.
- Expand to multi-brand workspaces and SSO.
- Add signed receipts and an exportable compliance package.
Intended users
BrandLedger is designed for organizations that publish important facts,
figures, product claims, and commitments across multiple channels.

Potential users include:
- Brand and marketing teams.
- Content and communications teams.
- Compliance and governance teams.
- Banks and fintech organizations.
- Consumer brands with frequent product and promotional updates.
Team
Team NEXORA
Sri Krishna College of Engineering and Technology
