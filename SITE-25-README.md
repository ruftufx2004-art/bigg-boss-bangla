# Site-25 — LIVE fix ONLY (split from site-24, per the user's order)

User's order (2026-11-24 ~23:39): publish the LIVE part first, the viewers-count part later. Do not bundle them.

## What this zip changes (index.html ONLY)
- OK.ru loads plain — no more ?autoplay=1 anywhere (withOkAutoplay removed).
- The shield leaves a 90px hole in the middle (class bbb-ott-shield--ok-hole, OK.ru only) so the viewer taps the player's own ▶ to start it. Logo/title/controls stay behind the shield strips; sandbox still blocks navigation/popups.
- Play/Pause for OK.ru is now load/unload of the plain embed. Helper text says to tap the ▶ in the middle.
- Kick unchanged (autoplays, no hole). No admin.html / config.js change. No config change.

## What this zip does NOT change
- functions/api/stats.js is the SITE-23 version (reverted from site-24): the Supabase-live-read-first fix is NOT in this zip. The header count stays 0 / "—" until the count fix ships separately (site-26). That is deliberate — the user wants live first.
- track.js (live_visitors upsert, site-22) unchanged.

## Why a new zip was needed
- Site-24 (both fixes) was built and its preview deployment works (verified 2026-11-24 23:40: preview /api/stats returns liveNow 14, liveSource "supabase") — but production is still on site-23: the main-branch commit 02f6bd9 did not become the production deployment, and the Cloudflare dashboard sign-in is blocked by Turnstile verification in the cloud browser, so the preview could not be promoted.
- Site-25 tests the normal GitHub route (zip upload + "Extract site zip" workflow) with the live fix alone.

## Publish
- ZIP RULE: files at the zip ROOT, no top-level folder.
- Update extract-site.yml filename to bigg-boss-site-25.zip before running the workflow.
- Verify on PRODUCTION (https://bigg-boss-bangla.pages.dev): Server 1 — tap the ▶ IN THE CENTRE of the video → moving picture + sound within 15s; click OK.ru logo/title → NOTHING happens (no navigation, playback continues); site ⏸ Pause unloads, ▶ Play reloads. /api/config unchanged (live OK.ru, s2 Kick, s3 maintenance, frameTop 0, no Rumble). Server 2 Kick still "misconfigured" (channel gone — URL NOT to be changed). Server 3 maintenance. Admin has NO 📝 ব্লগ card.
- If production still shows site-23 after the workflow succeeds, STOP and report: the GitHub→production pipeline is the problem (do not fight the Cloudflare dashboard login — it is blocked by Turnstile; promotion may need the user's own browser).
