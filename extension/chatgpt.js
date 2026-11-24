// ChatGPT integration: adds a "Verify with BrandLedger" bar under each assistant answer,
// sends the answer to the hosted Guard API, and renders one card per extracted claim.
(function () {
  const L = window.BLLib, P = "bl";
  const SEL = '[data-message-author-role="assistant"]';
  const seen = new WeakMap(); // message element -> { bar, panel, lastText }
  let autoVerify = false;

  const send = (m) => new Promise((r) => chrome.runtime.sendMessage(m, (x) => r(x || { ok: false, error: chrome.runtime.lastError?.message || "No response from extension" })));

  function textOf(el) { return (el.innerText || "").trim(); }

  function attach(msg) {
    if (seen.has(msg)) return;
    const bar = document.createElement("div");
    bar.className = P + "-bar";
    bar.innerHTML = '<button class="' + P + '-btn">\uD83D\uDEE1\uFE0F Verify with BrandLedger</button><span class="' + P + '-status"></span>';
    const panel = document.createElement("div");
    panel.className = P + "-panel";
    panel.hidden = true;
    msg.insertAdjacentElement("afterend", panel);
    msg.insertAdjacentElement("afterend", bar);
    const st = { bar, panel, lastText: "", timer: null, busy: false };
    seen.set(msg, st);
    bar.querySelector("button").addEventListener("click", () => run(msg, true));
    panel.addEventListener("click", (e) => {
      const b = e.target.closest("." + P + "-copy");
      if (b) { navigator.clipboard.writeText(b.dataset.copy).then(() => { b.textContent = "Copied"; setTimeout(() => (b.textContent = "Copy"), 1200); }); }
    });
  }

  async function run(msg, manual) {
    const st = seen.get(msg), text = textOf(msg);
    if (!st || st.busy || !text || (!manual && text === st.lastText)) return;
    st.busy = true;
    const status = st.bar.querySelector("." + P + "-status");
    status.textContent = "Verifying\u2026";
    const r = await send({ type: "VERIFY", text, title: "ChatGPT response", channel: "ChatGPT" });
    st.busy = false;
    st.panel.hidden = false;
    if (!r.ok) {
      status.textContent = "";
      st.panel.innerHTML = '<div class="' + P + '-error">' + L.escapeHtml(r.error) + (r.code === "NOT_CONFIGURED" ? ' <a href="#" class="' + P + '-opts">Open options</a>' : "") + "</div>";
      const a = st.panel.querySelector("." + P + "-opts");
      if (a) a.addEventListener("click", (e) => { e.preventDefault(); chrome.runtime.sendMessage({ type: "OPEN_OPTIONS" }); });
      return;
    }
    st.lastText = text;
    const d = r.data;
    status.textContent = "";
    st.panel.innerHTML = L.summaryHtml(d, P) +
      (d.claims.length ? d.claims.map((c) => L.claimHtml(c, P)).join("") : '<div class="' + P + '-expl">No checkable factual claims found in this answer.</div>');
  }

  function scan() {
    document.querySelectorAll(SEL).forEach((m) => {
      attach(m);
      if (!autoVerify) return;
      const st = seen.get(m);
      clearTimeout(st.timer);
      // Wait until streaming has stopped (no DOM changes for 2.5s) before auto-verifying.
      st.timer = setTimeout(() => run(m, false), 2500);
    });
  }

  chrome.storage.sync.get({ autoVerify: false }, (s) => { autoVerify = !!s.autoVerify; scan(); });
  chrome.storage.onChanged.addListener((c) => { if (c.autoVerify) autoVerify = !!c.autoVerify.newValue; });

  let t;
  new MutationObserver(() => { clearTimeout(t); t = setTimeout(scan, 400); })
    .observe(document.body, { childList: true, subtree: true, characterData: true });
})();
