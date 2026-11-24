// Cloudflare Pages Function: visitor tracking for the Admin Panel stats.
// POST {type:"view"|"heartbeat"|"chat", page:"/episodes/ep-79.html", device:"d..."}.
// - view: increments total + per-page view counters, marks the device as a
//   visitor for today (24h expiry), and records it as live right now.
// - heartbeat: refreshes the device's live presence so the header can
//   count how many people are on the site right now.
// - chat: increments the total comment counter (called when a real user
//   posts a message in Fan Chat).
// Live presence lives in Supabase (live_visitors), NOT in KV: KV free tier
// allows 1,000 writes/day and a heartbeat every 30s per visitor eats that
// before evening, so the header count used to die and show "—" / 0.
// View counters still live in the same KV (POLL_KV) as the poll/config.
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
/* Best-effort live presence: one row per device, refreshed on every
   view/heartbeat. Never fails the tracking call if Supabase is down. */
async function sbLive(env, device) {
  if (!sbConfigured(env) || !device) return false;
  try {
    const res = await fetch(sbBase(env) + "live_visitors", { method: "POST", headers: { ...sbHeaders(env), "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates" }, body: JSON.stringify({ device: device, last_seen: new Date().toISOString() }), signal: timeoutSignal(5000) });
    return res.ok;
  } catch (e) { return false; }
}
async function inc(kv, key, by) {
  const cur = parseInt((await kv.get(key)) || "0", 10) || 0;
  await kv.put(key, String(cur + (by || 1)));
  return cur + (by || 1);
}
export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "POST") return json({ error: "method not allowed" }, 405);
  if (!env.POLL_KV) return json({ error: "KV not bound yet" }, 500);
  const kv = env.POLL_KV;
  let body = {};
  try { body = await request.json(); } catch (e) { return json({ error: "bad json" }, 400); }
  const device = String(body.device || "").slice(0, 64);
  const page = String(body.page || "/").slice(0, 200);
  if (body.type === "chat") {
    const total = await inc(kv, "chat:total", 1);
    return json({ ok: true, chatTotal: total });
  }
  if (body.type === "heartbeat") {
    if (device) {
      const ok = await sbLive(env, device);
      if (!ok) await kv.put("live:" + device, "1", { expirationTtl: 120 });
    }
    return json({ ok: true });
  }
  // default: view — record live presence first (Supabase), so the count
  // works even when KV writes are exhausted for the day.
  const liveOk = device ? await sbLive(env, device) : false;
  await inc(kv, "views:total", 1);
  if (page && page.startsWith("/")) await inc(kv, "views:page:" + page, 1);
  if (device) {
    await kv.put("visitors:" + device, "1", { expirationTtl: 86400 });
    if (!liveOk) await kv.put("live:" + device, "1", { expirationTtl: 120 });
  }
  return json({ ok: true });
}
