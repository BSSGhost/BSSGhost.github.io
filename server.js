/* =========================================================
   SUNU MOYENNE — Serveur (fichiers statiques uniquement)
   ----------------------------------------------------------
   Sert les fichiers statiques du site.

   Lancement :  node server.js          (variable PORT, défaut 3000)
   ========================================================= */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, normalize, extname } from 'node:path';

const ROOT = process.cwd();
const PORT = Number(process.env.PORT || 3000);

/* ----------------- Réponse HTTP ------------------- */

/* -------------- Réponse HTTP / corps JSON ---------------- */

/* -------------------- Fichiers statiques ----------------- */

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.pdf': 'application/pdf'
};

function resolveStaticPath(pathname) {
  if (pathname === '/') return join(ROOT, 'index.html');
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  const resolved = normalize(join(ROOT, decoded));
  const root = normalize(ROOT);
  const sep = process.platform === 'win32' ? '\\' : '/';
  if (resolved !== root && !resolved.startsWith(root + sep)) return null;
  return resolved;
}

function isForbiddenStaticFile(filePath) {
  const normalized = normalize(filePath);
  const forbidden = [
    normalize(join(ROOT, 'data')),
    normalize(join(ROOT, 'node_modules')),
    normalize(join(ROOT, '.git')),
    normalize(join(ROOT, 'server.js')),
    normalize(join(ROOT, 'create-account.js')),
    normalize(join(ROOT, 'package.json')),
    normalize(join(ROOT, 'package-lock.json'))
  ];
  return forbidden.some(
    (entry) => normalized === entry || normalized.startsWith(entry + (process.platform === 'win32' ? '\\' : '/'))
  );
}

async function serveStatic(res, pathname) {
  const filePath = resolveStaticPath(pathname);
  if (!filePath || isForbiddenStaticFile(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Introuvable');
    return;
  }

  let info;
  try {
    info = await stat(filePath);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Introuvable');
    return;
  }

  if (info.isDirectory()) {
    return serveStatic(res, join(pathname, 'index.html'));
  }

  const mime = MIME_TYPES[extname(filePath).toLowerCase()] || 'application/octet-stream';
  const content = await readFile(filePath);
  res.writeHead(200, {
    'Content-Type': mime,
    'Content-Length': content.length,
    'Cache-Control': pathname.startsWith('/api') ? 'no-store' : 'public, max-age=0, must-revalidate'
  });
  res.end(content);
}

/* ------------------------- Serveur ---------------------- */

const server = createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  let url;
  try {
    url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'url_invalide' }));
    return;
  }

  return serveStatic(res, url.pathname);
});

server.listen(PORT, () => {
  console.log(`SUNU MOYENNE — serveur démarré sur http://localhost:${PORT}`);
});
