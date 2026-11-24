const $ = (id) => document.getElementById(id);
const show = (t, ok) => { $("msg").textContent = t; $("msg").className = ok ? "ok" : "err"; };

chrome.storage.sync.get({ apiBase: "", apiKey: "", autoVerify: false }, (s) => {
  $("apiBase").value = s.apiBase; $("apiKey").value = s.apiKey; $("auto").checked = s.autoVerify;
});

async function ensurePermission(base) {
  const origin = new URL(base).origin + "/*";
  if (await chrome.permissions.contains({ origins: [origin] })) return true;
  return chrome.permissions.request({ origins: [origin] }); // must be called from a click handler
}

$("test").addEventListener("click", async () => {
  const base = BLLib.normalizeBase($("apiBase").value);
  if (!base) return show("Enter your hosted API URL.", false);
  if (BLLib.isLocal(base)) return show("Localhost is not supported. Use your public HTTPS URL.", false);
  if (!(await ensurePermission(base))) return show("Permission to contact that host was denied.", false);
  show("Testing\u2026", true);
  chrome.runtime.sendMessage({ type: "HEALTH", apiBase: base, apiKey: $("apiKey").value.trim() }, (r) => {
    if (!r || !r.ok) return show("Failed: " + ((r && r.error) || chrome.runtime.lastError?.message), false);
    const d = r.data;
    show(`Connected. Database: ${d.database} (${d.database_ok ? "ok" : "ERROR"}), active facts: ${d.active_facts}, auth required: ${d.auth_required}.`, d.database_ok);
  });
});

$("save").addEventListener("click", async () => {
  const base = BLLib.normalizeBase($("apiBase").value);
  if (!base) return show("Enter your hosted API URL.", false);
  if (BLLib.isLocal(base)) return show("Localhost is not supported. Use your public HTTPS URL.", false);
  if (!/^https:\/\//.test(base)) return show("The hosted API must use HTTPS.", false);
  if (!(await ensurePermission(base))) return show("Permission to contact that host was denied.", false);
  await chrome.storage.sync.set({ apiBase: base, apiKey: $("apiKey").value.trim(), autoVerify: $("auto").checked });
  $("apiBase").value = base;
  show("Saved.", true);
});
