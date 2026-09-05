// Offline cache for Desi Taboo. Network-first so updates land immediately; cache keeps it playable offline.
const CACHE = 'desi-taboo-v2';
const ASSETS = [
  './', './index.html', './css/style.css', './js/words.js', './js/audio.js', './js/app.js',
  './js/vendor/gsap.min.js', './js/vendor/howler.min.js', './js/vendor/confetti.min.js',
  './manifest.webmanifest', './icon.svg',
  ...['tap', 'tick', 'correct', 'taboo', 'skip', 'whoosh', 'countdown', 'go', 'timesup', 'dhol', 'win'].map(n => `./assets/sfx/${n}.wav`)
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
