# Site-18 — Kick cannot take viewers away; fullscreen stays on her site

## Why
Samiya (21:21): from the embedded Kick player you can go directly to
Kick — if viewers leave for Kick, she earns nothing there. Going to Kick
must NOT be possible. Fullscreen must happen inside her own website
(vertical phone -> horizontal landscape), never inside Kick.

## What changed (vs site-17, index.html only)
- Kick embeds are now SANDBOXED: when load() loads a player.kick.com
  URL, the video iframe gets sandbox="allow-scripts allow-same-origin"
  (no allow-top-navigation, no allow-popups). The Kick logo, channel
  name and "Visit KICK for HD quality" links inside the player can no
  longer navigate the page or open kick.com — the clicks do nothing.
  Playback still works (scripts + same-origin allowed). YouTube and
  other embeds keep the unsandboxed frame.
- The Kick player's OWN fullscreen is turned off for the same reason:
  load() removes allowfullscreen and the "fullscreen" token from the
  iframe's allow list for Kick, so Kick's fullscreen button does
  nothing. YouTube keeps allowfullscreen.
- The site's OWN Fullscreen + Landscape buttons now show for ANY video
  embed, not just YouTube: the YouTube-only buttons (Play/Pause, ±10s,
  Mute, volume, quality, Settings) got the class bbb-ott-yt-only and
  are hidden for non-YouTube embeds; Fullscreen (⛶) and Landscape (🔄)
  stay visible. They fullscreen #bbb-ott-player — her own page, the
  URL never leaves bigg-boss-bangla.pages.dev — and Landscape locks
  the screen to landscape on Android Chrome (iPhone: fullscreen + tilt
  the phone, as before). The click shield stays hidden for non-YouTube
  so viewers can still use Kick's own play/volume controls.
- No changes to admin.html, functions/api/config.js or maintenance.html.
  No config change needed: live = s2 = player.kick.com/biggbossbruh,
  s3 = maintenance page, frameTop 0 (unchanged).

## Publish
- ZIP RULE (from site-12): files must be at the zip ROOT, no top-level
  folder, or the extract workflow deploys into a useless subfolder.
- Update extract-site.yml filename to bigg-boss-site-18.zip before running
  the workflow.
