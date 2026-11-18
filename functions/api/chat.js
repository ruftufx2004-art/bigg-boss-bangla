// Cloudflare Pages Function: real shared Fan Chat for the homepage.
// GET returns the latest messages (oldest first, newest last).
// POST adds a message/reply, or toggles a like/reaction (one per device
// per message, like Facebook — so every count shown is real).
// Messages live in one KV key (chat:messages), capped at the latest 100.
// Spam guard: one message per device per 5 seconds.
const MAX_MSG = 100;
const REACTS = ["👍", "❤️", "😂", "😮", "😢", "😡"];
function json(data, status) {
  return new Response(JSON.stringify(data), { status: status || 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
function clean(s) { return String(s || "").replace(/[\u0000-\u001F\u007F]/g, "").trim(); }
async function loadMsgs(kv) {
  try { const a = JSON.parse((await kv.get("chat:messages")) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; }
}
async function saveMsgs(kv, msgs) { await kv.put("chat:messages", JSON.stringify(msgs.slice(-MAX_MSG))); }
export async function onRequest(context) {
  const { request, env } = context;
  if (!env.POLL_KV) return json({ error: "KV not bound yet" }, 500);
  const kv = env.POLL_KV;
  if (request.method === "GET") {
    const msgs = await loadMsgs(kv);
    return json({ ok: true, messages: msgs });
  }
  if (request.method !== "POST") return json({ error: "method not allowed" }, 405);
  let body = {};
  try { body = await request.json(); } catch (e) { return json({ error: "bad json" }, 400); }
  const device = clean(body.device).slice(0, 64);
  if (!device) return json({ error: "no device" }, 400);
  const msgs = await loadMsgs(kv);
  // --- like / reaction toggle ---
  if (body.action === "like" || body.action === "react") {
    const m = msgs.find(function (x) { return x.id === body.id; });
    if (!m) return json({ error: "not found" }, 404);
    m.likes = m.likes || [];
    m.reacts = m.reacts || {};
    if (body.action === "like") {
      const i = m.likes.indexOf(device);
      if (i >= 0) m.likes.splice(i, 1); else m.likes.push(device);
      for (const k of Object.keys(m.reacts)) { const j = m.reacts[k].indexOf(device); if (j >= 0) m.reacts[k].splice(j, 1); }
    } else {
      const em = REACTS.includes(body.emoji) ? body.emoji : "❤️";
      let had = false;
      for (const k of Object.keys(m.reacts)) { const j = m.reacts[k].indexOf(device); if (j >= 0) { m.reacts[k].splice(j, 1); if (k === em) had = true; } }
      if (!had) { m.reacts[em] = m.reacts[em] || []; m.reacts[em].push(device); }
      const i = m.likes.indexOf(device); if (i >= 0) m.likes.splice(i, 1);
    }
    await saveMsgs(kv, msgs);
    return json({ ok: true, message: m });
  }
  // --- new message / reply ---
  const text = clean(body.text).slice(0, 200);
  const name = clean(body.name).slice(0, 20) || "Fan";
  if (!text) return json({ error: "empty" }, 400);
  const last = parseInt((await kv.get("chat:last:" + device)) || "0", 10);
  if (Date.now() - last < 5000) return json({ error: "too fast" }, 429);
  const parent = clean(body.parent || "");
  if (parent && !msgs.find(function (x) { return x.id === parent; })) return json({ error: "no parent" }, 400);
  const msg = {
    id: "m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    name: name, text: text, t: Date.now(), parent: parent || null, likes: [], reacts: {}
  };
  msgs.push(msg);
  await saveMsgs(kv, msgs);
  await kv.put("chat:last:" + device, String(Date.now()), { expirationTtl: 10 });
  const cur = parseInt((await kv.get("chat:total")) || "0", 10) || 0;
  await kv.put("chat:total", String(cur + 1));
  return json({ ok: true, message: msg });
}
