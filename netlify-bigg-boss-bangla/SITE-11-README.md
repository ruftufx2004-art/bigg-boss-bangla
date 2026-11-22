site-11 — shop preview fix (2026-11-22)
- index.html: player iframe + Server 1 button no longer hardcode shop.bihishaan.com.
  On load the player now shows "Connecting to live feed…" until /api/config
  returns, then loads the real live from the Admin Panel. Server 1's button
  is also updated from config (it used to keep the stale shop link).
  If config fails, visitors see "লাইভ লোড হয়নি — পেজটা রিফ্রেশ করুন" instead of the shop.
- functions/api/config.js: DEFAULTS.live is now "" (was the shop URL), so a
  missing live setting can never fall back to the shop again.
- Base: site-9 (the KV-limit site-10 fix is NOT in this zip — still awaiting her yes).
