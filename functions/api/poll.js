// Cloudflare Pages Function: real shared poll votes, 1 vote per device.
// Requires a KV namespace bound as POLL_KV in the Pages project settings.
const NAMES = ["Monami Ghosh","Bharat Kaul","Durnibar Saha","Sohini Paul","Niranjan Mondal (Laughtersane)","Nandini Dutta","Srijla Guha","Dipendu Biswas","Tanushree Roy Das","Sayak Chakraborty","Joyita Chatterjee","Alexandra Taylor","Jhilam Gupta","Sonamoni Saha","Rajveer Dey"];

function json(data, status) {
  return new Response(JSON.stringify(data), { status: status || 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}

async function readCounts(kv) {
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
    const data = await readCounts(kv);
    if (device) data.voted = (await kv.get("voted:" + device)) || null;
    return json(data);
  }
  if (request.method === "POST") {
    let body = {};
    try { body = await request.json(); } catch (e) { return json({ error: "bad json" }, 400); }
    const device = String(body.device || "").slice(0, 64);
    const choice = String(body.choice || "");
    if (!device || !NAMES.includes(choice)) return json({ error: "invalid vote" }, 400);
    if (await kv.get("voted:" + device)) {
      const data = await readCounts(kv);
      data.voted = await kv.get("voted:" + device);
      return json(data);
    }
    const key = "count:" + choice;
    const cur = parseInt((await kv.get(key)) || "0", 10) || 0;
    await kv.put(key, String(cur + 1));
    await kv.put("voted:" + device, choice);
    const data = await readCounts(kv);
    data.voted = choice;
    return json(data);
  }
  return json({ error: "method not allowed" }, 405);
}
