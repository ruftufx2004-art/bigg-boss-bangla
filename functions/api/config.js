// Cloudflare Pages Function: site config for the Admin Panel.
// Public GET returns live stream links + poll names.
// POST with the admin password updates them (stored in the same KV as the poll).
const DEFAULTS = {
  live: "https://www.youtube-nocookie.com/embed/d_sOKhMprNE?autoplay=1&mute=1&controls=0&disablekb=1&fs=0&modestbranding=1&rel=0&iv_load_policy=3",
  s2: "https://www.youtube-nocookie.com/embed/EaYRymDpVJI?autoplay=1&mute=1&controls=0&disablekb=1&fs=0&modestbranding=1&rel=0&iv_load_policy=3",
  s3: "https://www.youtube-nocookie.com/embed/JOdWmbDoRiM?autoplay=1&mute=1&controls=0&disablekb=1&fs=0&modestbranding=1&rel=0&iv_load_policy=3",
  pollNames: ["Monami Ghosh","Durnibar Saha","Niranjan Mondal (Laughtersane)","Tanushree Roy Das","Srijla Guha","Rajveer Dey","Jeetu Kamal","Sourav Das","Ranieeta Dash"]
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
  const names = await kv.get("cfg:pollNames");
  if (names) { try { const a = JSON.parse(names); if (Array.isArray(a) && a.length) cfg.pollNames = a; } catch (e) {} }
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
    if (Array.isArray(body.pollNames) && body.pollNames.length) await kv.put("cfg:pollNames", JSON.stringify(body.pollNames.map(String)));
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
