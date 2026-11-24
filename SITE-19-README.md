# Site-19 — OK.ru video on Server 1 (Kick stays on Server 2)

## Why
Samiya sent an OK.ru video embed iframe
(<iframe src="//ok.ru/videoembed/17758882569855?nochat=1" ...>) and
said: put this on Server 1.

## What changed (vs site-18)
- OK.ru videoembed links (ok.ru/videoembed/...) now count as video
  embeds: index.html isEmbed() and admin.html isWebsiteLink() both
  treat them like /embed/ URLs. Without this, the OK.ru link has no
  "/embed/" in it, so the site would have shown it in the cropped
  website frame instead of the video player.
- OK.ru embeds get the SAME lock as Kick embeds (site-18): a new
  isOkEmbed() helper, and load() sandboxes Kick OR OK.ru frames
  (no top navigation, no popups) and turns off the player's own
  fullscreen — so viewers cannot click out to ok.ru, and the only
  fullscreen is the site's own Fullscreen / Landscape buttons. The
  YouTube-only buttons stay hidden for OK.ru, like for Kick.
- admin.html toEmbed() now normalises protocol-relative links
  (//ok.ru/... -> https://ok.ru/...) so the saved config is a clean
  https URL. (A // URL would also have worked on the https site, but
  the stored value is now explicit.)
- Admin labels/hints: OK.ru added to the Server 1 platform list and
  the bottom generic hint.
- No changes to functions/api/config.js or maintenance.html.

## Config to set after publish (admin panel)
- Server 1 (live) = https://ok.ru/videoembed/17758882569855?nochat=1
- Server 2 (s2) = stays https://player.kick.com/biggbossbruh
- Server 3 (s3) = stays https://bigg-boss-bangla.pages.dev/maintenance.html
- frameTop = 0, frameHeight 560, frameZoom 1 (unchanged)
- Result: Server 1 plays the OK.ru video, Server 2 still plays the
  Kick live, Server 3 still shows "সার্ভারের কাজ চলছে". No Rumble
  anywhere.

## Publish
- ZIP RULE (from site-12): files must be at the zip ROOT, no top-level
  folder, or the extract workflow deploys into a useless subfolder.
- Update extract-site.yml filename to bigg-boss-site-19.zip before running
  the workflow.
