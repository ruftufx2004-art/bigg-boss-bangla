# Site-14 — Server 2 YouTube-only + manual ±10s seek + shield-click pause

## What changed
- **Server 2 is YouTube-only.** Any YouTube link works (watch / shorts /
  live / youtu.be, including unlisted videos — they are normal watch URLs
  and play in the embed). Anything else is refused:
  - Homepage: clicking Server 2 with a non-YouTube link shows an overlay
    "Server 2 — শুধু YouTube ভিডিও" instead of loading it.
  - applyConfig: a non-YouTube s2 value is NOT put into the Server 2
    button (data-src left empty).
  - Admin Panel: saving is BLOCKED with a clear message while the Server 2
    field holds a non-YouTube link; the Server 2 preview hides too.
  - Server 1 and Server 3 are unchanged (any platform / website still OK).
- **Manual player: ±10s rewind.** Two new buttons in the control bar,
  "⏪ 10s" and "10s ⏩", seek the YouTube video via the IFrame API
  (seekTo(currentTime ± 10)). Works on live streams too (moves inside the
  live DVR window). The control bar only shows for YouTube, so the buttons
  are YouTube-only by construction.
- **Pressing the video pauses — never leaves the site.** The click shield
  over the player now toggles play/pause through our own player (same as
  the Play button, label stays in sync). No press ever reaches YouTube, so
  nothing can open youtube.com — no title/channel/watch-on-YouTube click.
  The shield also means the YouTube frame cannot be dragged: every pointer
  event lands on the shield, not the frame.
- **Website frame unchanged:** it stays clickable/scrollable inside the
  frame (Play/Unmute inside the framed site keep working). A press inside
  it never navigates the main site page away — it stays inside the frame.

## Heads-up
- The saved s2 value is still the Rumble embed
  (https://rumble.com/embed/v7gjukk/). After this publish, Server 2 will
  show the "YouTube-only" message until a YouTube link is saved in the
  admin panel. Saving anything else in admin will also be blocked until
  the Server 2 field holds a YouTube link (or is emptied).
- The Rumble live itself showed "Video not found" in the site-13 check
  (2026-11-24 ~19:00) — the video that was live on 22 Nov is no longer
  available on Rumble. That is a Rumble-side/content issue, not site code.

## Publish
- ZIP RULE (from site-12): files must be at the zip ROOT, no top-level
  folder, or the extract workflow deploys into a useless subfolder.
- Update extract-site.yml filename to bigg-boss-site-14.zip before running
  the workflow.
