// Cloudflare Pages Function: Adsterra Publisher API proxy for the Admin Panel.
// The Adsterra API token is NOT stored in code or git — the admin saves it
// from the Admin Panel (password field), it lives only in KV key
// "adsterra:token", and this function calls Adsterra server-side with it.
// GET ?days=7 (default) returns Adsterra's stats for that range:
// impressions, clicks, CPM and revenue. Without a saved token it returns
// {error:"no_token"} so the panel can ask the admin to paste the token.
function json(data, status) {
  return new Response(JSON.stringify(data), { status: status || 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
export async function onRequest(context) {
  const { request, env } = context;
  if (!env.POLL_KV) return json({ error: "KV not bound yet" }, 500);
  const token = await env.POLL_KV.get("adsterra:token");
  if (!token) return json({ error: "no_token", message: "Adsterra API টোকেন সেভ করা হয়নি — অ্যাডমিন প্যানেল থেকে টোকেন বসান।" }, 200);
  const url = new URL(request.url);
  const days = Math.min(90, Math.max(1, parseInt(url.searchParams.get("days") || "7", 10) || 7));
  const end = new Date();
  const start = new Date(Date.now() - (days - 1) * 86400000);
  const fmt = (d) => d.toISOString().slice(0, 10);
  const api = "https://api.adsterra.com/publisher/stats.json?start_date=" + fmt(start) + "&finish_date=" + fmt(end);
  let res;
  try {
    res = await fetch(api, { headers: { "X-API-Key": token, "Accept": "application/json" } });
  } catch (e) {
    return json({ error: "fetch_failed", message: String(e && e.message || e) }, 502);
  }
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch (e) { data = { raw: text.slice(0, 500) }; }
  if (!res.ok) return json({ error: "adsterra_error", status: res.status, data }, 200);
  return json({ ok: true, days, start_date: fmt(start), finish_date: fmt(end), data });
}
