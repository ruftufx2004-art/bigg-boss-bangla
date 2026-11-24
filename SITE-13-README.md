# Site-13 — Blogspot embed + Admin Blog controls

## What changed
- Homepage: a new **📝 আমাদের ব্লগ** section under the live player shows the
  Blogspot site (https://biggboss-bangla.blogspot.com/) in a cropped,
  interactive frame — same pattern as the live website frame (clickable,
  scrollable). It is hidden until /api/config loads.
- Admin Panel: a new **📝 ব্লগ — Blogspot সাইট** card with
  - Blog URL field (any Blogspot/blog URL works)
  - 🟢 চালু / 🔴 বন্ধ toggle (blogOn) — off hides the section, link kept
  - Crop from top (blogTop, px, ▲ ▼ buttons), frame height (blogHeight),
    zoom (blogZoom, 0.5–2) — exactly like the live frame controls
  - A live preview iframe that moves/zooms with the controls
- /api/config (functions/api/config.js): new live fields blogUrl, blogTop,
  blogHeight, blogZoom, blogOn — stored in Supabase live_config (row id=1),
  KV fallback keys cfg:blogUrl / cfg:blogTop / cfg:blogHeight / cfg:blogZoom /
  cfg:blogOn. Defaults: blogspot URL, top 0, height 560, zoom 1, on.
- Supabase SQL: ~/workspace/bigg-boss-site-13-supabase.sql (run BEFORE publish).

## Notes
- The blog frame is interactive: visitors can click links inside the blog
  and scroll it. The blog's /personal page is NOT in the blog menu, so it
  won't show up unless someone opens its direct link inside the frame.
- Blogspot pages allow iframing (same as the /personal TamilToonz iframe
  already proven on Blogger) — verify live after publish.
- ZIP RULE (from site-12): files must be at the zip ROOT, no top-level
  folder, or the extract workflow deploys into a useless subfolder.
