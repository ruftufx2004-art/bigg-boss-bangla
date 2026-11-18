// Cloudflare Pages Function: site config for the Admin Panel.
// Public GET returns live stream links + poll names.
// POST with the admin password updates them (stored in the same KV as the poll).
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
async function readConfig(kv) {
  const cfg = { ...DEFAULTS };
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
  const photos = await kv.get("cfg:pollPhotos");
  if (photos) { try { const o = JSON.parse(photos); if (o && typeof o === "object") cfg.pollPhotos = o; } catch (e) {} }
  const names = await kv.get("cfg:pollNames");
  if (names) { try { const a = JSON.parse(names); if (Array.isArray(a) && a.length) cfg.pollNames = a; } catch (e) {} }
  const so = await kv.get("cfg:serversOn");
  if (so) { try { const o = JSON.parse(so); if (o && typeof o === "object") cfg.serversOn = { s1: o.s1 !== false, s2: o.s2 !== false, s3: o.s3 !== false }; } catch (e) {} }
  // Adsterra token is never returned — only whether one is saved.
  cfg.hasAdsterraToken = !!(await kv.get("adsterra:token"));
  return cfg;
}
export async function onRequest(context) {
  const { request, env } = context;
  if (!env.POLL_KV) return json({ error: "KV not bound yet" }, 500);
  const kv = env.POLL_KV;
  if (request.method === "GET") return json(await readConfig(kv));
  if (request.method === "POST") {
    let body = {};
    try { body = await request.json(); } catch (e) { return json({ error: "bad json" }, 400); }
    const pw = (await kv.get("admin:password")) || DEFAULT_PASSWORD;
    if (body.password !== pw) return json({ error: "wrong password" }, 403);
    if (typeof body.live === "string" && body.live.trim()) await kv.put("cfg:live", body.live.trim());
    if (typeof body.s2 === "string") await kv.put("cfg:s2", body.s2.trim());
    if (typeof body.s3 === "string") await kv.put("cfg:s3", body.s3.trim());
    if (typeof body.frameTop === "number") await kv.put("cfg:frameTop", String(Math.max(0, Math.floor(body.frameTop))));
    if (typeof body.frameHeight === "number") await kv.put("cfg:frameHeight", String(Math.min(1200, Math.max(200, Math.floor(body.frameHeight)))));
    if (typeof body.frameZoom === "number") await kv.put("cfg:frameZoom", String(Math.min(2, Math.max(0.5, body.frameZoom))));
    if (body.serversOn && typeof body.serversOn === "object") await kv.put("cfg:serversOn", JSON.stringify({ s1: body.serversOn.s1 !== false, s2: body.serversOn.s2 !== false, s3: body.serversOn.s3 !== false }));
    if (Array.isArray(body.pollNames) && body.pollNames.length) await kv.put("cfg:pollNames", JSON.stringify(body.pollNames.map(String)));
    if (typeof body.adsterraToken === "string" && body.adsterraToken.trim()) await kv.put("adsterra:token", body.adsterraToken.trim());
    if (typeof body.newPassword === "string" && body.newPassword.length >= 4) await kv.put("admin:password", body.newPassword);
    if (body.resetPoll) {
      const counts = await kv.list({ prefix: "count:" });
      for (const k of counts.keys) await kv.delete(k.key);
      const voted = await kv.list({ prefix: "voted:" });
      for (const k of voted.keys) await kv.delete(k.key);
    }
    return json({ ...(await readConfig(kv)), saved: true });
  }
  return json({ error: "method not allowed" }, 405);
}
