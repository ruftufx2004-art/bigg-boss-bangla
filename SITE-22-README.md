# Site-22 — Live visitor count moves from KV to Supabase (header shows the real number)

## Why
The header already has "👁 <b>—</b> Watching", but it shows "—" (or 0)
while people are actually watching. Root cause: the live count was
counted in Cloudflare KV — every visitor heartbeat (every 30s) is a KV
write, and KV free tier allows 1,000 writes/day, so the count dies
every evening (same limit that already broke poll-name/token saves).
Once the heartbeat writes fail, the live keys expire after 120s and
liveNow drops to 0.

## What changed (vs site-21)
- NEW Supabase table public.live_visitors (device text PK, last_seen
  timestamptz) — see bigg-boss-site-22-supabase.sql, run in the
  Supabase Dashboard SQL Editor (same pattern as site-12: RLS on,
  service_role grants). One row per device; no seed needed.
- functions/api/track.js: heartbeat + view now record live presence
  with a Supabase upsert (Prefer: resolution=merge-duplicates, same
  pattern as chat_rate) instead of the KV live: put. The view handler
  records presence FIRST, so the count works even when KV writes are
  exhausted. KV fallback kept if Supabase is not configured or the
  upsert fails. View counters (views:total, views:page, visitors)
  stay in KV.
- functions/api/stats.js: liveNow now counts live_visitors rows with
  last_seen in the last 90 seconds (heartbeats fire every 30s), via
  Prefer: count=exact — same pattern as chatTotal. Falls back to the
  KV live: list count if Supabase is not configured or the call fails.
- index.html: NO change — the header element and the 30s refresh
  (loadRealCounts) were already correct; only the data source was broken.
- No admin.html / config.js change. No config change needed.

## Accuracy (what the header will show)
- A visitor counts from their first page load (the view call upserts
  immediately), so 1 visitor shows 1, 2 show 2.
- The header refreshes every 30s. Someone who leaves drops out of
  the count within 90s of their last heartbeat (plus up to 30s for
  the next header refresh) — so the number is the real count, at most
  about a minute or two behind in the worst case. It is a real count
  of devices on the site, never a made-up number.

## Publish
- ORDER MATTERS: run bigg-boss-site-22-supabase.sql in the Supabase
  SQL Editor FIRST (the table must exist before the new code runs),
  then publish the zip.
- ZIP RULE (from site-12): files must be at the zip ROOT, no top-level
  folder, or the extract workflow deploys into a useless subfolder.
- Update extract-site.yml filename to bigg-boss-site-22.zip before running
  the workflow.
