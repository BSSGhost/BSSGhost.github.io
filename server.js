/* =========================================================
   SUNU MOYENNE — Serveur (backend de l'espace professeur)
   ----------------------------------------------------------
   Sert les fichiers statiques du site ET l'API d'authentification
   de l'espace professeur :

     POST /api/prof/login             { username, password }
     POST /api/prof/logout            (Bearer token)
     GET  /api/prof/me                (Bearer token)
     POST /api/prof/change-password   { currentPassword, newPassword } (Bearer token)

   Sécurité :
     - mots de passe hashés avec scrypt + sel aléatoire (node:crypto)
     - sessions par jeton aléatoire (32 octets), expirent après SESSION_TTL_HOURS
     - limite de tentatives de connexion par IP (anti force brute simple)
     - aucune donnée d'authentification exposée dans le code client

   Lancement :  node server.js          (variable PORT, défaut 3000)
   Comptes   :  node create-account.js add <username> [nom]
   ========================================================= */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, normalize, extname } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const ROOT = process.cwd();
const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = process.env.DATA_DIR || join(ROOT, 'data');
const DB_PATH = join(DATA_DIR, 'lynaqe.db');
const SESSION_TTL_MS = 1000 * 60 * 60 * (Number(process.env.SESSION_TTL_HOURS || 12));
const LOGIN_MAX_FAILURES = 10;
const LOGIN_WINDOW_MS = 1000 * 60 * 15;
const BODY_LIMIT = 16 * 1024;

/* ------------------- Base de données ------------------- */

mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT    NOT NULL UNIQUE,
    name          TEXT    NOT NULL DEFAULT '',
    role          TEXT    NOT NULL DEFAULT 'prof',
    password_hash TEXT    NOT NULL,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT    PRIMARY KEY,
    username   TEXT    NOT NULL REFERENCES users(username),
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    expires_at INTEGER NOT NULL
  );
`);

db.prepare('CREATE INDEX IF NOT EXISTS idx_sessions_username ON sessions(username)').run();

const SESSION_TTL_S = Math.floor(SESSION_TTL_MS / 1000);

function pruneExpiredSessions() {
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
}

/* -------------------- Hachage scrypt -------------------- */

function hashPassword(password) {
  const salt = randomBytes(16);
  const key = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
}

function verifyPassword(password, stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, saltHex, hashHex] = parts;
  let key;
  try {
    key = scryptSync(password, Buffer.from(saltHex, 'hex'), 64);
  } catch {
    return false;
  }
  const expected = Buffer.from(hashHex, 'hex');
  return expected.length === key.length && timingSafeEqual(expected, key);
}

/* ---------------- Authentification tokens --------------- */

function createSession(username) {
  const token = randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions (token, username, expires_at) VALUES (?, ?, ?)')
    .run(token, username, Date.now() + SESSION_TTL_MS);
  return token;
}

function getUserByToken(token) {
  if (!token) return null;
  pruneExpiredSessions();
  const row = db
    .prepare(
      `SELECT u.username, u.name, u.role
         FROM sessions s JOIN users u ON u.username = s.username
        WHERE s.token = ?`
    )
    .get(token);
  return row || null;
}

function publicUser(row) {
  return { username: row.username, name: row.name, role: row.role };
}

/* ------------------- Anti force brute ------------------- */

const loginFailures = new Map();

function tooManyAttempts(ip) {
  const now = Date.now();
  const failures = loginFailures.get(ip);
  if (!failures) return false;
  failures.entries = failures.entries.filter((t) => now - t < LOGIN_WINDOW_MS);
  if (failures.entries.length >= LOGIN_MAX_FAILURES) return true;
  if (failures.entries.length === 0) loginFailures.delete(ip);
  return false;
}

function recordFailure(ip) {
  const now = Date.now();
  const failures = loginFailures.get(ip) || { entries: [] };
  failures.entries.push(now);
  failures.entries = failures.entries.filter((t) => now - t < LOGIN_WINDOW_MS);
  loginFailures.set(ip, failures);
}

function clearFailures(ip) {
  loginFailures.delete(ip);
}

/* -------------- Réponse HTTP / corps JSON ---------------- */

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(payload);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > BODY_LIMIT) {
        reject(new Error('NODE_BODY_TOO_LARGE'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (chunks.length === 0) return resolve({});
      try {
        const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        resolve(parsed && typeof parsed === 'object' ? parsed : {});
      } catch {
        reject(new Error('NODE_BODY_INVALID'));
      }
    });
    req.on('error', reject);
  });
}

function bearerToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

/* --------------------- API professeur ------------------- */

async function handleApi(req, res, url) {
  const { pathname } = url;

  if (req.method === 'GET' && pathname === '/api/prof/me') {
    const user = getUserByToken(bearerToken(req));
    if (!user) return sendJson(res, 401, { error: 'non_authentifie' });
    return sendJson(res, 200, { user: publicUser(user) });
  }

  if (req.method === 'POST' && pathname === '/api/prof/login') {
    const ip = req.socket.remoteAddress || 'unknown';
    if (tooManyAttempts(ip)) return sendJson(res, 429, { error: 'trop_de_tentatives' });

    let body;
    try {
      body = await readJsonBody(req);
    } catch {
      return sendJson(res, 400, { error: 'corps_invalide' });
    }

    const username = String(body.username || '').trim().toLowerCase();
    const password = String(body.password || '');
    const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

    if (!row || !verifyPassword(password, row.password_hash)) {
      recordFailure(ip);
      return sendJson(res, 401, { error: 'identifiants_incorrects' });
    }

    clearFailures(ip);
    const token = createSession(row.username);
    return sendJson(res, 200, { token, user: publicUser(row) });
  }

  if (req.method === 'POST' && pathname === '/api/prof/logout') {
    const token = bearerToken(req);
    if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === 'POST' && pathname === '/api/prof/change-password') {
    const token = bearerToken(req);
    const user = getUserByToken(token);
    if (!user) return sendJson(res, 401, { error: 'non_authentifie' });

    let body;
    try {
      body = await readJsonBody(req);
    } catch {
      return sendJson(res, 400, { error: 'corps_invalide' });
    }

    const row = db.prepare('SELECT * FROM users WHERE username = ?').get(user.username);
    if (!row || !verifyPassword(String(body.currentPassword || ''), row.password_hash)) {
      return sendJson(res, 403, { error: 'mot_de_passe_incorrect' });
    }

    const newPassword = String(body.newPassword || '');
    if (newPassword.length < 8) {
      return sendJson(res, 400, { error: 'mot_de_passe_trop_court' });
    }

    db.prepare('UPDATE users SET password_hash = ? WHERE username = ?')
      .run(hashPassword(newPassword), user.username);
    db.prepare('DELETE FROM sessions WHERE username = ?').run(user.username);
    return sendJson(res, 200, { ok: true });
  }

  return sendJson(res, 404, { error: 'inconnu' });
}

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

/* Fichiers internes jamais servis (base de données, dépendances, git…). */
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
    sendJson(res, 400, { error: 'url_invalide' });
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    return handleApi(req, res, url);
  }

  return serveStatic(res, url.pathname);
});

server.listen(PORT, () => {
  console.log(`SUNU MOYENNE — serveur démarré sur http://localhost:${PORT}`);
  console.log(`Base de données : ${DB_PATH}`);
});