// Cloudflare Pages Function: real shared Fan Chat for the homepage.
// Messages live in Supabase (table chat_messages) — no KV daily write
// limit, so chat keeps working when the KV limit breaks.
// Spam guard in chat_rate (one message per device per 5 seconds).
// GET returns the latest messages (oldest first, newest last).
// POST adds a message/reply, or toggles a like/reaction (one per device
// per message, like Facebook — so every count shown is real).
// Messages capped at the latest 100. Frontend contract unchanged:
// GET {ok, messages}; POST {ok, message}.
const MAX_MSG = 100;
const REACTS = ["👍", "❤️", "😂", "😮", "😢", "😡"];
function json(data, status) {
  return new Response(JSON.stringify(data), { status: status || 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
function clean(s) { return String(s || "").replace(/[\u0000-\u001F\u007F]/g, "").trim(); }
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
function normMsg(m) {
  return {
    id: m.id, name: m.name, text: m.text, t: m.t, parent: m.parent || null,
    likes: Array.isArray(m.likes) ? m.likes : [],
    reacts: (m.reacts && typeof m.reacts === "object") ? m.reacts : {}
  };
}
async function loadMsgs(env) {
  const res = await sbReq(env, "chat_messages?select=id,name,text,t,parent,likes,reacts&order=t.desc&limit=" + MAX_MSG);
  if (!res.ok) throw new Error("chat read failed: " + res.status);
  const rows = await res.json();
  const list = (Array.isArray(rows) ? rows : []).reverse();
  return list.map(normMsg);
}
// Keep only the latest MAX_MSG rows (best effort — never fails a post).
async function trimMsgs(env) {
  try {
    const res = await sbReq(env, "chat_messages?select=id&limit=1", { headers: { "Prefer": "count=exact" } });
    const range = res.headers.get("content-range") || "";
    const total = parseInt((range.split("/")[1] || "0"), 10) || 0;
    if (total > MAX_MSG) {
      await sbReq(env, "chat_messages?order=t.asc&limit=" + (total - MAX_MSG), { method: "DELETE" });
    }
  } catch (e) {}
}
export async function onRequest(context) {
  const { request, env } = context;
  if (!sbConfigured(env)) return json({ error: "Supabase not configured" }, 500);
  if (request.method === "GET") {
    let msgs;
    try { msgs = await loadMsgs(env); } catch (e) { return json({ error: "chat read failed" }, 500); }
    return json({ ok: true, messages: msgs });
  }
  if (request.method !== "POST") return json({ error: "method not allowed" }, 405);
  let body = {};
  try { body = await request.json(); } catch (e) { return json({ error: "bad json" }, 400); }
  const device = clean(body.device).slice(0, 64);
  if (!device) return json({ error: "no device" }, 400);
  // --- like / reaction toggle ---
  if (body.action === "like" || body.action === "react") {
    let m;
    try {
      const res = await sbReq(env, "chat_messages?id=eq." + encodeURIComponent(body.id) + "&select=id,name,text,t,parent,likes,reacts");
      if (!res.ok) return json({ error: "chat read failed" }, 500);
      const rows = await res.json();
      if (!Array.isArray(rows) || !rows.length) return json({ error: "not found" }, 404);
      m = normMsg(rows[0]);
    } catch (e) { return json({ error: "chat read failed" }, 500); }
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
    let upd;
    try {
      upd = await sbReq(env, "chat_messages?id=eq." + encodeURIComponent(m.id), { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ likes: m.likes, reacts: m.reacts }) });
    } catch (e) { return json({ error: "chat save failed" }, 500); }
    if (!upd.ok) return json({ error: "chat save failed" }, 500);
    return json({ ok: true, message: m });
  }
  // --- new message / reply ---
  const text = clean(body.text).slice(0, 200);
  const name = clean(body.name).slice(0, 20) || "Fan";
  if (!text) return json({ error: "empty" }, 400);
  try {
    const rateRes = await sbReq(env, "chat_rate?device=eq." + encodeURIComponent(device) + "&select=last_ms");
    if (rateRes.ok) {
      const rows = await rateRes.json();
      if (Array.isArray(rows) && rows.length) {
        const last = parseInt(rows[0].last_ms, 10) || 0;
        if (Date.now() - last < 5000) return json({ error: "too fast" }, 429);
      }
    }
  } catch (e) {}
  const msgs = await loadMsgs(env).catch(function () { return []; });
  const parent = clean(body.parent || "");
  if (parent && !msgs.find(function (x) { return x.id === parent; })) return json({ error: "no parent" }, 400);
  const msg = {
    id: "m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    name: name, text: text, t: Date.now(), parent: parent || null, likes: [], reacts: {}
  };
  let ins;
  try {
    ins = await sbReq(env, "chat_messages", { method: "POST", headers: { "Content-Type": "application/json", "Prefer": "return=representation" }, body: JSON.stringify(msg) });
  } catch (e) { return json({ error: "chat save failed" }, 500); }
  if (!ins.ok) return json({ error: "chat save failed" }, 500);
  try {
    await sbReq(env, "chat_rate", { method: "POST", headers: { "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates" }, body: JSON.stringify({ device: device, last_ms: Date.now() }) });
  } catch (e) {}
  await trimMsgs(env);
  return json({ ok: true, message: msg });
}
