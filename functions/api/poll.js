// Cloudflare Pages Function: real shared poll votes, 1 vote per device.
// Requires a KV namespace bound as POLL_KV in the Pages project settings.
const FALLBACK = ["Monami Ghosh","Durnibar Saha","Niranjan Mondal (Laughtersane)","Tanushree Roy Das","Srijla Guha","Rajveer Dey","Jeetu Kamal","Sourav Das","Ranieeta Dash"];
async function loadNames(kv) {
  try { const raw = await kv.get("cfg:pollNames"); if (raw) { const a = JSON.parse(raw); if (Array.isArray(a) && a.length) return a; } } catch (e) {}
  return FALLBACK;
}

function json(data, status) {
  return new Response(JSON.stringify(data), { status: status || 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}

async function readCounts(kv, NAMES) {
  const counts = {};
  let total = 0;
  for (const n of NAMES) {
    const v = parseInt((await kv.get("count:" + n)) || "0", 10) || 0;
    counts[n] = v; total += v;
  }
  return { counts, total };
}

export async function onRequest(context) {
  const { request, env } = context;
  if (!env.POLL_KV) return json({ error: "KV not bound yet" }, 500);
  const kv = env.POLL_KV;
  if (request.method === "GET") {
    const url = new URL(request.url);
    const device = url.searchParams.get("device") || "";
    const NAMES = await loadNames(kv);
    const data = await readCounts(kv, NAMES);
    if (device) data.voted = (await kv.get("voted:" + device)) || null;
    return json(data);
  }
  if (request.method === "POST") {
    let body = {};
    try { body = await request.json(); } catch (e) { return json({ error: "bad json" }, 400); }
    const device = String(body.device || "").slice(0, 64);
    const choice = String(body.choice || "");
    if (!device || !NAMES.includes(choice)) return json({ error: "invalid vote" }, 400);
    const NAMES = await loadNames(kv);
    if (await kv.get("voted:" + device)) {
      const data = await readCounts(kv, NAMES);
      data.voted = await kv.get("voted:" + device);
      return json(data);
    }
    const key = "count:" + choice;
    const cur = parseInt((await kv.get(key)) || "0", 10) || 0;
    await kv.put(key, String(cur + 1));
    await kv.put("voted:" + device, choice);
    const data = await readCounts(kv, NAMES);
    data.voted = choice;
    return json(data);
  }
  return json({ error: "method not allowed" }, 405);
}
