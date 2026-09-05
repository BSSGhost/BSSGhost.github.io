/* =========================================================
   SERVICE WORKER — SUNU MOYENNE
   Mise en cache minimale des fichiers statiques pour permettre
   un chargement hors-ligne après une première visite en ligne.
   Incrémenter CACHE_NAME à chaque déploiement pour invalider
   l'ancien cache.
   ========================================================= */
const CACHE_NAME = 'sunu-moyenne-v10';

const PRECACHE_URLS = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './manifest.json',
  './LYNAQE.png',
  './force-armee.webp',
  './MEN.webp',
  './js/jspdf.umd.min.js',
  './fonts/plus-jakarta-sans-400.woff2',
  './fonts/plus-jakarta-sans-500.woff2',
  './fonts/plus-jakarta-sans-600.woff2',
  './fonts/plus-jakarta-sans-700.woff2',
  './fonts/plus-jakarta-sans-800.woff2',
  './fonts/fraunces-400.woff2',
  './fonts/fraunces-500.woff2',
  './fonts/fraunces-600.woff2',
  './fonts/fraunces-700.woff2',
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

// Stratégie "réseau d'abord, cache en secours" pour les fichiers du
// site. Tant que l'appareil a du réseau, il reçoit toujours la
// dernière version déployée ; le cache ne sert que si la requête
// réseau échoue (mode hors-ligne). Les polices sont auto-hébergées
// et précachées ci-dessus, tout comme jsPDF (./js/jspdf.umd.min.js) :
// la génération du bulletin PDF fonctionne donc entièrement hors-ligne,
// dès la première visite en ligne.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});