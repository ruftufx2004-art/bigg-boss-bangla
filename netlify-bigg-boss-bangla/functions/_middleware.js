// Cloudflare Pages Function middleware: block visitors from India, Russia
// and Singapore (by Cloudflare's country detection). Everyone else passes
// through normally. A VPN can still bypass this, like any country block.
const BLOCKED = new Set(["IN", "RU", "SG"]);

export async function onRequest(context) {
  const cf = context.request.cf;
  const country = cf && cf.country;
  if (country && BLOCKED.has(country)) {
    return new Response(
      "<!DOCTYPE html><html><head><meta charset='UTF-8'><title>Not available</title></head>" +
      "<body style='background:#0b0b10;color:#f5f5f7;font-family:sans-serif;text-align:center;padding:80px 20px'>" +
      "<h1>👁️ Bigg Boss Bangla</h1><p>This site is not available in your country.</p></body></html>",
      { status: 403, headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "no-store" } }
    );
  }
  return context.next();
}
