const $ = (id) => document.getElementById(id);
const send = (m) => new Promise((r) => chrome.runtime.sendMessage(m, (x) => r(x || { ok: false, error: chrome.runtime.lastError?.message || "No response" })));

function note(t) { $("note").textContent = t || ""; }

(async function init() {
  const s = await send({ type: "GET_SETTINGS" });
  $("host").textContent = s.apiBase ? s.apiBase.replace(/^https?:\/\//, "") : "not configured";
  const { pendingText } = await chrome.storage.session.get("pendingText");
  if (pendingText) { $("draftText").value = pendingText; chrome.storage.session.remove("pendingText"); }
})();
$("optionsLink").addEventListener("click", (e) => { e.preventDefault(); chrome.runtime.openOptionsPage(); });

$("grabBtn").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, { action: "GET_SELECTION" }, (res) => {
    if (chrome.runtime.lastError || !res || !res.text) return note("Highlight text on the page first (reload the tab if you just installed the extension).");
    note(""); $("draftText").value = res.text; $("verifyBtn").click();
  });
});

$("verifyBtn").addEventListener("click", async () => {
  const text = $("draftText").value.trim();
  if (!text) return note("Enter or highlight text to verify.");
  const btn = $("verifyBtn"); btn.disabled = true; btn.textContent = "Verifying\u2026"; note("");
  const r = await send({ type: "VERIFY", text, title: "Browser Extension Selection", channel: "Browser" });
  btn.disabled = false; btn.textContent = "Verify Claims";
  if (!r.ok) { $("resultsArea").style.display = "none"; return note(r.error); }
  const d = r.data;
  $("resultsArea").style.display = "block";
  $("resultsBody").innerHTML = BLLib.summaryHtml(d) +
    (d.claims.length ? d.claims.map((c) => BLLib.claimHtml(c)).join("") : '<div class="bl-expl">No checkable factual claims detected.</div>');
});

$("resultsBody").addEventListener("click", (e) => {
  const b = e.target.closest(".bl-copy");
  if (b) navigator.clipboard.writeText(b.dataset.copy).then(() => { b.textContent = "Copied"; });
});
