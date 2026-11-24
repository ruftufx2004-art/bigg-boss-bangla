# Site-17 — Kick live on Server 1 + Server 2 (Server 2 no longer YouTube-only)

## Why
Samiya sent https://player.kick.com/biggbossbruh and said: put this link
on Server 1 and Server 2. Checked 2026-11-24 21:09 via Kick's API: the
channel "biggbossbruh" exists and is LIVE right now ("My first stream.",
started 20:59 Dhaka, 4 viewers, Just Chatting / IRL) — a brand-new
channel on its first stream.

## What changed (vs site-16)
- Kick player links (player.kick.com/...) now count as video embeds:
  index.html isEmbed() and admin.html isWebsiteLink() both treat them
  like /embed/ URLs, so the Kick player plays in the video player
  (correct aspect ratio, Kick's own controls) instead of landing in the
  cropped website frame, where it would have shown mostly black.
- Server 2 is NO LONGER YouTube-only (that rule was Samiya's 2026-11-24
  19:00 requirement, now superseded by her 21:09 order to put Kick on
  Server 1 AND Server 2). Removed in three places: the homepage Server 2
  click refusal (index.html), applyConfig emptying non-YouTube s2
  (index.html), and the admin save block + Server 2 preview block
  (admin.html). Server 2 is now generic like Server 1 and Server 3.
  The YouTube-only control bar (±10s seek, shield, Play/Pause) still
  appears whenever the current server IS a YouTube video — load() hides
  it for non-YouTube embeds, so Kick shows Kick's own controls.
- Admin labels/hints updated: Server 2 now says any platform; Kick
  added to the platform lists on Server 1, Server 2 and the bottom hint.
- No changes to functions/api/config.js or maintenance.html.

## Config to set after publish (admin panel)
- Server 1 (live) = https://player.kick.com/biggbossbruh
- Server 2 (s2) = https://player.kick.com/biggbossbruh (same live)
- Server 3 (s3) = stays https://bigg-boss-bangla.pages.dev/maintenance.html
- frameTop = 0, frameHeight 560, frameZoom 1 (unchanged)
- Result: Server 1 and Server 2 both play the Kick live; Server 3 still
  shows "সার্ভারের কাজ চলছে". No Rumble anywhere. The YouTube Ep-78
  video is no longer on any server — it was the Server 2 placeholder.
  To bring YouTube back on Server 2 later, just paste a YouTube link
  in the admin panel (no republish needed).

## Publish
- ZIP RULE (from site-12): files must be at the zip ROOT, no top-level
  folder, or the extract workflow deploys into a useless subfolder.
- Update extract-site.yml filename to bigg-boss-site-17.zip before running
  the workflow.
