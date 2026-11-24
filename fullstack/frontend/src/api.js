const BASE_URL = import.meta.env.VITE_API_URL || "/api/v1";

export async function verifyDraft(content, title = "Draft Announcement", draftId = null) {
  const res = await fetch(`${BASE_URL}/guard`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, title, draft_id: draftId })
  });
  if (!res.ok) throw new Error("Guard verification failed");
  return res.json();
}

export async function verifyOCR(imageBase64, title = "Uploaded Creative") {
  const res = await fetch(`${BASE_URL}/guard/ocr`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_base64: imageBase64, title })
  });
  if (!res.ok) throw new Error("OCR verification failed");
  return res.json();
}

export async function getFacts() {
  const res = await fetch(`${BASE_URL}/ledger`);
  if (!res.ok) throw new Error("Failed to fetch facts");
  return res.json();
}

export async function updateFact(factId, payload) {
  const res = await fetch(`${BASE_URL}/ledger/${factId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error("Failed to update fact");
  return res.json();
}

async function parseError(res, fallback) {
  try {
    const body = await res.json();
    if (typeof body.detail === "string") return body.detail;
    if (Array.isArray(body.detail)) return body.detail.map(d => d.msg).join("; ");
  } catch (_) { /* ignore */ }
  return `${fallback} (HTTP ${res.status})`;
}

// action: { claim, decision, reviewerName, reviewerRole, comment, overrideReason, draftId }
export async function recordReviewAction({ claim, decision, reviewerName, reviewerRole, comment, overrideReason, draftId }) {
  const res = await fetch(`${BASE_URL}/review/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      claim_id: claim.claim_id,
      decision,
      reviewer_name: reviewerName,
      reviewer_role: reviewerRole,
      comment: comment || null,
      override_reason: overrideReason || null,
      draft_id: draftId || null,
      claim_text: claim.claim_text,
      claim_type: claim.claim_type,
      source_id: claim.source_id || null,
      source_owner: claim.source_owner || null
    })
  });
  if (!res.ok) throw new Error(await parseError(res, "Could not record review action"));
  return res.json();
}

export async function getOwnerInbox(status = "ALL") {
  const res = await fetch(`${BASE_URL}/review/inbox?status=${status}`);
  if (!res.ok) throw new Error(await parseError(res, "Failed to load inbox"));
  return res.json();
}

export async function answerOwnerTicket(ticketId, response, ownerName, note) {
  const res = await fetch(`${BASE_URL}/review/owner-response`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ticket_id: ticketId, response, owner_name: ownerName, note: note || null })
  });
  if (!res.ok) throw new Error(await parseError(res, "Could not send response"));
  return res.json();
}

export async function getDecisions(draftId = "") {
  const res = await fetch(`${BASE_URL}/review/decisions?draft_id=${encodeURIComponent(draftId)}`);
  if (!res.ok) throw new Error(await parseError(res, "Failed to load decisions"));
  return res.json();
}

export async function publishDraft(draftId, title, content, channel, publisher, claimsVerified) {
  const res = await fetch(`${BASE_URL}/review/publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      draft_id: draftId,
      title,
      content,
      channel,
      publisher,
      claims_verified: claimsVerified
    })
  });
  if (!res.ok) throw new Error("Publishing failed");
  return res.json();
}

export async function getReverseCheckAlerts() {
  const res = await fetch(`${BASE_URL}/reverse-check/alerts`);
  if (!res.ok) throw new Error("Failed to fetch reverse-check alerts");
  return res.json();
}

export async function getPublishedAssets() {
  const res = await fetch(`${BASE_URL}/reverse-check/published-assets`);
  if (!res.ok) throw new Error("Failed to fetch published assets");
  return res.json();
}

export async function getAuditLogs() {
  const res = await fetch(`${BASE_URL}/review/audit-logs`);
  if (!res.ok) throw new Error("Failed to fetch audit logs");
  return res.json();
}
