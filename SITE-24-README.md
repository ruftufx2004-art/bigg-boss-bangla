# Site-24 — Two fixes: Watching count (KV order bug) + OK.ru plays on the site

## 1) Watching count still 0 after site-23 (the KV order bug)
Site-23 published fine (run #44, deploy 45f33f0) and Error 1101 is
gone — /api/stats returns HTTP 200 JSON. But the body was
{"ok":false,"liveNow":0,"error":"KV list() limit exceeded for the
day."} with no liveSource/liveStatus: handleStats() called kv.list()
for poll counts, visitors and topPages BEFORE the Supabase live read,
so the exhausted KV list() daily quota threw first and the Supabase
read never ran. The header showed "👁 0 Watching" and the chat count
stayed "—".
Fix (functions/api/stats.js ONLY): the Supabase live read now runs
FIRST, before any KV call, and every KV section (poll counts,
visitors, top pages, counters) is wrapped in its own try/catch, so
an exhausted quota degrades that number instead of killing the whole
endpoint. The response always carries liveNow + liveSource +
liveStatus. The outer try/catch stays as a last resort. Note: while
the KV list() quota is exhausted (it resets at UTC midnight / 06:00
Dhaka), the list-based admin numbers (unique visitors, top pages)
will read 0 — but liveNow and chatTotal come from Supabase and work.

## 2) OK.ru plays on OK.ru but stays black on the site
Verified 2026-11-24 22:54–22:58: the video 17758882569855 IS playing
on OK.ru (watch page: "24X7 Live" by Ruf Tuf, LIVE, watching 0→10,
moving picture; direct embed plays after a Play click). But Server 1
on the site stayed black: the site's ▶ Play reloaded the embed with
?autoplay=1, which is unreliable for OK.ru — it often leaves a blank
frame with no play button (already seen in the 21:53 autoplay test),
and the shield then blocked the player's own ▶, so there was no way
to start it. The site-23 check that "passed" Server 1 (~22:57) and
the check that failed it (22:54–22:58) show the same action working
sometimes and failing others — a race in the autoplay reload.
Fix (index.html ONLY):
- No more ?autoplay=1 anywhere (withOkAutoplay removed). OK.ru loads
  plain, exactly like the direct embed that plays reliably.
- The shield now leaves a 90px hole in the middle (four transparent
  strips around it, class bbb-ott-shield--ok-hole, OK.ru only) so the
  viewer taps the player's own ▶ to start it. The hole only exposes
  the centred ▶; the logo, title and controls stay behind the
  shield, and the sandbox (no top navigation, no popups) still
  blocks any navigation — nobody can leave from here.
- Play/Pause for OK.ru is now load/unload of the plain embed (the
  embed counts as loaded once load() sets its src). The helper text
  for OK.ru now says to tap the ▶ in the middle of the video.
- Kick is unchanged (it autoplays; no hole for Kick).
- No admin.html / config.js change. No config change needed.

## Publish
- ZIP RULE (from site-12): files must be at the zip ROOT, no top-level
  folder, or the extract workflow deploys into a useless subfolder.
- Update extract-site.yml filename to bigg-boss-site-24.zip before running
  the workflow.
- No Supabase SQL to run this time.
