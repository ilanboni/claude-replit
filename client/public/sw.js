// Service worker minimale per PWA installabile + cache statici + offline fallback.
// Tutte le chiamate /api/ sono network-first (dati freschi). Asset statici sono cache-first.

const CACHE_VERSION = 'immogest-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const API_OFFLINE_FALLBACK = '/offline.json';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll([
        '/',
        '/favicon.png',
        '/manifest.webmanifest',
      ]).catch(() => {})
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !key.startsWith(CACHE_VERSION))
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // API: network-first, no cache (vogliamo sempre dati freschi)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => new Response(
        JSON.stringify({ error: 'offline', message: 'Connessione assente — riprova quando torni online' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      ))
    );
    return;
  }

  // Asset statici: cache-first
  if (url.pathname.startsWith('/assets/') ||
      url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.svg') ||
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.webmanifest')) {
    event.respondWith(
      caches.match(request).then((cached) =>
        cached || fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
      )
    );
    return;
  }

  // Navigazioni HTML: network-first con fallback cache (SPA shell)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/'))
    );
    return;
  }
});
