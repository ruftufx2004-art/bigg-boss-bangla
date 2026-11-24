# Site-21 — Shield over EVERY video + our own Play button starts OK.ru (fullscreen too)

## Why
Samiya: nobody may leave her platform for the outside platform, 100%.
The shield must stay intact over the video. And because OK.ru does NOT
autoplay (tested 2026-11-24 21:53: neither ?autoplay=1 nor ?autoplay=true
starts it on its own — autoplay=1 even leaves a blank frame), the video
must be started from OUR OWN custom player below it. The same custom
player must also work in fullscreen / landscape mode.

## What changed (vs site-20, index.html only)
- The click shield now covers EVERY video embed (YouTube, Kick, OK.ru,
  ...), not just YouTube: load() always shows #bbb-ott-shield in the
  video branch. No pointer event ever reaches the embedded player, so
  no title / channel / logo / "watch here" link can take a viewer off
  the site. The sandbox (site-18/19) stays as a second lock.
- Our own Play/Pause button (#bbb-ott-play) is no longer YouTube-only:
  it shows for every video embed. For YouTube it still uses the IFrame
  API. For other embeds there is no API, so Play loads the stream and
  Pause unloads it (frame.src set / removed). OK.ru starts stopped
  (▶ Play); tapping Play — or tapping the video/shield once — reloads
  it with ?autoplay=1 (withOkAutoplay), which is the flag the OK.ru
  player recognises; the tap itself is the user gesture the browser
  needs to allow it. Kick autoplays, so it starts as playing (⏸ Pause).
  The button label is kept in sync by syncPlayBtn() (now aware of the
  external state, so the 500ms YouTube sync timer cannot overwrite it).
- Fullscreen / Landscape now fullscreen the whole STAGE
  (.bbb-ott-playercol, id bbb-ott-stage) — player + our control bar —
  instead of only the player box. So the custom player (Play, Fullscreen,
  Landscape) stays on screen and usable in fullscreen and landscape,
  and the shield stays over the video there too. New :fullscreen CSS
  sizes the 16:9 player to fit the screen height so the controls stay
  visible below it.
- The hint line under the player is now dynamic: YouTube keeps the old
  "autoplay muted" text; other embeds say (Bengali) "▶ Play চাপ দিলে
  লাইভ শুরু হবে — ভিডিওর উপরে শিল্ড আছে, তাই এখান থেকে বাইরে যাওয়া
  যাবে না।"
- No changes to admin.html, functions/api/config.js or maintenance.html.
  No config change needed: live = OK.ru videoembed, s2 = Kick,
  s3 = maintenance, frameTop 0.

## Known risk (verify live)
- The Play-to-start trick for OK.ru depends on the browser allowing the
  ?autoplay=1 reload after a real tap. It was NOT provable from the
  no-gesture test (where autoplay=1 left a blank frame). If the live
  check shows tapping Play does NOT start the video, the fallback is a
  shield with a hole over the OK.ru play button (the tap then reaches
  the player's own play button, everything else stays blocked).

## Publish
- ZIP RULE (from site-12): files must be at the zip ROOT, no top-level
  folder, or the extract workflow deploys into a useless subfolder.
- Update extract-site.yml filename to bigg-boss-site-21.zip before running
  the workflow.
