const CACHE = 'my-investissements-v10';
const CORE = [
  '/',
  '/index.html',
  '/install.html',
  '/investisseur.html',
  '/style.css',
  '/auth.js',
  '/i18n.js',
  '/pwa.js',
  '/firebase-config.js',
  '/manifest.webmanifest',
  '/assets/my-invest-logo-192-v9.jpg',
  '/assets/my-invest-logo-512-v9.jpg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => Promise.all(
      CORE.map(async url => {
        try { await cache.add(url); }
        catch (error) { console.warn('Cache skip:', url, error); }
      })
    ))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE).map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request, { cache: 'no-store' })
      .then(response => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, clone));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === 'navigate') return caches.match('/index.html');
        return Response.error();
      })
  );
});
