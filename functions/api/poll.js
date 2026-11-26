// Cloudflare Pages Function: Hotstar-style 99-vote panel (site-47).
// Each device gets 99 votes total, distributed among the 4 nominated
// contestants. Votes live in Supabase:
//   poll_votes (name, count) — shared totals (carried over from the old poll)
//   vote99 (device, choice, cnt) — per-device votes, PK (device, choice)
// Frontend contract: GET returns {counts, total, voted, used, left},
// POST {device, choice, count} returns the same shape.
// A direct-Supabase RPC (cast_vote99) mirrors this for when Workers are down.
const NAMES = ["Rajveer Dey","Srijla Guha","Tanushree Roy Das","Niranjan Mondal (Laughtersane)"];
const VOTE99_TOTAL = 99;

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
  const res = await fetch(sbBase(env) + path, { ...(opts || {}), headers: { ...sbHeaders(env), ...((opts && opts.headers) || {}) }, signal: timeoutSignal(8000) });
  return res;
}

async function readCounts(env) {
  const res = await sbReq(env, "poll_votes?select=name,count");
  if (!res.ok) throw new Error("poll_votes read failed: " + res.status);
  const rows = await res.json();
  const counts = {};
  let total = 0;
  for (const n of NAMES) counts[n] = 0;
  for (const r of rows || []) {
    if (r && typeof r.name === "string" && Object.prototype.hasOwnProperty.call(counts, r.name)) {
      const v = parseInt(r.count, 10) || 0;
      counts[r.name] = v; total += v;
    }
  }
  return { counts, total };
}
async function readMyVotes(env, device) {
  const voted = {};
  let used = 0;
  if (!device) return { voted, used };
  try {
    const res = await sbReq(env, "vote99?device=eq." + encodeURIComponent(device) + "&select=choice,cnt");
    if (res.ok) {
      const rows = await res.json();
      for (const r of rows || []) {
        if (r && typeof r.choice === "string" && NAMES.includes(r.choice)) {
          const v = parseInt(r.cnt, 10) || 0;
          if (v > 0) { voted[r.choice] = v; used += v; }
        }
      }
    }
  } catch (e) {}
  return { voted, used };
}

export async function onRequest(context) {
  const { request, env } = context;
  if (!env.POLL_KV) return json({ error: "KV not bound yet" }, 500);
  if (!sbConfigured(env)) return json({ error: "Supabase not configured" }, 500);
  if (request.method === "GET") {
    const url = new URL(request.url);
    const device = url.searchParams.get("device") || "";
    let data;
    try { data = await readCounts(env); } catch (e) { return json({ error: "poll read failed" }, 500); }
    const mine = await readMyVotes(env, device);
    data.voted = mine.voted;
    data.used = mine.used;
    data.left = Math.max(0, VOTE99_TOTAL - mine.used);
    return json(data);
  }
  if (request.method === "POST") {
    let body = {};
    try { body = await request.json(); } catch (e) { return json({ error: "bad json" }, 400); }
    const device = String(body.device || "").slice(0, 64);
    const choice = String(body.choice || "");
    let count = parseInt(body.count, 10);
    if (!count || count < 1) count = 1;
    if (count > VOTE99_TOTAL) count = VOTE99_TOTAL;
    if (!device || !NAMES.includes(choice)) return json({ error: "invalid vote" }, 400);
    const mine = await readMyVotes(env, device);
    let give = Math.min(count, VOTE99_TOTAL - mine.used);
    if (give <= 0) {
      let data;
      try { data = await readCounts(env); } catch (e) { return json({ error: "poll read failed" }, 500); }
      data.voted = mine.voted; data.used = mine.used; data.left = 0;
      return json(data);
    }
    try {
      const curMine = mine.voted[choice] || 0;
      const up = await sbReq(env, "vote99", { method: "POST", headers: { "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates" }, body: JSON.stringify({ device: device, choice: choice, cnt: curMine + give }) });
      if (!up.ok) return json({ error: "vote save failed" }, 500);
      const cur = await sbReq(env, "poll_votes?name=eq." + encodeURIComponent(choice) + "&select=count");
      let curCount = 0;
      if (cur.ok) {
        const rows = await cur.json();
        if (Array.isArray(rows) && rows.length) curCount = parseInt(rows[0].count, 10) || 0;
      }
      const upd = await sbReq(env, "poll_votes?name=eq." + encodeURIComponent(choice), { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ count: curCount + give }) });
      if (!upd.ok) return json({ error: "vote save failed" }, 500);
    } catch (e) { return json({ error: "vote save failed" }, 500); }
    let data;
    try { data = await readCounts(env); } catch (e) { return json({ error: "poll read failed" }, 500); }
    const mine2 = await readMyVotes(env, device);
    data.voted = mine2.voted; data.used = mine2.used; data.left = Math.max(0, VOTE99_TOTAL - mine2.used);
    return json(data);
  }
  return json({ error: "method not allowed" }, 405);
}
