// Cloudflare Pages Function: PWA install / cancel counts, 1 count per device.
// GET  -> { installed, cancelled }
// POST -> { device, action: "installed" | "cancelled" } — per-device dedupe:
//         a device switching from cancelled to installed moves its count.
function json(data, status) {
  return new Response(JSON.stringify(data), { status: status || 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}

async function readCounts(kv) {
  const installed = parseInt((await kv.get("install:installed")) || "0", 10) || 0;
  const cancelled = parseInt((await kv.get("install:cancelled")) || "0", 10) || 0;
  return { installed, cancelled };
}

export async function onRequest(context) {
  const { request, env } = context;
  if (!env.POLL_KV) return json({ error: "KV not bound yet" }, 500);
  const kv = env.POLL_KV;
  if (request.method === "GET") return json(await readCounts(kv));
  if (request.method === "POST") {
    let body = {};
    try { body = await request.json(); } catch (e) { return json({ error: "bad json" }, 400); }
    const device = String(body.device || "").slice(0, 64);
    const action = String(body.action || "");
    if (!device || (action !== "installed" && action !== "cancelled")) return json({ error: "invalid" }, 400);
    const prev = await kv.get("install:device:" + device);
    if (prev === action) return json(await readCounts(kv));
    const counts = await readCounts(kv);
    if (prev === "installed") counts.installed = Math.max(0, counts.installed - 1);
    if (prev === "cancelled") counts.cancelled = Math.max(0, counts.cancelled - 1);
    if (action === "installed") counts.installed += 1; else counts.cancelled += 1;
    await kv.put("install:installed", String(counts.installed));
    await kv.put("install:cancelled", String(counts.cancelled));
    await kv.put("install:device:" + device, action);
    return json(counts);
  }
  return json({ error: "method not allowed" }, 405);
}
