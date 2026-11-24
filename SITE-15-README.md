# Site-15 — CORRECTION: the live frame itself IS her site (no separate blog section)

## Why
Samiya corrected site-13: the Blogspot site must NOT sit in a separate
section below the live. The live frame itself (Server 1) shows her site —
she routes video -> second website (her Blogspot) -> third website
(Big Boss site) so the video is never embedded directly on her own site
(copyright). Whatever she shows on her site is what the public sees.

## What changed (vs site-14)
- REMOVED the separate "📝 আমাদের ব্লগ" section from the homepage
  (HTML + .bbb-ott-blogframe CSS + blogCfg/showBlog/hideBlog JS +
  applyConfig blog lines). No blog block below the live anymore.
- REMOVED the admin "📝 ব্লগ" card and all blog JS from admin.html
  (the Server 1 field + the existing frame crop controls now run the
  blog frame — no duplicate controls).
- REMOVED blogUrl/blogTop/blogHeight/blogZoom/blogOn from
  functions/api/config.js (DEFAULTS, sbGet select, clampLive, readKvLive,
  readConfig, POST liveFields, KV fallback). The blog_* columns still exist
  in Supabase live_config but nothing reads them — harmless, leave them.
- KEPT site-14 fully: Server 2 YouTube-only, ±10s seek buttons,
  shield-click pause, no YouTube navigation.

## Config to set after publish (admin panel)
- Server 1 (live) = https://biggboss-bangla.blogspot.com/
- Server 3 (s3) = https://biggboss-bangla.blogspot.com/ (backup of the
  same frame; replaces the dead Rumble link)
- Server 2 (s2) = stays the YouTube video (EaYRymDpVJI, Ep-78)
- frameTop = 0 (show her site from the top, as-is — the old 320 crop was
  for the Rumble/shop frame, not her blog)
- frameHeight 560, frameZoom 1 unchanged
- Result: the Server 1 frame shows her Blogspot site directly, with no
  extra layer on top of it (website mode hides the player/controls/
  overlay/shield — the site is fully clickable inside the frame).

## Rumble
- The embed https://rumble.com/embed/v7gjukk/ loads and says
  "Video not found" (confirmed 2026-11-24 ~19:12, twice) — the video no
  longer exists on Rumble. Rumble's main pages were blocked by a
  Cloudflare human-check the browser could not pass, but the embed result
  is conclusive enough. All Rumble links are removed by this change.

## Publish
- ZIP RULE (from site-12): files must be at the zip ROOT, no top-level
  folder, or the extract workflow deploys into a useless subfolder.
- Update extract-site.yml filename to bigg-boss-site-15.zip before running
  the workflow.
