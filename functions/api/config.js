// Cloudflare Pages Function: site config for the Admin Panel.
// Public GET returns live stream links + poll names.
// POST with the admin password updates them.
//
// LIVE settings (live, s2, s3, frameTop, frameHeight, frameZoom, serversOn)
// live in Supabase (table live_config, row id=1) — no KV daily-write limit.
// Poll names/photos, the Adsterra token and the admin password stay in KV,
// as do votes, chat and stats. If Supabase is not configured, live settings
// fall back to the old KV keys (cfg:live etc.), so the site keeps working.
const DEFAULTS = {
  live: "https://shop.bihishaan.com/",
  frameTop: 0,
  frameHeight: 560,
  frameZoom: 1,
  serversOn: { s1: true, s2: true, s3: true },
  s2: "https://www.youtube-nocookie.com/embed/EaYRymDpVJI?autoplay=1&mute=1&controls=0&disablekb=1&fs=0&modestbranding=1&rel=0&iv_load_policy=3",
  s3: "https://www.youtube-nocookie.com/embed/JOdWmbDoRiM?autoplay=1&mute=1&controls=0&disablekb=1&fs=0&modestbranding=1&rel=0&iv_load_policy=3",
  pollNames: ["Monami Ghosh","Durnibar Saha","Niranjan Mondal (Laughtersane)","Tanushree Roy Das","Srijla Guha","Rajveer Dey","Jeetu Kamal","Sourav Das","Ranieeta Dash"],
  pollPhotos: {"Monami Ghosh": "https://images.filmibeat.com/img/popcorn/list_items/bigg-boss-bangla-3-contestants-list-with-photos-20260831201339-4603.jpg", "Durnibar Saha": "https://images.filmibeat.com/img/popcorn/list_items/bigg-boss-bangla-3-contestants-list-with-photos-20260831201339-927.jpg", "Niranjan Mondal (Laughtersane)": "https://images.filmibeat.com/img/popcorn/list_items/bigg-boss-bangla-3-contestants-list-with-photos-20260831201339-1237.jpg", "Tanushree Roy Das": "https://images.filmibeat.com/img/popcorn/list_items/bigg-boss-bangla-3-contestants-list-with-photos-20260831201339-2519.jpg", "Srijla Guha": "https://images.filmibeat.com/img/popcorn/list_items/bigg-boss-bangla-3-contestants-list-with-photos-20260831201339-3976.jpg", "Rajveer Dey": "https://images.filmibeat.com/img/popcorn/list_items/bigg-boss-bangla-3-contestants-list-with-photos-20261111195628-9939.jpg", "Jeetu Kamal": "https://images.filmibeat.com/img/popcorn/list_items/bigg-boss-bangla-3-contestants-list-with-photos-20261111195840-8371.jpg", "Sourav Das": "https://images.filmibeat.com/img/popcorn/list_items/bigg-boss-bangla-3-contestants-list-with-photos-20261111184132-5879.jpg", "Ranieeta Dash": "https://images.filmibeat.com/img/popcorn/list_items/bigg-boss-bangla-3-contestants-list-with-photos-20261111184423-4386.jpg"}
};
const DEFAULT_PASSWORD = "biggboss2026";

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
function sbRowUrl(env) {
  return env.SUPABASE_URL.replace(/\/$/, "") + "/rest/v1/live_config?id=eq.1";
}
// Read the live row from Supabase. Returns the row object or null on any failure.
async function sbGet(env) {
  try {
    const res = await fetch(sbRowUrl(env) + "&select=live,s2,s3,frame_top,frame_height,frame_zoom,servers_on", { headers: sbHeaders(env), signal: timeoutSignal(5000) });
    if (!res.ok) return null;
    const rows = await res.json();
    if (Array.isArray(rows) && rows.length) return rows[0];
    return null;
  } catch (e) { return null; }
}
// Write live fields to Supabase (snake_case columns). Returns the Response;
// the caller decides what a non-2xx status means. Network errors throw.
async function sbPatch(env, fields) {
  return fetch(sbRowUrl(env), {
    method: "PATCH",
    headers: { ...sbHeaders(env), "Content-Type": "application/json", "Prefer": "return=representation" },
    body: JSON.stringify(fields),
    signal: timeoutSignal(8000)
  });
}
function clampLive(cfg) {
  cfg.frameTop = Math.max(0, Math.floor(cfg.frameTop) || 0);
  cfg.frameHeight = Math.min(1200, Math.max(200, Math.floor(cfg.frameHeight) || 560));
  cfg.frameZoom = Math.min(2, Math.max(0.5, cfg.frameZoom || 1));
  cfg.serversOn = { s1: cfg.serversOn.s1 !== false, s2: cfg.serversOn.s2 !== false, s3: cfg.serversOn.s3 !== false };
  return cfg;
}
async function readKvLive(kv, cfg) {
  for (const k of ["live", "s2", "s3"]) {
    const v = await kv.get("cfg:" + k);
    if (v) cfg[k] = v;
  }
  const ft = await kv.get("cfg:frameTop");
  if (ft !== null && ft !== undefined && ft !== "") { const n = parseInt(ft, 10); if (!isNaN(n)) cfg.frameTop = Math.max(0, n); }
  const fh = await kv.get("cfg:frameHeight");
  if (fh !== null && fh !== undefined && fh !== "") { const n = parseInt(fh, 10); if (!isNaN(n)) cfg.frameHeight = Math.min(1200, Math.max(200, n)); }
  const fz = await kv.get("cfg:frameZoom");
  if (fz !== null && fz !== undefined && fz !== "") { const n = parseFloat(fz); if (!isNaN(n)) cfg.frameZoom = Math.min(2, Math.max(0.5, n)); }
  const so = await kv.get("cfg:serversOn");
  if (so) { try { const o = JSON.parse(so); if (o && typeof o === "object") cfg.serversOn = { s1: o.s1 !== false, s2: o.s2 !== false, s3: o.s3 !== false }; } catch (e) {} }
  return cfg;
}
async function readConfig(kv, env) {
  const cfg = { ...DEFAULTS };
  // Live settings: Supabase first, KV fallback, then defaults.
  let fromSb = false;
  if (sbConfigured(env)) {
    const row = await sbGet(env);
    if (row) {
      fromSb = true;
      if (typeof row.live === "string" && row.live) cfg.live = row.live;
      if (typeof row.s2 === "string" && row.s2) cfg.s2 = row.s2;
      if (typeof row.s3 === "string" && row.s3) cfg.s3 = row.s3;
      if (typeof row.frame_top === "number") cfg.frameTop = row.frame_top;
      if (typeof row.frame_height === "number") cfg.frameHeight = row.frame_height;
      if (typeof row.frame_zoom === "number") cfg.frameZoom = row.frame_zoom;
      if (row.servers_on && typeof row.servers_on === "object") cfg.serversOn = row.servers_on;
    }
  }
  if (!fromSb) await readKvLive(kv, cfg);
  clampLive(cfg);
  const photos = await kv.get("cfg:pollPhotos");
  if (photos) { try { const o = JSON.parse(photos); if (o && typeof o === "object") cfg.pollPhotos = o; } catch (e) {} }
  const names = await kv.get("cfg:pollNames");
  if (names) { try { const a = JSON.parse(names); if (Array.isArray(a) && a.length) cfg.pollNames = a; } catch (e) {} }
  // Adsterra token is never returned — only whether one is saved.
  cfg.hasAdsterraToken = !!(await kv.get("adsterra:token"));
  return cfg;
}
export async function onRequest(context) {
  const { request, env } = context;
  if (!env.POLL_KV) return json({ error: "KV not bound yet" }, 500);
  const kv = env.POLL_KV;
  if (request.method === "GET") return json(await readConfig(kv, env));
  if (request.method === "POST") {
    let body = {};
    try { body = await request.json(); } catch (e) { return json({ error: "bad json" }, 400); }
    const pw = (await kv.get("admin:password")) || DEFAULT_PASSWORD;
    if (body.password !== pw) return json({ error: "wrong password" }, 403);
    // Live fields -> Supabase (or KV fallback if Supabase is not configured).
    const liveFields = {};
    if (typeof body.live === "string" && body.live.trim()) liveFields.live = body.live.trim();
    if (typeof body.s2 === "string") liveFields.s2 = body.s2.trim();
    if (typeof body.s3 === "string") liveFields.s3 = body.s3.trim();
    if (typeof body.frameTop === "number") liveFields.frame_top = Math.max(0, Math.floor(body.frameTop));
    if (typeof body.frameHeight === "number") liveFields.frame_height = Math.min(1200, Math.max(200, Math.floor(body.frameHeight)));
    if (typeof body.frameZoom === "number") liveFields.frame_zoom = Math.min(2, Math.max(0.5, body.frameZoom));
    if (body.serversOn && typeof body.serversOn === "object") liveFields.servers_on = { s1: body.serversOn.s1 !== false, s2: body.serversOn.s2 !== false, s3: body.serversOn.s3 !== false };
    if (Object.keys(liveFields).length) {
      if (sbConfigured(env)) {
        let pr;
        try { pr = await sbPatch(env, liveFields); }
        catch (e) { return json({ error: "live save failed", sbStatus: 0 }, 500); }
        if (!pr.ok) return json({ error: "live save failed", sbStatus: pr.status }, 500);
      } else {
        if (liveFields.live !== undefined) await kv.put("cfg:live", liveFields.live);
        if (liveFields.s2 !== undefined) await kv.put("cfg:s2", liveFields.s2);
        if (liveFields.s3 !== undefined) await kv.put("cfg:s3", liveFields.s3);
        if (liveFields.frame_top !== undefined) await kv.put("cfg:frameTop", String(liveFields.frame_top));
        if (liveFields.frame_height !== undefined) await kv.put("cfg:frameHeight", String(liveFields.frame_height));
        if (liveFields.frame_zoom !== undefined) await kv.put("cfg:frameZoom", String(liveFields.frame_zoom));
        if (liveFields.servers_on !== undefined) await kv.put("cfg:serversOn", JSON.stringify(liveFields.servers_on));
      }
    }
    // KV-backed fields: best effort — a KV write-limit failure must not
    // fail the live save. Names of failed fields are reported as kvPending.
    const kvPending = [];
    async function kvTry(key, fn) {
      try { await fn(); } catch (e) { kvPending.push(key); }
    }
    if (Array.isArray(body.pollNames) && body.pollNames.length) await kvTry("pollNames", () => kv.put("cfg:pollNames", JSON.stringify(body.pollNames.map(String))));
    if (typeof body.adsterraToken === "string" && body.adsterraToken.trim()) await kvTry("adsterraToken", () => kv.put("adsterra:token", body.adsterraToken.trim()));
    if (typeof body.newPassword === "string" && body.newPassword.length >= 4) await kvTry("newPassword", () => kv.put("admin:password", body.newPassword));
    if (body.resetPoll) {
      await kvTry("resetPoll", async () => {
        const counts = await kv.list({ prefix: "count:" });
        for (const k of counts.keys) await kv.delete(k.key);
        const voted = await kv.list({ prefix: "voted:" });
        for (const k of voted.keys) await kv.delete(k.key);
      });
    }
    return json({ ...(await readConfig(kv, env)), saved: true, kvPending });
  }
  return json({ error: "method not allowed" }, 405);
}
