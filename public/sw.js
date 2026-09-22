const BASE = self.registration.scope;
const CACHE_NAME = 'tito-static-v2';
const STATIC_ASSETS = ['index.html', 'manifest.webmanifest', 'favicon.ico'].map(
  (p) => new URL(p, BASE).pathname,
);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS).catch(() => undefined))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Never cache navigations / HTML — auth redirects must always hit network
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(fetch(request));
    return;
  }
  if (url.pathname.includes('supabase') || url.searchParams.has('code')) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request).then((response) => {
        if (
          response.ok &&
          (request.destination === 'script' ||
            request.destination === 'style' ||
            request.destination === 'image' ||
            request.destination === 'font')
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      });
      return cached ?? fetchPromise;
    }),
  );
});
