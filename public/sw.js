// Hi AQLI Service Worker
// Minimal implementation to satisfy PWA installation requirements

const CACHE_NAME = 'hi-aqli-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Only handle http/https requests
  if (!event.request.url.startsWith('http')) return;

  // We don't cache much here to let Next.js handle it, 
  // but a fetch listener is REQUIRED for PWA installation.
  event.respondWith(
    fetch(event.request)
      .catch((error) => {
        console.error('[SW] Fetch failed:', error);
        // Fallback or just let it fail without a generic promise rejection error
        return new Response('Network error occurred', {
          status: 408,
          headers: { 'Content-Type': 'text/plain' }
        });
      })
  );
});
