// Cloudflare Pages Function: visitor tracking for the Admin Panel stats.
// POST {type:"view"|"heartbeat"|"chat", page:"/episodes/ep-79.html", device:"d..."}.
// - view: increments total + per-page view counters, marks the device as a
//   visitor for today (24h expiry), and refreshes its live heartbeat.
// - heartbeat: refreshes the device's live key (120s expiry) so the admin
//   panel can count how many people are on the site right now.
// - chat: increments the total comment counter (called when a real user
//   posts a message in Fan Chat).
// Counters live in the same KV (POLL_KV) as the poll/config.
function json(data, status) {
  return new Response(JSON.stringify(data), { status: status || 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
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
    if (device) await kv.put("live:" + device, "1", { expirationTtl: 120 });
    return json({ ok: true });
  }
  // default: view
  await inc(kv, "views:total", 1);
  if (page && page.startsWith("/")) await inc(kv, "views:page:" + page, 1);
  if (device) {
    await kv.put("visitors:" + device, "1", { expirationTtl: 86400 });
    await kv.put("live:" + device, "1", { expirationTtl: 120 });
  }
  return json({ ok: true });
}
