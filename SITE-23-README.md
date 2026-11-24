# Site-23 — Fix /api/stats Error 1101 (site-22 bug) so the live count works

## What went wrong in site-22
Site-22 published fine (run #43, deploy 27de3e8) and the Supabase
WRITE side works — live_visitors already had 240 rows with fresh
last_seen timestamps. But /api/stats threw Cloudflare Error 1101 on
every request, so the header stayed "👁 — Watching" and even the chat
count stayed "—" (both numbers come from the same /api/stats call).
The site-22 live-count read used a PostgREST `last_seen=gt.<timestamp>`
filter plus `Prefer: count=exact` and read the total from the
content-range header. That read path is what broke the endpoint.

## What changed (vs site-22)
- functions/api/stats.js ONLY (no index.html, admin.html, track.js or
  config change; the live_visitors table from site-22 is reused, no
  new SQL needed):
  1. The whole handler is wrapped in try/catch (onRequest calls
     handleStats). /api/stats can NEVER throw Error 1101 again — on
     any unexpected error it returns JSON {ok:false, liveNow:0,
     error:"..."} instead of a blank error page.
  2. The live-count read no longer uses the `gt.` filter or the
     content-range header. It fetches the most recent rows
     (`select=device,last_seen&order=last_seen.desc&limit=1000`) and
     counts in plain JS the rows whose last_seen is within the last
     90 seconds. Same 90s window as site-22 (heartbeats every 30s),
     so 1 visitor shows 1, 2 show 2.
  3. If the Supabase read fails for any reason, the old KV live:
     count is used instead (as before). The response now also reports
     `liveSource` ("supabase" or "kv") and `liveStatus` (the HTTP
     status of the Supabase read, or its error text) so the read path
     can be checked from the /api/stats output itself.
- No admin.html / config.js change. No config change needed.

## Publish
- ZIP RULE (from site-12): files must be at the zip ROOT, no top-level
  folder, or the extract workflow deploys into a useless subfolder.
- Update extract-site.yml filename to bigg-boss-site-23.zip before running
  the workflow.
- No Supabase SQL to run this time (table live_visitors already exists).
