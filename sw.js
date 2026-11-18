// Bigg Boss Bangla — minimal service worker: cache the shell + icons so the
// installed app opens fast and works offline for the shell.
const CACHE = "bbb-v1";
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
