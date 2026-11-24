# Site-27 — Fullscreen / Landscape = VIDEO ONLY (live fix, no count fix)

User's report (2026-11-25 00:00, from her phone): the ⛶ Fullscreen and 🔄 Landscape buttons fullscreen/landscape the WHOLE SITE. Fullscreen must fullscreen ONLY the video. (She also said "ব্যাকে যাওয়া যায় না, front-এ যাওয়া যায় না" — whether that means seeking in the video or exiting fullscreen is still unclear; asked in the reply. This zip does NOT change the shield, so seek is unchanged.)

## Root cause
- Site-21 changed the fullscreen target to #bbb-ott-stage (the whole player column: player + custom control bar) so the custom player would stay visible in fullscreen. On her phone that reads as the whole site going fullscreen/landscape. Wrong call.
- The earlier version (site-18/19/20) fullscreened #bbb-ott-player (the video box only) — that was the behaviour she remembers as right (embed goes landscape, volume works, clicks don't navigate away).

## What this zip changes (index.html ONLY)
- ⛶ Fullscreen and 🔄 Landscape now call requestFullscreen on #bbb-ott-player (the video box only), never the stage.
- CSS: .bbb-ott-player:fullscreen fills the screen (100% x 100%, black, no radius/border). The old .bbb-ott-stage:fullscreen rules are removed.
- The shield sits INSIDE the player, so it stays active in fullscreen: clicks still can't leave the site. The OK.ru 90px hole (site-24/25) is unchanged.
- No admin.html / config.js change. No config change. stats.js is still the SITE-23 version — the viewers-count fix is NOT in this zip (user ordered live first, count later).

## What this zip does NOT change
- The shield (top/left/right/bottom strips for OK.ru) is unchanged — the embed's own seek/volume bar stays behind the shield. If "back/front" means seeking in the video, that needs a separate change (open the bottom strip) — do NOT do it without asking, it touches the click-out protection.
- The count fix (site-24 stats.js) is still pending. NOTE: the site-26 zip (live + count, built 23:58) is now STALE — it lacks this fullscreen fix. After site-27 is live, rebuild the count fix on top of site-27 as site-28.

## Publish
- ZIP RULE: files at the zip ROOT, no top-level folder.
- Update extract-site.yml filename to bigg-boss-site-27.zip before running the workflow.
- Verify on PRODUCTION (https://bigg-boss-bangla.pages.dev): the deployed index.html must contain ".bbb-ott-player:fullscreen" and the fullscreen/landscape handlers must target "#bbb-ott-player" (not the stage); /api/config unchanged (live OK.ru, s2 Kick, s3 maintenance, frameTop 0, no Rumble); shield mechanics (title click = no navigation; Pause unloads, Play re-arms). /api/stats still shows the site-23 KV error (liveNow 0) — EXPECTED, count fix ships later.
- KNOWN LIMIT: real fullscreen CANNOT be verified in the cloud browser (headless browsers refuse requestFullscreen — seen in site-18/21 checks). The phone test is the real check: Samiya must test ⛶ / 🔄 on Server 1 from her own phone and confirm ONLY the video goes fullscreen/landscape. If it fails there too, it needs a real fix.
