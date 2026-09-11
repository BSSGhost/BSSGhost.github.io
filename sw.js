/* =========================================================
   SERVICE WORKER — SUNU MOYENNE
   Mise en cache des fichiers statiques pour permettre un
   fonctionnement hors-ligne complet (calcul, PDF, OCR).
   Incrémenter CACHE_VERSION à chaque déploiement.
   ========================================================= */
const CACHE_VERSION = 'v27';
const CACHE_NAME = `sunu-moyenne-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './prof.js',
  './ocr.js',
  './manifest.json',
  './LYNAQE.png',
  './force-armee.webp',
  './MEN.webp',
  './lynaqe-03.webp',
  './js/jspdf.umd.min.js',
  './vendor/tesseract/tesseract.min.js',
  './vendor/tesseract/worker.min.js',
  './vendor/tesseract/fra.traineddata',
  './vendor/tesseract/eng.traineddata',
  './vendor/tesseract/tesseract-core.wasm.js',
  './vendor/tesseract/tesseract-core-simd.wasm.js',
  './vendor/tesseract/tesseract-core-lstm.wasm.js',
  './vendor/tesseract/tesseract-core-simd-lstm.wasm.js',
  './vendor/pdfjs/pdf.min.mjs',
  './vendor/pdfjs/pdf.worker.min.mjs',
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

/* ------------------ Installation ------------------- */

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) =>
        Promise.all(
          PRECACHE_URLS.map((url) =>
            cache.add(url).catch(() => {})
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

/* ------------------ Activation ------------------- */

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

/* ------------------ Stratégies de cache ------------------- */

function isHTML(request) {
  return request.headers.get('accept')?.includes('text/html');
}

function isFont(request) {
  const url = new URL(request.url);
  return /\.(woff2?|ttf|eot)$/i.test(url.pathname);
}

function isImage(request) {
  const url = new URL(request.url);
  return /\.(png|jpe?g|webp|gif|svg|ico)$/i.test(url.pathname);
}

/* Réseau d'abord pour HTML : toujours avoir la dernière version */
function networkFirst(request) {
  return fetch(request)
    .then((response) => {
      if (response && response.status === 200) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
      }
      return response;
    })
    .catch(() => caches.match(request));
}

/* Cache d'abord pour images et polices : accès rapide, pas de réseau nécessaire */
function cacheFirst(request) {
  return caches.match(request).then((cached) => {
    if (cached) return cached;
    return fetch(request).then((response) => {
      if (response && response.status === 200) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
      }
      return response;
    });
  });
}

/* Réseau d'abord puis cache pour CSS/JS : idem HTML mais avec fallback cache */
function networkCacheFallback(request) {
  return fetch(request)
    .then((response) => {
      if (response && response.status === 200) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
      }
      return response;
    })
    .catch(() => caches.match(request));
}

/* ------------------ Intercepteur fetch ------------------- */

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.method !== 'GET') return;

  const pathname = url.pathname;

  /* Fonts et images → cache-first */
  if (isFont(event.request) || isImage(event.request)) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  /* HTML → network-first */
  if (pathname.endsWith('/') || pathname === '' || pathname.endsWith('.html') || isHTML(event.request)) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  /* CSS / JS / vendor → network-first + cache fallback */
  if (/\.(css|js|mjs)$/i.test(pathname) || pathname.startsWith('/vendor/')) {
    event.respondWith(networkCacheFallback(event.request));
    return;
  }

  /* Autres → network-first */
  event.respondWith(networkFirst(event.request));
});

/* ------------------ Notification de mise à jour ------------------- */

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});