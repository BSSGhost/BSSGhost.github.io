/* SUNU MOYENNE — serveur statique + API de migration de notes.
   Variables MySQL : DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME.
   Lancement : npm start (variable PORT, défaut 3000) */
import 'dotenv/config';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, normalize, extname } from 'node:path';
import { randomBytes, createHash } from 'node:crypto';
let mysql = null;

const ROOT = process.cwd();
const PORT = Number(process.env.PORT || 3000);
const MIGRATION_TTL_HOURS = Number(process.env.MIGRATION_TTL_HOURS || 24);
const MAX_BODY_BYTES = 2 * 1024 * 1024;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.pdf': 'application/pdf'
};

let pool = null;
let dbInitPromise = null;

function hasDatabaseConfig() {
  return Boolean(process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME);
}

async function getDb() {
  if (!hasDatabaseConfig()) throw new Error('mysql_not_configured');
  if (!mysql) mysql = (await import('mysql2/promise')).default;
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 5),
      queueLimit: 0,
      charset: 'utf8mb4'
    });
  }
  if (!dbInitPromise) {
    dbInitPromise = pool.execute(`
      CREATE TABLE IF NOT EXISTS migrations (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        migration_code_hash CHAR(64) NOT NULL,
        data LONGTEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL,
        imported_at DATETIME NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_migration_code_hash (migration_code_hash),
        KEY idx_migration_expires_at (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `).then(() => true);
  }
  await dbInitPromise;
  return pool;
}

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(body);
}

async function readJsonBody(req) {
  let total = 0;
  const chunks = [];
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_BODY_BYTES) throw new Error('payload_too_large');
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { throw new Error('invalid_json'); }
}

function hashCode(code) {
  return createHash('sha256').update(code, 'utf8').digest('hex');
}

function createMigrationCode() {
  return `SM-${randomBytes(18).toString('base64url')}`;
}

async function cleanupExpiredMigrations(db) {
  await db.execute('DELETE FROM migrations WHERE expires_at < NOW() OR imported_at IS NOT NULL');
}

async function createMigration(req, res) {
  try {
    const body = await readJsonBody(req);
    if (!body || typeof body.data !== 'object' || body.data === null || Array.isArray(body.data)) {
      return json(res, 400, { error: 'donnees_invalides' });
    }
    const serialized = JSON.stringify(body.data);
    if (Buffer.byteLength(serialized, 'utf8') > 1024 * 1024) {
      return json(res, 413, { error: 'donnees_trop_volumineuses' });
    }

    const db = await getDb();
    await cleanupExpiredMigrations(db);

    let code;
    let hash;
    for (let i = 0; i < 5; i += 1) {
      code = createMigrationCode();
      hash = hashCode(code);
      try {
        const expiresAt = new Date(Date.now() + MIGRATION_TTL_HOURS * 60 * 60 * 1000);
        await db.execute(
          'INSERT INTO migrations (migration_code_hash, data, expires_at) VALUES (?, ?, ?)',
          [hash, serialized, expiresAt]
        );
        break;
      } catch (error) {
        if (error?.code !== 'ER_DUP_ENTRY' || i === 4) throw error;
      }
    }

    const origin = `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers['x-forwarded-host'] || req.headers.host}`;
    const migrationUrl = `${origin}/migration/${encodeURIComponent(code)}`;
    return json(res, 201, {
      ok: true,
      code,
      url: migrationUrl,
      expiresAt: new Date(Date.now() + MIGRATION_TTL_HOURS * 60 * 60 * 1000).toISOString()
    });
  } catch (error) {
    console.error('Migration create:', error);
    const known = ['mysql_not_configured', 'payload_too_large', 'invalid_json', 'donnees_trop_volumineuses'];
    if (known.includes(error?.message)) {
      const status = error.message === 'mysql_not_configured' ? 503 : error.message === 'payload_too_large' || error.message === 'donnees_trop_volumineuses' ? 413 : 400;
      return json(res, status, { error: error.message });
    }
    return json(res, 500, { error: 'serveur_indisponible' });
  }
}

async function importMigration(req, res, code) {
  try {
    if (!/^SM-[A-Za-z0-9_-]{20,80}$/.test(code)) return json(res, 400, { error: 'code_invalide' });
    const db = await getDb();
    await cleanupExpiredMigrations(db);
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const [rows] = await connection.execute(
        'SELECT id, data, expires_at FROM migrations WHERE migration_code_hash = ? FOR UPDATE',
        [hashCode(code)]
      );
      if (!rows.length) {
        await connection.rollback();
        return json(res, 404, { error: 'migration_introuvable' });
      }
      const row = rows[0];
      if (new Date(row.expires_at).getTime() <= Date.now()) {
        await connection.execute('DELETE FROM migrations WHERE id = ?', [row.id]);
        await connection.commit();
        return json(res, 410, { error: 'migration_expiree' });
      }
      await connection.execute('UPDATE migrations SET imported_at = NOW() WHERE id = ?', [row.id]);
      await connection.execute('DELETE FROM migrations WHERE id = ?', [row.id]);
      await connection.commit();
      let data;
      try { data = JSON.parse(row.data); } catch { return json(res, 500, { error: 'donnees_corrompues' }); }
      return json(res, 200, { ok: true, data });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Migration import:', error);
    return json(res, error?.message === 'mysql_not_configured' ? 503 : 500, { error: error?.message === 'mysql_not_configured' ? 'mysql_not_configured' : 'serveur_indisponible' });
  }
}

function resolveStaticPath(pathname) {
  if (pathname === '/' || pathname === '/migration' || pathname.startsWith('/migration/')) return join(ROOT, 'index.html');
  let decoded;
  try { decoded = decodeURIComponent(pathname); } catch { return null; }
  const resolved = normalize(join(ROOT, decoded));
  const root = normalize(ROOT);
  const sep = process.platform === 'win32' ? '\\' : '/';
  if (resolved !== root && !resolved.startsWith(root + sep)) return null;
  return resolved;
}

function isForbiddenStaticFile(filePath) {
  const normalized = normalize(filePath);
  const forbidden = [
    normalize(join(ROOT, 'node_modules')), normalize(join(ROOT, '.git')),
    normalize(join(ROOT, 'server.js')), normalize(join(ROOT, 'package.json')),
    normalize(join(ROOT, 'package-lock.json'))
  ];
  return forbidden.some((entry) => normalized === entry || normalized.startsWith(entry + (process.platform === 'win32' ? '\\' : '/')));
}

async function serveStatic(res, pathname) {
  const filePath = resolveStaticPath(pathname);
  if (!filePath || isForbiddenStaticFile(filePath)) return json(res, 404, { error: 'introuvable' });
  let info;
  try { info = await stat(filePath); } catch { return json(res, 404, { error: 'introuvable' }); }
  if (info.isDirectory()) return serveStatic(res, join(pathname, 'index.html'));
  const mime = MIME_TYPES[extname(filePath).toLowerCase()] || 'application/octet-stream';
  const content = await readFile(filePath);
  res.writeHead(200, { 'Content-Type': mime, 'Content-Length': content.length, 'Cache-Control': 'public, max-age=0, must-revalidate' });
  res.end(content);
}

const server = createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  let url;
  try { url = new URL(req.url, `http://${req.headers.host || 'localhost'}`); }
  catch { return json(res, 400, { error: 'url_invalide' }); }

  if (url.pathname === '/api/migration/create' && req.method === 'POST') return createMigration(req, res);
  if (url.pathname === '/api/migration/import' && req.method === 'POST') {
    let body;
    try { body = await readJsonBody(req); } catch (error) { return json(res, 400, { error: error.message }); }
    return importMigration(req, res, String(body.code || ''));
  }
  if (url.pathname === '/api/migration/health' && req.method === 'GET') {
    try { await getDb(); return json(res, 200, { ok: true, database: true }); }
    catch { return json(res, 503, { ok: false, database: false }); }
  }
  return serveStatic(res, url.pathname);
});

server.listen(PORT, () => console.log(`SUNU MOYENNE — serveur démarré sur http://localhost:${PORT}`));
