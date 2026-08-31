/* =========================================================
   SERVICE WORKER — SUNU MOYENNE
   Mise en cache minimale des fichiers statiques pour permettre
   un chargement hors-ligne après une première visite en ligne.
   Incrémenter CACHE_NAME à chaque déploiement pour invalider
   l'ancien cache.
   ========================================================= */
const CACHE_NAME = 'sunu-moyenne-v1';

const PRECACHE_URLS = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './manifest.json',
  './LYNAQE.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Stratégie "cache d'abord, réseau en secours" pour les fichiers du
// site. Les requêtes vers d'autres domaines (polices Google, CDN
// jsPDF) passent directement au réseau : on ne veut pas gérer leur
// mise en cache ici.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});
