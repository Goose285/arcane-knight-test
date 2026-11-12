/* Arcane Knight service worker: the page (index.html) is network-first (always the newest build when online, cached copy when offline); world-edits.json (the editor's published world changes) is network-first too so a SAVE shows up on the next launch; everything else is cache-first, so the game runs fully offline after the first load. Bump VERSION on each release. */
const VERSION = 'arcane-knight-v72-cozy-preview';
const ASSETS = [
  './', './index.html', './manifest.webmanifest',
  './icons/icon-72.png', './icons/icon-96.png', './icons/icon-128.png', './icons/icon-144.png', './icons/icon-152.png',
  './icons/icon-192.png', './icons/icon-384.png', './icons/icon-512.png', './icons/maskable-512.png', './icons/apple-touch-icon.png', './icons/splash.png'
];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  if (u.origin !== location.origin) return;   // GitHub API etc: never touch cross-origin requests
  if (/\/world-edits\.json$/.test(u.pathname)) {   // network-first, fresh copy cached for offline; missing file = plain 404 (the game treats that as "no edits")
    e.respondWith(fetch(e.request, { cache: 'no-store' }).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put('./world-edits.json', copy)); }
      return res;
    }).catch(() => caches.match('./world-edits.json', { ignoreSearch: true }).then(hit => hit || new Response('', { status: 404 }))));
    return;
  }
  const nav = e.request.mode === 'navigate' || /\/(index\.html)?$/.test(new URL(e.request.url).pathname);
  if (nav) {   // network-first for the page itself so an installed Home Screen app always picks up the newest build
    e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put('./index.html', copy)); }
      return res;
    }).catch(() => caches.match('./index.html', { ignoreSearch: true })));
    return;
  }
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(res => {
    if (res && res.ok && new URL(e.request.url).origin === location.origin) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
    return res;
  }).catch(() => caches.match('./index.html'))));
});
