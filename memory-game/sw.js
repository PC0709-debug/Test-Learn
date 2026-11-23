// sw.js — the service worker: what makes The Ticker work on a plane.
//
// Big picture: a service worker is a small script the browser runs between
// the page and the network. On first visit it downloads every game file into
// a cache. After that, requests are answered from the cache first, so the
// game opens with no WiFi or signal.
//
// When you change any file, bump VERSION so phones fetch the new copies.

const VERSION = 'ticker-v1';
const FILES = [
  './', 'index.html', 'style.css', 'manifest.webmanifest',
  'js/cards-data.js', 'js/srs.js', 'js/store.js', 'js/answer.js', 'js/fx.js', 'js/theme.js', 'js/art.js', 'js/app.js',
  'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png',
];

// Install: download and cache everything.
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

// Activate: delete caches from older versions.
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Fetch: serve our own files from the cache, then try the network (refreshing
// the cache). Google Fonts are cached the first time they load online.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isFont = url.host === 'fonts.googleapis.com' || url.host === 'fonts.gstatic.com';
  if (url.origin !== location.origin && !isFont) return; // e.g. source links: let them go to the web

  e.respondWith(caches.open(VERSION).then(async cache => {
    const hit = await cache.match(req, { ignoreSearch: true });
    const net = fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
      return res;
    }).catch(() => hit);
    return hit || net;
  }));
});
