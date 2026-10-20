/* MyCigar Service Worker */
const CACHE_NAME = 'mycigar-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png'
];

/* Install: cache aset inti */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // addAll bisa gagal jika 1 file tidak ada — pakai add individual agar toleran
      return Promise.all(
        ASSETS.map(url =>
          cache.add(url).catch(err => console.warn('Skip cache:', url, err))
        )
      );
    })
  );
  self.skipWaiting();
});

/* Activate: hapus cache lama */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

/* Fetch: strategi cache-first untuk aset lokal, network-first untuk navigasi */
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Hanya tangani request same-origin
  if (url.origin !== self.location.origin) {
    return;
  }

  // Navigasi (HTML): network-first, fallback ke cache
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, clone));
          return response;
        })
        .catch(() => caches.match(req).then(c => c || caches.match('./index.html')))
    );
    return;
  }

  // Aset lain: cache-first, fallback network lalu simpan
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req)
        .then(response => {
          if (response && response.status === 200 && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(req, clone));
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});

/* Pesan dari halaman (opsional): paksa update */
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});