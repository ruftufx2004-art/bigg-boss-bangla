// Cloudflare Pages Function: real shared poll votes, 1 vote per device.
// Votes live in Supabase (tables poll_votes + poll_voters) — no KV daily
// write limit, so votes keep working when the KV limit breaks.
// Poll NAMES still come from KV (cfg:pollNames, read-only here), set by the
// Admin Panel via /api/config, same as before.
// Frontend contract unchanged: GET returns {counts, total, voted},
// POST {device, choice} returns the same shape.
// (Also fixes the old NAMES-before-definition bug in the POST path.)
const FALLBACK = ["Monami Ghosh","Durnibar Saha","Niranjan Mondal (Laughtersane)","Tanushree Roy Das","Srijla Guha","Rajveer Dey","Jeetu Kamal","Sourav Das","Ranieeta Dash"];
async function loadNames(kv) {
  try { const raw = await kv.get("cfg:pollNames"); if (raw) { const a = JSON.parse(raw); if (Array.isArray(a) && a.length) return a; } } catch (e) {}
  return FALLBACK;
}

function json(data, status) {
  return new Response(JSON.stringify(data), { status: status || 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
function sbConfigured(env) {
  return !!(env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY);
}
// AbortSignal.timeout is not available in every Workers runtime version —
// guard it so a missing API can never break the Supabase call itself.
function timeoutSignal(ms) {
  try { if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") return AbortSignal.timeout(ms); } catch (e) {}
  return undefined;
}
function sbHeaders(env) {
  return { "apikey": env.SUPABASE_SERVICE_KEY, "Authorization": "Bearer " + env.SUPABASE_SERVICE_KEY, "Accept": "application/json" };
}
function sbBase(env) {
  return env.SUPABASE_URL.replace(/\/$/, "") + "/rest/v1/";
}
async function sbReq(env, path, opts) {
  const res = await fetch(sbBase(env) + path, { ...(opts || {}), headers: { ...sbHeaders(env), ...((opts && opts.headers) || {}) }, signal: timeoutSignal(8000) });
  return res;
}

async function readCounts(env, NAMES) {
  const res = await sbReq(env, "poll_votes?select=name,count");
  if (!res.ok) throw new Error("poll_votes read failed: " + res.status);
  const rows = await res.json();
  const counts = {};
  let total = 0;
  for (const n of NAMES) counts[n] = 0;
  for (const r of rows || []) {
    if (r && typeof r.name === "string" && Object.prototype.hasOwnProperty.call(counts, r.name)) {
      const v = parseInt(r.count, 10) || 0;
      counts[r.name] = v; total += v;
    }
  }
  return { counts, total };
}
async function readVoted(env, kv, device) {
  if (!device) return null;
  try {
    const res = await sbReq(env, "poll_voters?device=eq." + encodeURIComponent(device) + "&select=choice");
    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length && typeof rows[0].choice === "string") return rows[0].choice;
    }
  } catch (e) {}
  // Migration bridge: votes cast before the Supabase move live in KV
  // (voted:<device>). A device that already voted there must not vote again.
  try { const old = await kv.get("voted:" + device); if (old) return old; } catch (e) {}
  return null;
}

export async function onRequest(context) {
  const { request, env } = context;
  if (!env.POLL_KV) return json({ error: "KV not bound yet" }, 500);
  if (!sbConfigured(env)) return json({ error: "Supabase not configured" }, 500);
  const kv = env.POLL_KV;
  if (request.method === "GET") {
    const url = new URL(request.url);
    const device = url.searchParams.get("device") || "";
    const NAMES = await loadNames(kv);
    let data;
    try { data = await readCounts(env, NAMES); } catch (e) { return json({ error: "poll read failed" }, 500); }
    if (device) data.voted = await readVoted(env, kv, device);
    return json(data);
  }
  if (request.method === "POST") {
    let body = {};
    try { body = await request.json(); } catch (e) { return json({ error: "bad json" }, 400); }
    const device = String(body.device || "").slice(0, 64);
    const choice = String(body.choice || "");
    const NAMES = await loadNames(kv);
    if (!device || !NAMES.includes(choice)) return json({ error: "invalid vote" }, 400);
    const already = await readVoted(env, kv, device);
    if (already) {
      let data;
      try { data = await readCounts(env, NAMES); } catch (e) { return json({ error: "poll read failed" }, 500); }
      data.voted = already;
      return json(data);
    }
    try {
      const ins = await sbReq(env, "poll_voters", { method: "POST", headers: { "Content-Type": "application/json", "Prefer": "return=representation" }, body: JSON.stringify({ device: device, choice: choice }) });
      if (!ins.ok) return json({ error: "vote save failed" }, 500);
      const cur = await sbReq(env, "poll_votes?name=eq." + encodeURIComponent(choice) + "&select=count");
      let curCount = 0;
      if (cur.ok) {
        const rows = await cur.json();
        if (Array.isArray(rows) && rows.length) curCount = parseInt(rows[0].count, 10) || 0;
      }
      const upd = await sbReq(env, "poll_votes?name=eq." + encodeURIComponent(choice), { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ count: curCount + 1 }) });
      if (!upd.ok) return json({ error: "vote save failed" }, 500);
    } catch (e) { return json({ error: "vote save failed" }, 500); }
    let data;
    try { data = await readCounts(env, NAMES); } catch (e) { return json({ error: "poll read failed" }, 500); }
    data.voted = choice;
    return json(data);
  }
  return json({ error: "method not allowed" }, 405);
}
