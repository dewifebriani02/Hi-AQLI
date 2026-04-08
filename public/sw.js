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
  // We don't cache much here to let Next.js handle it, 
  // but a fetch listener is REQUIRED for PWA installation.
  event.respondWith(fetch(event.request));
});
