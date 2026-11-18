// Cloudflare Pages Function: aggregated site statistics for the Admin Panel.
// GET returns total views, unique visitors (last 24h), top pages, live
// viewers right now, total Fan Chat comments, poll votes, app installs and
// an ESTIMATED bandwidth figure (views x average page weight — labelled as
// an estimate, because Cloudflare's free tier does not expose real per-site
// bandwidth to this function). Also reports API/KV health.
function json(data, status) {
  return new Response(JSON.stringify(data), { status: status || 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
export async function onRequest(context) {
  const { env } = context;
  if (!env.POLL_KV) return json({ error: "KV not bound yet", kv: false }, 500);
  const kv = env.POLL_KV;
  const num = async (k) => parseInt((await kv.get(k)) || "0", 10) || 0;
  const totalViews = await num("views:total");
  const chatTotal = await num("chat:total");
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
  // poll votes total
  let pollVotes = 0;
  const counts = await kv.list({ prefix: "count:", limit: 1000 });
  for (const k of counts.keys) pollVotes += parseInt((await kv.get(k.name)) || "0", 10) || 0;
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
