// Shared, DOM-free helpers (used by popup, ChatGPT content script, and Node tests).
(function (root) {
  function escapeHtml(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  // Only the three statuses the product defines; anything else is treated as ABSTAIN (fail safe).
  function normStatus(s) {
    return ["VERIFIED", "FLAGGED", "ABSTAIN"].indexOf(s) >= 0 ? s : "ABSTAIN";
  }

  function scoreClass(n) { return n >= 85 ? "high" : n >= 50 ? "mid" : "low"; }

  // One claim -> HTML. Flagged claims show evidence (approved source quote) and approved correction.
  function claimHtml(c, p) {
    p = p || "bl";
    var st = normStatus(c.status);
    var h = '<div class="' + p + '-claim ' + p + '-' + st + '">' +
      '<div class="' + p + '-claim-head"><span class="' + p + '-claim-text">' + escapeHtml(c.claim_text) +
      '</span><span class="' + p + '-badge ' + p + '-badge-' + st + '">' + st + '</span></div>';
    if (c.explanation) h += '<div class="' + p + '-expl">' + escapeHtml(c.explanation) + '</div>';
    if (st === "FLAGGED" && c.suggested_fix) {
      h += '<div class="' + p + '-fix">Approved correction: <b>' + escapeHtml(c.suggested_fix) + '</b> ' +
        '<button class="' + p + '-copy" data-copy="' + escapeHtml(c.suggested_fix) + '">Copy</button></div>';
    }
    if (c.source_quote) {
      h += '<div class="' + p + '-evidence">Evidence' + (c.source_id ? ' [' + escapeHtml(c.source_id) + ']' : '') +
        ': \u201C' + escapeHtml(c.source_quote) + '\u201D' +
        (c.source_owner ? ' \u2014 owner: ' + escapeHtml(c.source_owner) : '') + '</div>';
    }
    if (st === "ABSTAIN") h += '<div class="' + p + '-expl">Not enough approved evidence. Routed to the fact owner.</div>';
    return h + '</div>';
  }

  function summaryHtml(d, p) {
    p = p || "bl";
    return '<div class="' + p + '-summary"><span class="' + p + '-score ' + p + '-score-' + scoreClass(d.trust_score) + '">' +
      escapeHtml(d.trust_score) + '%</span><span>' +
      '<b>' + d.verified_claims + '</b> verified \u00B7 <b>' + d.flagged_claims + '</b> flagged \u00B7 <b>' +
      d.abstained_claims + '</b> abstain</span></div>';
  }

  function normalizeBase(u) {
    u = (u || "").trim().replace(/\/+$/, "");
    if (!u) return "";
    if (!/^https?:\/\//i.test(u)) u = "https://" + u;
    u = u.replace(/\/api\/v1(\/guard)?$/i, "");
    return u;
  }

  function isLocal(u) { return /^https?:\/\/(localhost|127\.|0\.0\.0\.0|\[::1\])/i.test(u); }

  // fetch with timeout + retry on network errors / 5xx / 429. Never retries 4xx (auth/validation).
  async function fetchWithRetry(url, opts, cfg) {
    cfg = cfg || {};
    var tries = cfg.retries == null ? 2 : cfg.retries, timeout = cfg.timeoutMs || 25000, f = cfg.fetch || fetch;
    var last;
    for (var i = 0; i <= tries; i++) {
      var ctl = new AbortController(), t = setTimeout(function () { ctl.abort(); }, timeout);
      try {
        var res = await f(url, Object.assign({}, opts, { signal: ctl.signal }));
        clearTimeout(t);
        if (res.status === 429 || res.status >= 500) { last = new Error("Server error " + res.status); }
        else return res;
      } catch (e) {
        clearTimeout(t);
        last = e.name === "AbortError" ? new Error("Request timed out (host may be waking up)") : e;
      }
      if (i < tries) await new Promise(function (r) { setTimeout(r, (cfg.backoffMs == null ? 1200 : cfg.backoffMs) * (i + 1)); });
    }
    throw last;
  }

  var api = { escapeHtml: escapeHtml, normStatus: normStatus, claimHtml: claimHtml, summaryHtml: summaryHtml,
              normalizeBase: normalizeBase, isLocal: isLocal, fetchWithRetry: fetchWithRetry };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.BLLib = api;
})(typeof self !== "undefined" ? self : this);
