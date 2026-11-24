# Site-20 — Server 1 reserved for OK.ru (12-hour live swap)

## Why
Samiya: OK.ru lives end every 12 hours, so new lives will keep coming.
Server 1 must stay RESERVED for OK.ru, and swapping in a new live must
be just "paste the embed code / link in the admin panel and save" —
nothing else to do, no republish, no code change.

## What changed (vs site-19)
- Server 1 is now labelled in the admin panel as the reserved OK.ru
  slot: "Server 1 — OK.ru Live (OK.ru-র জন্য রিজার্ভড — নতুন লাইভের
  embed কোড বা লিংক এখানে বসিয়ে সেভ করুন)", with a hint under it
  explaining the 12-hour swap. Server 1 stays ON (🟢 চালু). The code
  itself stays generic — any platform still works in the slot — but
  the slot is documented as OK.ru's.
- A plain OK.ru watch link now converts to the embed automatically,
  in BOTH places:
  - admin.html toEmbed(): ok.ru/video/<id> -> https://ok.ru/videoembed/<id>?nochat=1
  - index.html ytApiUrl(): same conversion, so even a watch link saved
    earlier (or set any other way) plays in the video player.
  So ALL THREE paste forms work from the admin panel, no thinking needed:
  (1) full <iframe> embed code (src //ok.ru/videoembed/... or
  https://ok.ru/videoembed/...), (2) a videoembed link,
  (3) a plain ok.ru/video/<id> link. Each one saves as the clean
  https://ok.ru/videoembed/<id>?nochat=1 URL.
- Unchanged from site-19: OK.ru embeds play in the video player
  (isEmbed/isWebsiteLink), are sandboxed like Kick (no navigation out
  to ok.ru, player's own fullscreen off), and show only the site's
  Fullscreen + Landscape buttons. Server 2 = Kick, Server 3 =
  maintenance page. No changes to functions/api/config.js.

## Config (unchanged by this release)
- Server 1 (live) = https://ok.ru/videoembed/17758882569855?nochat=1
- Server 2 (s2) = https://player.kick.com/biggbossbruh
- Server 3 (s3) = https://bigg-boss-bangla.pages.dev/maintenance.html
- frameTop = 0, frameHeight 560, frameZoom 1

## Publish
- ZIP RULE (from site-12): files must be at the zip ROOT, no top-level
  folder, or the extract workflow deploys into a useless subfolder.
- Update extract-site.yml filename to bigg-boss-site-20.zip before running
  the workflow.
