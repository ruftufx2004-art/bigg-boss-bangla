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
// Cute default chat names — one name per device, never reused while taken.
// "Admin" is reserved and never in this pool; only Samiya's registered device may use it.
const CUTE_NAMES = ["Classy","Muse","Oggy","Bani","Mimi","Coco","Lulu","Piku","Tofu","Momo","Kiki","Bubu","Chiku","Golu","Pingu","Simba","Nala","Milo","Luna","Oreo","Biscuit","Choco","Snowy","Chintu","Mintu","Tuni","Piu","Riku","Sona","Mitu","Jolly","Happy","Lucky","Cookie","Brownie","Pebble","Nimbus","Zuzu","Poppy"];
const DEFAULT_ADMIN_PASSWORD = "biggboss2026";
async function kvGet(env, key) {
  try { if (env.POLL_KV) return await env.POLL_KV.get(key); } catch (e) {}
  return null;
}
async function kvPut(env, key, val) {
  try { if (env.POLL_KV) await env.POLL_KV.put(key, val); } catch (e) {}
}
async function kvDel(env, key) {
  try { if (env.POLL_KV) await env.POLL_KV.delete(key); } catch (e) {}
}
async function getDeviceName(env, device) {
  return await kvGet(env, "chatname:device:" + device);
}
// Assign the next free cute name to a device (one name per device, one device per name).
// Names are assigned lazily on first post, so visitors who never chat cost no KV writes.
async function assignCuteName(env, device) {
  var start = 0;
  for (var i = 0; i < device.length; i++) start = (start * 31 + device.charCodeAt(i)) >>> 0;
  for (var k = 0; k < CUTE_NAMES.length; k++) {
    var cand = CUTE_NAMES[(start + k) % CUTE_NAMES.length];
    var used = await kvGet(env, "chatname:used:" + cand);
    if (!used) {
      await kvPut(env, "chatname:used:" + cand, device);
      await kvPut(env, "chatname:device:" + device, cand);
      return cand;
    }
  }
  // Pool exhausted — fall back to a numbered name so the chat never blocks.
  var n2 = CUTE_NAMES[start % CUTE_NAMES.length] + (10 + Math.floor(Math.random() * 90));
  await kvPut(env, "chatname:device:" + device, n2);
  return n2;
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
function normMsg(m) {
  return {
    id: m.id, name: m.name, text: m.text, t: m.t, parent: m.parent || null,
    likes: Array.isArray(m.likes) ? m.likes : [],
    reacts: (m.reacts && typeof m.reacts === "object") ? m.reacts : {},
    photo: (typeof m.photo === "string" && m.photo.indexOf("http") === 0) ? m.photo : null,
    pinned: !!m.pinned,
    author: (typeof m.author === "string") ? m.author : null
  };
}
async function loadMsgs(env) {
  const res = await sbReq(env, "chat_messages?select=id,name,text,t,parent,likes,reacts,photo,pinned,author&order=t.desc&limit=" + MAX_MSG);
  if (!res.ok) throw new Error("chat read failed: " + res.status);
  const rows = await res.json();
  // Pinned messages must show even when older than the latest 100 — fetch them too.
  let pinned = [];
  try {
    const pr = await sbReq(env, "chat_messages?select=id,name,text,t,parent,likes,reacts,photo,pinned,author&pinned=eq.true&order=t.asc&limit=10");
    if (pr.ok) pinned = await pr.json();
  } catch (e) {}
  const byId = {};
  (Array.isArray(rows) ? rows : []).concat(Array.isArray(pinned) ? pinned : []).forEach(function (m) { byId[m.id] = m; });
  const list = Object.keys(byId).map(function (k) { return byId[k]; }).sort(function (a, b) { return a.t - b.t; });
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
  // --- my assigned name (read-only — names are assigned on first post, not here) ---
  if (body.action === "myname") {
    var mine = await getDeviceName(env, device);
    return json({ ok: true, name: mine || null });
  }
  // --- register this device as Admin (password-protected, Admin Panel only) ---
  if (body.action === "setadmin") {
    if (!env.POLL_KV) return json({ error: "KV not bound yet" }, 500);
    var pw = (await kvGet(env, "admin:password")) || DEFAULT_ADMIN_PASSWORD;
    if (clean(body.password) !== pw) return json({ error: "wrong password" }, 403);
    var old = await getDeviceName(env, device);
    if (old && old !== "Admin") await kvDel(env, "chatname:used:" + old);
    await kvPut(env, "chatname:device:" + device, "Admin");
    await kvPut(env, "chatname:used:Admin", device);
    return json({ ok: true, name: "Admin" });
  }
  // --- like / reaction toggle ---
  if (body.action === "like" || body.action === "react") {
    let m;
    try {
      const res = await sbReq(env, "chat_messages?id=eq." + encodeURIComponent(body.id) + "&select=id,name,text,t,parent,likes,reacts,photo,pinned,author");
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
  if (!text) return json({ error: "empty" }, 400);
  // Server-authoritative display name: the device's assigned cute name, or
  // "Admin" only for Samiya's registered device. The name the browser sends
  // is ignored, so nobody can take another user's name or pretend to be Admin.
  // Exception: a Google-logged-in user posts under their Google profile
  // (name + photo) — the browser sends googleName/googlePhoto for that.
  var name = await getDeviceName(env, device);
  var photo = null;
  var gName = clean(body.googleName).slice(0, 60);
  var gPhoto = clean(body.googlePhoto).slice(0, 500);
  if (gName && gName.toLowerCase() !== "admin") {
    name = gName;
    if (gPhoto.indexOf("http") === 0) photo = gPhoto;
  } else {
    if (!name) name = await assignCuteName(env, device);
    if (!name) {
      name = clean(body.name).slice(0, 20) || "Fan";
      if (name.toLowerCase() === "admin") name = "Fan"; // KV down: never let anyone claim Admin
    }
  }
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
    name: name, text: text, t: Date.now(), parent: parent || null, likes: [], reacts: {}, photo: photo,
    pinned: false,
    author: (function(){ var gid = clean(body.googleId).slice(0, 64); return gid ? ("g_" + gid) : device; })()
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
