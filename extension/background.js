// Manifest V3 service worker: the ONLY place that talks to the hosted API.
// Content scripts / popup send messages here, so page CSP and mixed-content rules never interfere.
importScripts("lib.js");

async function getSettings() {
  const s = await chrome.storage.sync.get({ apiBase: "", apiKey: "", autoVerify: false });
  return { apiBase: BLLib.normalizeBase(s.apiBase), apiKey: s.apiKey || "", autoVerify: !!s.autoVerify };
}

function headers(key) {
  const h = { "Content-Type": "application/json" };
  if (key) h["X-BrandLedger-Key"] = key;
  return h;
}

async function verify(text, title, channel) {
  const { apiBase, apiKey } = await getSettings();
  if (!apiBase) return { ok: false, code: "NOT_CONFIGURED", error: "Set your hosted API URL in the extension options." };
  try {
    const res = await BLLib.fetchWithRetry(apiBase + "/api/v1/guard", {
      method: "POST", headers: headers(apiKey),
      body: JSON.stringify({ content: text.slice(0, 20000), title: title || "Browser Extension", channel: channel || "Browser" })
    });
    if (res.status === 401) return { ok: false, code: "AUTH", error: "API key rejected. Check the key in options." };
    if (!res.ok) return { ok: false, code: "HTTP_" + res.status, error: "API returned " + res.status + "." };
    return { ok: true, data: await res.json() };
  } catch (e) {
    return { ok: false, code: "NETWORK", error: "Could not reach " + apiBase + " (" + e.message + ")." };
  }
}

async function health(base, key) {
  base = BLLib.normalizeBase(base);
  if (!base) return { ok: false, error: "Enter an API URL first." };
  try {
    const res = await BLLib.fetchWithRetry(base + "/api/v1/health", { headers: headers(key) }, { retries: 1, timeoutMs: 15000 });
    if (!res.ok) return { ok: false, error: "Health check returned " + res.status };
    return { ok: true, data: await res.json() };
  } catch (e) { return { ok: false, error: e.message }; }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "VERIFY") verify(msg.text, msg.title, msg.channel).then(sendResponse);
  else if (msg.type === "HEALTH") health(msg.apiBase, msg.apiKey).then(sendResponse);
  else if (msg.type === "OPEN_OPTIONS") { chrome.runtime.openOptionsPage(); return false; }
  else if (msg.type === "GET_SETTINGS") getSettings().then(sendResponse);
  else return false;
  return true; // async response
});

chrome.runtime.onInstalled.addListener((d) => {
  chrome.contextMenus.create({ id: "brandledger_verify_selection", title: "Verify with BrandLedger Guard", contexts: ["selection"] });
  if (d.reason === "install") chrome.runtime.openOptionsPage();
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId === "brandledger_verify_selection" && info.selectionText) {
    await chrome.storage.session.set({ pendingText: info.selectionText });
    try { await chrome.action.openPopup(); } catch (_) { /* needs a focused window; popup will prefill next open */ }
  }
});
