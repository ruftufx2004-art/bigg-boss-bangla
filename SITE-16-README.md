# Site-16 — Server 3 shows "সার্ভারের কাজ চলছে" (Limon site blocks framing)

## Why
Samiya put the Limon IPTV site (https://limon-iptv-pro.vercel.app/) on
Server 3 (19:28). Site-15 published it, but verification found the Limon
site refuses to be embedded (ERR_BLOCKED_BY_RESPONSE — its
X-Frame-Options / frame-ancestors blocks framing; it loads fine directly,
so no Bigg Boss-side change can fix it). Samiya's answer (19:35):
"আপাতত ব্ল্যাঙ্ক রাখো, ওই সার্ভারটিতে লেখা উঠবে — সার্ভারের কাজ চলছে।"
So Server 3 shows a maintenance message for now, no external site.

## What changed (vs site-15)
- ADDED maintenance.html at the site root: a standalone dark page that
  says "সার্ভারের কাজ চলছে" (with pulsing dots + "শীঘ্রই ফিরে আসছি —
  একটু অপেক্ষা করুন।"), noindex, no external assets.
- NO changes to index.html, admin.html or functions/api/config.js.
- The message is placed near the TOP of the page (padding-top ~170px),
  NOT vertically centred: the site's cropped website frame is 1600px
  tall but only its top ~560px are visible, so centred content would
  fall below the visible area.

## Config to set after publish (admin panel)
- Server 3 (s3) = https://bigg-boss-bangla.pages.dev/maintenance.html
- Server 1 (live) = https://biggboss-bangla.blogspot.com/ (unchanged)
- Server 2 (s2) = stays the YouTube video (EaYRymDpVJI, Ep-78)
- frameTop = 0, frameHeight 560, frameZoom 1 (unchanged)
- Result: clicking Server 3 shows the "সার্ভারের কাজ চলছে" message
  inside the frame; Server 1 still shows her Blogspot site, Server 2
  still plays YouTube with ±10s buttons. No Rumble anywhere.

## Later
- If the Limon site ever allows framing, or Samiya picks another
  Server 3 source, just change s3 in the admin panel — no republish.
- The same maintenance.html can be reused for any other server the
  same way (it names no server number on purpose).

## Publish
- ZIP RULE (from site-12): files must be at the zip ROOT, no top-level
  folder, or the extract workflow deploys into a useless subfolder.
- Update extract-site.yml filename to bigg-boss-site-16.zip before running
  the workflow.
