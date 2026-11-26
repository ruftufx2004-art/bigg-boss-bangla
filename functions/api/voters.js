// Cloudflare Pages Function: Admin voters list for Google-login voting.
// GET/POST returns every voter (Google profile + per-contestant votes).
// Admin-only: the request must carry the admin password (same as /api/config).
// Uses the service key server-side (never in the browser) because anon cannot
// SELECT from vote99. Frontend contract: POST {password} -> {ok, voters, totalVoters, totalVotes}.
// Each voter: {user_id, name, email, photo, votes: {choice: cnt}, total}.
// Device-based (pre-Google) voters show as name "Device (old)" with no email.
const DEFAULT_ADMIN_PASSWORD = "biggboss2026";
function json(data, status) {
  return new Response(JSON.stringify(data), { status: status || 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
function sbConfigured(env) {
  return !!(env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY);
}
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
  const res = await fetch(sbBase(env) + path, { ...(opts || {}), headers: { ...sbHeaders(env), ...((opts && opts.headers) || {}) }, signal: timeoutSignal(10000) });
  return res;
}
async function kvGet(env, key) {
  try { if (env.POLL_KV) return await env.POLL_KV.get(key); } catch (e) {}
  return null;
}
export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "POST") return json({ error: "method not allowed" }, 405);
  if (!sbConfigured(env)) return json({ error: "Supabase not configured" }, 500);
  let body = {};
  try { body = await request.json(); } catch (e) { return json({ error: "bad json" }, 400); }
  const pw = String(body.password || "");
  const realPw = (await kvGet(env, "admin:password")) || DEFAULT_ADMIN_PASSWORD;
  if (pw !== realPw) return json({ error: "wrong password" }, 403);
  let voteRows = [], profRows = [];
  try {
    const v = await sbReq(env, "vote99?select=device,choice,cnt&order=device.asc&limit=5000");
    if (!v.ok) return json({ error: "vote99 read failed" }, 500);
    voteRows = await v.json();
  } catch (e) { return json({ error: "vote99 read failed" }, 500); }
  try {
    const p = await sbReq(env, "vote_profiles?select=user_id,name,email,photo&limit=5000");
    if (p.ok) profRows = await p.json();
  } catch (e) { profRows = []; }
  const profs = {};
  for (const r of profRows || []) {
    if (r && typeof r.user_id === "string") profs[r.user_id] = r;
  }
  const byDevice = {};
  let totalVotes = 0;
  for (const r of voteRows || []) {
    if (!r || typeof r.device !== "string" || typeof r.choice !== "string") continue;
    const cnt = parseInt(r.cnt, 10) || 0;
    if (cnt <= 0) continue;
    if (!byDevice[r.device]) byDevice[r.device] = { user_id: r.device, votes: {}, total: 0 };
    byDevice[r.device].votes[r.choice] = (byDevice[r.device].votes[r.choice] || 0) + cnt;
    byDevice[r.device].total += cnt;
    totalVotes += cnt;
  }
  const voters = Object.keys(byDevice).map(function (device) {
    const v = byDevice[device];
    const p = profs[device] || null;
    return {
      user_id: device,
      name: p && p.name ? p.name : (device.indexOf("g_") === 0 ? "Google user" : "Device (old)"),
      email: p && p.email ? p.email : "",
      photo: p && p.photo ? p.photo : null,
      votes: v.votes,
      total: v.total
    };
  }).sort(function (a, b) { return b.total - a.total; });
  return json({ ok: true, voters: voters, totalVoters: voters.length, totalVotes: totalVotes });
}
