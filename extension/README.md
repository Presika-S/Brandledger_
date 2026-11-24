# BrandLedger Guard Chrome Extension (Manifest V3, v1.1.0)

Verifies ChatGPT answers (and any selected text) claim by claim against your hosted BrandLedger API.
No localhost: set your public HTTPS API URL in the extension Options.

- **ChatGPT (chatgpt.com, chat.openai.com):** a "Verify with BrandLedger" button under each answer; optional auto-verify when streaming ends.
- **Per-claim result:** VERIFIED, FLAGGED or ABSTAIN. Flagged claims show the evidence quote, source id, owner and the approved correction (Copy button).
- **Any page:** select text, right-click "Verify with BrandLedger Guard", or use the popup's "Grab Selection".
- **Reliability:** all calls go through the service worker with a 25 s timeout and retries on 5xx/429/network errors; bad API keys and unreachable hosts show clear messages.

Install and deploy steps: see the "Round 3, Improvement 3" section of the root README. Tests: `node test/test_extension.js`.
