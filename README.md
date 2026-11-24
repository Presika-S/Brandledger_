# BrandLedger: every claim gets a receipt

BrandLedger checks every number, name, term and promise in a draft against a versioned Brand Source of Truth (each fact has an owner, a source and an expiry date), shows the approved source and a suggested fix, and lets a human decide. When it is unsure it abstains and asks the fact owner. When a fact changes, a reverse check finds published content that still carries the old claim. Every publish is sealed with a hash-linked receipt.

This package merges the Round 2 single-file prototype (`index.html`) with the corrected full-stack build.

## Quick start (no install)
Double-click `index.html`. Internet is needed for Google Fonts and, the first time you run OCR on your own image, to download the Tesseract.js reader. Pick a door on the sign-in page and enter your name.

Deploy as static: drag this folder to Vercel/Netlify or run `npx serve .`.

## What is inside
| Path | What it is |
|---|---|
| `index.html` | Complete working prototype: 3D animated landing page, door-style sign-in (4 roles, asks for your name), real in-browser OCR upload, 22 pages (incl. Quality), light/dark, voice, hash-chained receipts. All data in localStorage. |
| `fullstack/backend` | FastAPI + SQLAlchemy: claim extractor, rules engine, retriever, cite-or-abstain verifier, validator, ledger, review and reverse-check APIs. |
| `fullstack/frontend` | React 19 + Vite source of the dashboard. |
| `extension/` | Chrome Manifest V3 "BrandLedger Guard": verifies ChatGPT answers claim by claim against your hosted API. |
| `docs/` | Architecture and Responsible AI disclosure. |

## Demo script (5 minutes)
1. Landing page: watch the draft type itself and get checked, apply the fixes and seal it, change F-021 on the pinboard to see stale items, click through the pipeline, try to cheat a receipt.
2. Open the **Writer** door and enter your name. Then: Check content > Load sample > Check claims. Click a highlighted claim to open the Evidence explorer.
3. Correction studio: Apply all fixes, or Dispute (reason dialog) / Ask owner. Submit for review.
4. Sign in as **Fact Owner**: Owner inbox > answer the ticket. Ledger: change F-021 and watch the reverse-check count rise.
5. Sign in as **Brand Manager**: Review queue (progress bar, trust score) > Approve and publish > Claim receipts > Simulate tampering > Export compliance report.
6. **Admin**: API playground, Browser extension simulator, Audit trail, Roles, Settings, Architecture and AI.

## Run the full stack (optional)
```
cd fullstack/backend && pip install -r requirements.txt && python -m uvicorn app.main:app --port 8000
cd fullstack/frontend && npm install && npm run dev
```
In `index.html` > API playground, "Send to live backend" calls `POST /api/v1/guard` on your running backend. Load `extension/` as described in the Round 3 section below.
For Vercel, deploy the `fullstack` folder as its own project; set `DATABASE_URL` to a managed Postgres for durable audit history.

## Responsible AI disclosure
Verification in `index.html` is deterministic rules plus keyword retrieval with no LLM call. OCR runs in your browser with Tesseract.js (script and language data load from a CDN); uploaded images are never sent anywhere, and the two sample banners fall back to their known text when offline. Sign-in is demo-only: the name you enter is stored in your browser and written to the audit trail. All data is fictional. The backend can use an LLM provider under a cite-or-abstain contract. Built with AI assistance (Claude).

Team NEXORA, Sri Krishna College of Engineering and Technology.

## Round 3, Improvement 2: measured accuracy and impact

Open **Quality** (Brand Manager, Fact Owner, Admin) for per-claim-type precision and recall, a confusion matrix,
the engine's known misses, and the reverse-check timing. Run `node quality/test_quality.js` to enforce the
thresholds. Details: `quality/README.md`.

## Round 3, Improvement 3: live Chrome extension (ChatGPT) on a hosted API

**What it does.** On chatgpt.com the extension adds a "Verify with BrandLedger" button under every ChatGPT answer. The answer is sent to your hosted `POST /api/v1/guard`; each extracted claim comes back as **VERIFIED**, **FLAGGED** or **ABSTAIN**. Flagged claims show the evidence (approved source quote, fact id, owner) and the approved correction with a Copy button. ABSTAIN claims are routed to the fact owner. The popup still verifies any selected text on any site. There is no localhost dependency anywhere in the extension.

**What changed.**
| File | Change |
|---|---|
| `extension/manifest.json` | v1.1.0, ChatGPT content script, HTTPS-only host access, options page, localhost removed |
| `extension/background.js` | Only component that calls the API: timeout, retries on 5xx/429/network, clear auth/network errors |
| `extension/chatgpt.js`, `chatgpt.css` | ChatGPT integration and claim cards; optional auto-verify after streaming ends |
| `extension/options.html/js` | Hosted API URL, optional API key, "Test connection" (calls `/api/v1/health`) |
| `extension/lib.js`, `popup.*` | Shared rendering (HTML-escaped), popup reworked to use the hosted API |
| `backend/app/main.py`, `config.py`, `api/guard.py` | `GET /api/v1/health` (checks DB), env-driven CORS, optional `GUARD_API_KEY`, `postgres://` URL normalisation |
| `backend/requirements.txt`, `Dockerfile`, `.env.example`, `render.yaml` | Uvicorn + PostgreSQL driver, container build, one-click Render blueprint |

### 1. Deploy the API publicly (pick one)
**Render (backend + free PostgreSQL):** push this project to GitHub, then Render > New > Blueprint > select the repo. `render.yaml` creates the web service and a Postgres database, wires `DATABASE_URL`, and generates `GUARD_API_KEY` (copy it from the service's Environment tab). Your URL will look like `https://brandledger-api.onrender.com`.

**Vercel:** deploy the `fullstack` folder (existing `vercel.json`). In Project Settings > Environment Variables set `DATABASE_URL` (managed Postgres, e.g. Neon/Supabase) and optionally `GUARD_API_KEY`. Without `DATABASE_URL` it falls back to SQLite in `/tmp`, which is **not** durable.

Environment variables: `DATABASE_URL` (`postgres://` or `postgresql://` accepted), `GUARD_API_KEY` (optional), `CORS_ORIGINS` (default `*`). Tables are created and seeded on first start (`init_db()` / `seed_database()`); there are no schema changes in this round, so no new migration is needed.

Check it: open `https://<your-host>/api/v1/health`. Expect `"status":"ok"`, `"database":"postgresql"`, and `active_facts` greater than 0.

### 2. Install the extension
1. Chrome > `chrome://extensions` > turn on **Developer mode** > **Load unpacked** > select the `extension/` folder.
2. The Options page opens. Enter your API URL, the API key if you set one, click **Test connection** (it must show `database: postgresql`), then **Save**. Chrome asks permission for your API host; allow it.
3. Open chatgpt.com, ask a question that mentions prices/uptime/guarantees (for example: "Write two sentences promoting BrandLedger Guard with its price and uptime guarantee"). Click **Verify with BrandLedger** under the answer.

### 3. Test
```
node extension/test/test_extension.js     # 15 client tests: rendering, XSS escaping, retries, auth, errors
node quality/test_quality.js              # existing accuracy thresholds
curl https://<your-host>/api/v1/health
curl -X POST https://<your-host>/api/v1/guard -H "Content-Type: application/json" -H "X-BrandLedger-Key: <key>" -d '{"content":"BrandLedger Guard costs $1 per month and guarantees 100% uptime.","channel":"ChatGPT"}'
```
PostgreSQL persistence check: verify a draft, redeploy/restart the service, and confirm `/api/v1/ledger` still returns your facts and `/api/v1/review` history; the data survives because it lives in the managed database, not the container.

### Known limits (read before demoing)
- ChatGPT's page markup changes often. The extension finds answers via `[data-message-author-role="assistant"]`; if OpenAI changes that attribute, update `SEL` in `extension/chatgpt.js`.
- Claim extraction is the existing rule-based extractor (prices, percentages, dates, promises, brand terms). It checks those claim types, not arbitrary prose.
- Free hosts sleep when idle; the first request can take about 30 seconds (the extension retries and says so on timeout).
