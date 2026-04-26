/**
 * Service worker minimal : permet l’installation PWA (Android/Chrome) sans cache agressif.
 * Les requêtes passent toujours au réseau.
 */
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
