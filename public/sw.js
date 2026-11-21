const BASE = self.registration.scope;
const CACHE_NAME = 'tito-static-v7';
const STATIC_ASSETS = ['manifest.webmanifest', 'favicon.ico'].map(
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

  // Never touch third-party or API requests — let browser fetch directly
  if (url.origin !== self.location.origin) return;

  // Never cache navigations / HTML — always hit network for fresh app shell
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(fetch(request));
    return;
  }

  // Never cache Supabase, auth, API, or RPC endpoints
  if (
    url.pathname.includes('supabase') ||
    url.pathname.startsWith('/rest/') ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.startsWith('/storage/') ||
    url.searchParams.has('code')
  ) {
    return;
  }

  // Network-first for JS/CSS so deploys replace old bundles immediately
  if (request.destination === 'script' || request.destination === 'style') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || Response.error())),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request).then((response) => {
        if (
          response.ok &&
          (request.destination === 'image' || request.destination === 'font')
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


// إشعارات التذكير
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = {}; }
  const title = data.title || 'tito';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: new URL('tito-icon-192.png', BASE).pathname,
      badge: new URL('tito-icon-32.png', BASE).pathname,
      dir: 'auto',
      data: { url: data.url || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || '/', BASE).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) { c.navigate(target).catch(() => undefined); return c.focus(); }
      }
      return self.clients.openWindow(target);
    }),
  );
});
