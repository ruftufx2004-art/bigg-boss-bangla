# Site-12 — Poll votes + Fan Chat moved to Supabase

Base: site-11 (shop-preview fix). New in site-12: votes and chat no longer
use Cloudflare KV, so they keep working when the KV daily write limit breaks
(it broke 4 days running, 2026-11-19–22 — votes/chat blocked until 06:00).

## What moved (Supabase project bigg-boss-live)
- `poll_votes` (name, count) + `poll_voters` (device, choice) — vote counts
  and 1-vote-per-device. Seeded with the live KV data (2026-11-22 21:12):
  Rajveer Dey 3, Monami Ghosh 2, total 5.
- `chat_messages` (id, name, text, t, parent, likes, reacts) + `chat_rate`
  (device, last_ms — 5s spam guard). Seeded with the 7 live messages
  (all Limon, "Hi"; last one liked by dmwlatjatjinb1s6j).
- Tables created 2026-11-22 ~21:13 via Supabase dashboard SQL
  (see ~/workspace/bigg-boss-site-12-supabase.sql). RLS on, service_role
  granted SELECT/INSERT/UPDATE/DELETE — same pattern as live_config.

## Code changes (functions/api/)
- `poll.js` — counts/voters read+written via Supabase REST (same pattern as
  config.js). Poll NAMES still read from KV (cfg:pollNames, single-key read).
  Also fixes the old NAMES-before-definition bug in the POST path, and a
  migration bridge: a device that voted before the move (voted:<device> in
  KV) still counts as voted, so nobody can vote twice.
- `chat.js` — messages, likes/reactions, spam guard all Supabase. No KV
  use left. Same frontend contract: GET {ok, messages}, POST {ok, message}.
- `stats.js` — chatTotal + pollVotes now read from Supabase (KV fallback).
- `config.js` — admin Reset Poll now zeroes Supabase votes + deletes voters
  (KV fallback if Supabase is not configured). Header comment updated.

## What did NOT change
- Frontend (index.html) untouched — same /api/poll and /api/chat shapes.
- Live settings still Supabase live_config; stats/views/visitors, poll
  names/photos, Adsterra token, admin password still KV.
- Stats spam (track.js/stats.js KV lists+puts) is NOT fixed here — that is
  the separate site-10 change, still awaiting her answer. If KV breaks
  again, stats stop updating but votes + chat keep working.

## After publish, verify live
- GET /api/poll → total 5 (Rajveer 3, Monami 2).
- GET /api/chat → 7 Limon messages.
- POST one test vote (fresh device, Durnibar Saha) → total 6.
- POST one test chat message → appears in GET → delete it via Supabase SQL.
- Like-toggle a Limon message twice → like count back to original.
