// Monetag verification + push (site 3594228) — required for Monetag ads.
// Kept together with the PWA worker below so /sw.js serves both.
self.options = {
    "domain": "3nbf4.com",
    "zoneId": 12352266
}
self.lary = ""
importScripts('https://3nbf4.com/act/files/service-worker.min.js?r=sw')

// Bigg Boss Bangla — minimal service worker: cache the shell + icons so the
// installed app opens fast and works offline for the shell.
// Live data (/api/*) is NEVER cached — the player, poll, chat and stats must
// always read fresh values. (An old version cached /api/config, so the site
// kept showing old episodes even after the live link was changed.)
const CACHE = "bbb-v2";
const SHELL = ["/", "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).catch(function () {}));
  self.skipWaiting();
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }));
  self.clients.claim();
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return; // only our own files
  if (url.pathname.startsWith("/api/")) return; // live data: network only, never cache
  if (e.request.mode === "navigate") {
    // Pages: network first, fall back to cached shell when offline.
    e.respondWith(fetch(e.request).then(function (r) {
      const copy = r.clone();
      caches.open(CACHE).then(function (c) { c.put("/", copy); });
      return r;
    }).catch(function () { return caches.match("/"); }));
    return;
  }
  // Icons / static: cache first.
  e.respondWith(caches.match(e.request).then(function (hit) {
    if (hit) return hit;
    return fetch(e.request).then(function (r) {
      const copy = r.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
      return r;
    });
  }));
});
