// Cloudflare Pages Function: aggregated site statistics for the Admin Panel.
// GET returns total views, unique visitors (last 24h), top pages, live
// viewers right now, total Fan Chat comments, poll votes, app installs and
// an ESTIMATED bandwidth figure (views x average page weight — labelled as
// an estimate, because Cloudflare's free tier does not expose real per-site
// bandwidth to this function). Also reports API/KV health.
// Chat + poll totals come from Supabase (votes/chat moved there 2026-11-22);
// everything else still reads KV. If Supabase is not configured, the totals
// fall back to the old KV keys.
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
export async function onRequest(context) {
  const { env } = context;
  if (!env.POLL_KV) return json({ error: "KV not bound yet", kv: false }, 500);
  const kv = env.POLL_KV;
  const num = async (k) => parseInt((await kv.get(k)) || "0", 10) || 0;
  const totalViews = await num("views:total");
  // KV fallback totals (used when Supabase is not configured).
  let chatTotal = await num("chat:total");
  let pollVotes = 0;
  const counts = await kv.list({ prefix: "count:", limit: 1000 });
  for (const k of counts.keys) pollVotes += parseInt((await kv.get(k.name)) || "0", 10) || 0;
  if (sbConfigured(env)) {
    try {
      const cr = await fetch(sbBase(env) + "chat_messages?select=id&limit=1", { headers: { ...sbHeaders(env), "Prefer": "count=exact" }, signal: timeoutSignal(5000) });
      const range = cr.headers.get("content-range") || "";
      const n = parseInt((range.split("/")[1] || ""), 10);
      if (!isNaN(n)) chatTotal = n;
    } catch (e) {}
    try {
      const pr = await fetch(sbBase(env) + "poll_votes?select=count", { headers: sbHeaders(env), signal: timeoutSignal(5000) });
      if (pr.ok) {
        const rows = await pr.json();
        let sum = 0;
        for (const r of rows || []) sum += parseInt(r.count, 10) || 0;
        pollVotes = sum;
      }
    } catch (e) {}
  }
  // unique visitors (device keys seen in the last 24h)
  const vis = await kv.list({ prefix: "visitors:", limit: 1000 });
  const uniqueVisitors = vis.keys.length;
  // people on the site right now (heartbeat keys, 120s TTL)
  const live = await kv.list({ prefix: "live:", limit: 1000 });
  const liveNow = live.keys.length;
  // top pages by views
  const pages = await kv.list({ prefix: "views:page:", limit: 1000 });
  const topPages = [];
  for (const k of pages.keys) {
    const v = parseInt((await kv.get(k.name)) || "0", 10) || 0;
    if (v > 0) topPages.push({ page: k.name.replace("views:page:", ""), views: v });
  }
  topPages.sort((a, b) => b.views - a.views);
  // app installs
  const installed = await num("install:installed");
  const cancelled = await num("install:cancelled");
  // Estimated bandwidth: average page weight ~220 KB (HTML + fonts + icons).
  // This is an ESTIMATE, not a metered figure.
  const avgPageKB = 220;
  const estBandwidthKB = totalViews * avgPageKB;
  return json({
    ok: true,
    kv: true,
    at: new Date().toISOString(),
    totalViews,
    uniqueVisitors,
    liveNow,
    chatTotal,
    pollVotes,
    installed,
    cancelled,
    topPages: topPages.slice(0, 10),
    bandwidth: { estimated: true, kb: estBandwidthKB, mb: Math.round(estBandwidthKB / 102.4) / 10, note: "আনুমানিক — মোট ভিউ × গড় পেজ সাইজ (~220 KB)। আসল ব্যান্ডউইথ Cloudflare ড্যাশবোর্ডে দেখা যায়।" },
  });
}
