// Run: node extension/test/test_extension.js   (no dependencies)
// Unit-tests the client logic and drives background.js against a local HTTP server that
// follows the /api/v1/guard + /health contract. It does NOT test the real backend or ChatGPT's live DOM.
const assert = require("assert"), http = require("http"), vm = require("vm"), fs = require("fs"), path = require("path");
const L = require("../lib.js");
let pass = 0; const ok = (n, f) => Promise.resolve(f()).then(() => { pass++; console.log("  ok  " + n); });

const guardReply = {
  draft_id: "d1", total_claims: 3, verified_claims: 1, flagged_claims: 1, abstained_claims: 1, trust_score: 50.0,
  claims: [
    { claim_id: "a", claim_text: "$99/month", status: "FLAGGED", explanation: "Price mismatch", suggested_fix: "$149/month", source_id: "F-001", source_quote: "Pro plan is $149/month", source_owner: "pricing@x.com" },
    { claim_id: "b", claim_text: "99.9% uptime", status: "VERIFIED", explanation: "Matches SLA", source_id: "F-002", source_quote: "SLA is 99.9%" },
    { claim_id: "c", claim_text: "<img src=x onerror=alert(1)>", status: "WEIRD", explanation: "x" }
  ]
};

(async () => {
  await ok("escapes HTML (XSS) in claim text", () => assert(!L.claimHtml(guardReply.claims[2]).includes("<img")));
  await ok("unknown status fails safe to ABSTAIN", () => assert.strictEqual(L.normStatus("WEIRD"), "ABSTAIN"));
  await ok("FLAGGED card shows correction + evidence", () => {
    const h = L.claimHtml(guardReply.claims[0]);
    assert(h.includes("$149/month") && h.includes("Pro plan is $149/month") && h.includes("pricing@x.com") && h.includes("FLAGGED"));
  });
  await ok("VERIFIED card shows evidence but no correction", () => {
    const h = L.claimHtml(guardReply.claims[1]);
    assert(h.includes("SLA is 99.9%") && !h.includes("Approved correction"));
  });
  await ok("normalizeBase strips /api/v1 and trailing slash, adds https", () => {
    assert.strictEqual(L.normalizeBase("my.onrender.com/api/v1/guard/"), "https://my.onrender.com");
  });
  await ok("localhost detected", () => { assert(L.isLocal("http://localhost:8000")); assert(!L.isLocal("https://a.onrender.com")); });

  let n = 0;
  await ok("retries 503 then succeeds", async () => {
    const f = async () => (++n < 3 ? { status: 503 } : { status: 200, ok: true });
    const r = await L.fetchWithRetry("u", {}, { fetch: f, backoffMs: 1 }); assert.strictEqual(r.status, 200); assert.strictEqual(n, 3);
  });
  await ok("does not retry 401", async () => {
    let c = 0; const r = await L.fetchWithRetry("u", {}, { fetch: async () => (++c, { status: 401 }), backoffMs: 1 });
    assert.strictEqual(r.status, 401); assert.strictEqual(c, 1);
  });
  await ok("gives up after retries on network error", async () => {
    await assert.rejects(L.fetchWithRetry("u", {}, { fetch: async () => { throw new Error("down"); }, retries: 1, backoffMs: 1 }), /down/);
  });
  await ok("timeout aborts hung request", async () => {
    const f = (u, o) => new Promise((_, rej) => o.signal.addEventListener("abort", () => rej(Object.assign(new Error("a"), { name: "AbortError" }))));
    await assert.rejects(L.fetchWithRetry("u", {}, { fetch: f, retries: 0, timeoutMs: 30 }), /timed out/);
  });

  // --- background.js against a local contract server ---
  const seen = [];
  const srv = http.createServer((req, res) => {
    let b = ""; req.on("data", (d) => (b += d)); req.on("end", () => {
      seen.push({ url: req.url, key: req.headers["x-brandledger-key"], body: b });
      res.setHeader("content-type", "application/json");
      if (req.url === "/api/v1/health") return res.end(JSON.stringify({ status: "ok", database: "postgresql", database_ok: true, active_facts: 12, auth_required: true }));
      if (req.headers["x-brandledger-key"] !== "secret") { res.statusCode = 401; return res.end("{}"); }
      res.end(JSON.stringify(guardReply));
    });
  }).listen(0);
  await new Promise((r) => srv.on("listening", r));
  const base = "http://127.0.0.1:" + srv.address().port;
  const store = { apiBase: base, apiKey: "secret", autoVerify: false };
  let listener;
  const ctx = { console, URL, AbortController, setTimeout, clearTimeout, fetch, self: {}, module: undefined,
    importScripts: () => { vm.runInContext(fs.readFileSync(path.join(__dirname, "../lib.js"), "utf8"), ctx); ctx.BLLib = ctx.self.BLLib; },
    chrome: { storage: { sync: { get: async (d) => ({ ...d, ...store }) }, session: { set: async () => {} } },
      runtime: { onMessage: { addListener: (f) => (listener = f) }, onInstalled: { addListener() {} }, openOptionsPage() {} },
      contextMenus: { create() {}, onClicked: { addListener() {} } }, action: {} } };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../background.js"), "utf8"), ctx);
  const call = (m) => new Promise((r) => listener(m, {}, r));

  await ok("VERIFY posts to /api/v1/guard with key + channel=ChatGPT and returns claims", async () => {
    const r = await call({ type: "VERIFY", text: "Pro costs $99/month", title: "ChatGPT response", channel: "ChatGPT" });
    assert(r.ok, JSON.stringify(r)); assert.strictEqual(r.data.claims.length, 3);
    const s = seen.find((x) => x.url === "/api/v1/guard"); assert.strictEqual(s.key, "secret");
    assert.strictEqual(JSON.parse(s.body).channel, "ChatGPT");
  });
  await ok("wrong key -> AUTH error (no retry loop)", async () => {
    store.apiKey = "nope"; const before = seen.length;
    const r = await call({ type: "VERIFY", text: "x" }); assert.strictEqual(r.code, "AUTH"); assert.strictEqual(seen.length - before, 1);
    store.apiKey = "secret";
  });
  await ok("HEALTH reports database", async () => {
    const r = await call({ type: "HEALTH", apiBase: base, apiKey: "" }); assert(r.ok && r.data.database === "postgresql");
  });
  await ok("unconfigured -> NOT_CONFIGURED", async () => {
    store.apiBase = ""; const r = await call({ type: "VERIFY", text: "x" }); assert.strictEqual(r.code, "NOT_CONFIGURED"); store.apiBase = base;
  });
  await ok("server down -> NETWORK error with clear message", async () => {
    store.apiBase = "http://127.0.0.1:1"; const r = await call({ type: "VERIFY", text: "x" });
    assert.strictEqual(r.code, "NETWORK"); store.apiBase = base;
  });
  srv.close();
  console.log("\n" + pass + " tests passed");
})().catch((e) => { console.error("FAIL:", e); process.exit(1); });
