// sw.js — service worker. Caches the app so it opens instantly and works offline.
// Strategy: serve from cache right away, then fetch a fresh copy in the background
// for next time. Bump VERSION when you change files to force a clean update.
const VERSION = 'still-v1';
const FILES = [
  './', 'index.html', 'styles.css', 'manifest.webmanifest',
  'js/app.js', 'js/session.js', 'js/storage.js', 'js/sensors.js', 'js/sound.js',
  'js/scenes.js', 'js/ui-stats.js', 'js/ui-insights.js',
  'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const cached = await cache.match(e.request, { ignoreSearch: true });
      const fresh = fetch(e.request)
        .then((res) => { if (res.ok) cache.put(e.request, res.clone()); return res; })
        .catch(() => cached);
      return cached || fresh;
    })
  );
});
