/* SUNU MOYENNE — serveur statique + API de migration de notes + Espace Administration.
   Variables MySQL : DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME.
   Lancement : npm start (variable PORT, défaut 3000)
   Ajout : Système d'administration RBAC complet
*/

import 'dotenv/config';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, normalize, extname, resolve, sep } from 'node:path';
import { randomBytes, createHash, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(scryptCallback);
import mysql from 'mysql2/promise';
import { getDbSslConfig } from './db-ssl.js';
import { isPublicStaticPath } from './security/static-policy.js';
import { calculateSubjectAverage, calculateGeneralAverage, parseGradeValue, isValidCoefficient } from './school-calculations.js';
import { adminTimetableApi, adminTimetableUpload, teacherTimetableApi } from './timetable-api.js';

let mysqlInstance = null;
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
  if (!mysqlInstance) mysqlInstance = mysql;
  if (!pool) {
    const ssl = await getDbSslConfig();
    pool = mysqlInstance.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 5),
      queueLimit: 0,
      charset: 'utf8mb4',
      timezone: 'Z',
      ...(ssl ? { ssl } : {})
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
    dbInitPromise.catch(() => { dbInitPromise = null; });
  }
  await dbInitPromise;
  return pool;
}

const DB_UNAVAILABLE_CODES = new Set([
  'ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET', 'EAI_AGAIN', 'EHOSTUNREACH',
  'PROTOCOL_CONNECTION_LOST', 'ER_ACCESS_DENIED_ERROR', 'ER_DBACCESS_DENIED_ERROR',
  'ER_BAD_DB_ERROR', 'ER_NOT_SUPPORTED_AUTH_MODE', 'ER_NO_SUCH_TABLE'
]);

function isDbUnavailable(error) {
  return error?.message === 'mysql_not_configured' || DB_UNAVAILABLE_CODES.has(error?.code);
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

async function serveStatic(res, pathname, method = 'GET') {
  let decoded;
  try { decoded = decodeURIComponent(pathname); } catch { return json(res, 400, { error: 'url_invalide' }); }
  if (!isPublicStaticPath(decoded)) return json(res, 404, { error: 'fichier_introuvable' });
  const relative = normalize(decoded).replace(/^([/\\])+/, '');
  let filePath = resolve(ROOT, relative || 'index.html');
  if (filePath !== ROOT && !filePath.startsWith(ROOT + sep)) return json(res, 403, { error: 'acces_refuse' });
  try {
    let info = await stat(filePath);
    if (info.isDirectory()) {
      filePath = join(filePath, 'index.html');
      info = await stat(filePath);
    }
    if (!info.isFile()) return json(res, 404, { error: 'fichier_introuvable' });
    const content = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Content-Length': info.size,
      'Cache-Control': extname(filePath) === '.html' ? 'no-cache' : 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff'
    });
    if (method === 'HEAD') return res.end();
    return res.end(content);
  } catch (error) {
    if (error?.code === 'ENOENT' || error?.code === 'ENOTDIR') return json(res, 404, { error: 'fichier_introuvable' });
    console.error('Static file:', error?.message || error);
    return json(res, 500, { error: 'serveur_indisponible' });
  }
}

async function readJsonBody(req, maxBytes = MAX_BODY_BYTES) {
  let total = 0;
  const chunks = [];
  for await (const chunk of req) {
    total += chunk.length;
    if (total > maxBytes) throw new Error('payload_too_large');
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
  await db.execute('DELETE FROM migrations WHERE expires_at < ? OR imported_at IS NOT NULL', [new Date()]);
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

    const firstValue = (value) => String(value || '').split(',')[0].trim();
    const proto = firstValue(req.headers['x-forwarded-proto']) || 'http';
    const host = firstValue(req.headers['x-forwarded-host']) || req.headers.host;
    const publicUrl = String(process.env.PUBLIC_URL || '').trim().replace(/\/+$/, '');
    const origin = /^https?:\/\//i.test(publicUrl) ? publicUrl : `${proto}://${host}`;
    const migrationUrl = `${origin}/migration/${encodeURIComponent(code)}`;
    return json(res, 201, {
      ok: true,
      code,
      url: migrationUrl,
      expiresAt: new Date(Date.now() + MIGRATION_TTL_HOURS * 60 * 60 * 1000).toISOString()
    });
  } catch (error) {
    console.error('Migration create:', error?.code || '', error?.message || error);
    if (isDbUnavailable(error)) {
      return json(res, 503, { error: error.message === 'mysql_not_configured' ? 'mysql_not_configured' : 'mysql_unavailable' });
    }
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
    console.error('Migration import:', error?.code || '', error?.message || error);
    if (isDbUnavailable(error)) {
      return json(res, 503, { error: error.message === 'mysql_not_configured' ? 'mysql_not_configured' : 'mysql_unavailable' });
    }
    return json(res, 500, { error: 'serveur_indisponible' });
  }
}

// --- Administration native Node.js (sans Express ni JWT côté navigateur) ---
const requestedSessionHours = Number(process.env.ADMIN_SESSION_HOURS || 12);
const ADMIN_SESSION_HOURS = Number.isFinite(requestedSessionHours)
  ? Math.min(24, Math.max(1, Math.floor(requestedSessionHours)))
  : 12;
const loginFailures = new Map();
const passwordHash = async (password) => {
  const salt = randomBytes(16).toString('hex');
  const derived = await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${salt}$${Buffer.from(derived).toString('hex')}`;
};
const passwordMatches = async (password, stored) => {
  if (typeof stored !== 'string' || !stored.startsWith('scrypt$')) return false;
  const [, salt, hex] = stored.split('$');
  if (!salt || !/^[a-f0-9]{128}$/i.test(hex || '')) return false;
  const actual = Buffer.from(await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }));
  const expected = Buffer.from(hex, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
};
function cookieValue(req, name) {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const index = part.indexOf('=');
    if (index > -1 && part.slice(0, index).trim() === name) { try { return decodeURIComponent(part.slice(index + 1).trim()); } catch { return ''; } }
  }
  return '';
}
function setAdminCookie(res, token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `admin_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${ADMIN_SESSION_HOURS * 3600}${secure}`);
}
function clearAdminCookie(res) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `admin_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`);
}
function setTeacherCookie(res, token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `teacher_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${ADMIN_SESSION_HOURS * 3600}${secure}`);
}
function clearTeacherCookie(res) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `teacher_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`);
}
async function audit(db, adminId, action, resource, req, details={}) {
  await db.execute('INSERT INTO audit_logs (admin_user_id, action, resource, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)',
    [adminId, action, resource, JSON.stringify(details), String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').slice(0,45), String(req.headers['user-agent'] || '').slice(0,500)]);
}
async function auditTeacher(db, teacherId, action, resource, req, details={}) {
  await db.execute('INSERT INTO teacher_activity_logs (teacher_id,action,resource,details,ip_address,user_agent) VALUES (?,?,?,?,?,?)',
    [teacherId,action,resource,JSON.stringify(details),String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').slice(0,45),String(req.headers['user-agent'] || '').slice(0,500)]);
}
async function adminContext(req, db, allowPasswordChange=false) {
  const token = cookieValue(req, 'admin_session');
  if (!token) return { error: 'non_authentifie' };
  const tokenHash = hashCode(token);
  const [rows] = await db.execute(`SELECT s.admin_user_id, u.email, u.full_name, u.role_id, u.must_change_password, r.name AS role_name
    FROM admin_sessions s JOIN admin_users u ON u.id=s.admin_user_id JOIN roles r ON r.id=u.role_id
    WHERE s.token_hash=? AND s.expires_at > NOW() AND u.is_active=TRUE LIMIT 1`, [tokenHash]);
  if (!rows.length) return { error: 'session_invalide' };
  const user = rows[0];
  if (user.must_change_password && !allowPasswordChange) return { error: 'changement_mot_de_passe_requis', user };
  const [perms] = await db.execute('SELECT p.name FROM role_permissions rp JOIN permissions p ON p.id=rp.permission_id WHERE rp.role_id=?', [user.role_id]);
  return { user: { id:user.admin_user_id, email:user.email, full_name:user.full_name, role_id:user.role_id, role_name:user.role_name, must_change_password:Boolean(user.must_change_password), permissions:perms.map(x=>x.name) }, tokenHash };
}
async function teacherContext(req, db, allowPasswordChange=false) {
  const token = cookieValue(req, 'teacher_session');
  if (!token) return { error: 'non_authentifie' };
  const [rows] = await db.execute(`SELECT s.teacher_id, t.email, t.full_name, t.must_change_password
    FROM teacher_sessions s JOIN teachers t ON t.id=s.teacher_id
    WHERE s.token_hash=? AND s.expires_at > NOW() AND t.is_active=TRUE LIMIT 1`, [hashCode(token)]);
  if (!rows.length) return { error: 'session_invalide' };
  const teacher = rows[0];
  if (teacher.must_change_password && !allowPasswordChange) return { error: 'changement_mot_de_passe_requis', teacher: { id: teacher.teacher_id, email: teacher.email, full_name: teacher.full_name, must_change_password: true } };
  return { teacher: { id: teacher.teacher_id, email: teacher.email, full_name: teacher.full_name, must_change_password: Boolean(teacher.must_change_password) }, tokenHash: hashCode(token) };
}

const teacherLoginFailures = new Map();
async function teacherApi(req, res, url) {
  if (['POST','PUT','PATCH','DELETE'].includes(req.method) && rejectCrossSiteRequest(req)) return json(res, 403, { error: 'origine_refusee' });
  const db = await getDb();
  if (req.method === 'POST' && url.pathname === '/api/teacher/login') {
    const body = await readJsonBody(req);
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!email || email.length > 150 || password.length > 128) return json(res, 401, { error: 'identifiants_invalides', message: 'Adresse ou mot de passe incorrect.' });
    if (teacherLoginFailures.size > 5000) {
      for (const [failureKey, failure] of teacherLoginFailures) {
        if (!failure.blockedUntil || failure.blockedUntil <= Date.now()) teacherLoginFailures.delete(failureKey);
        if (teacherLoginFailures.size <= 4000) break;
      }
    }
    const key = `${req.socket.remoteAddress || 'unknown'}:${email}`;
    const attempt = teacherLoginFailures.get(key);
    if (attempt?.blockedUntil > Date.now()) return json(res, 429, { error: 'trop_de_tentatives', message: 'Réessayez dans 15 minutes.' });
    const [rows] = await db.execute('SELECT id,email,full_name,password_hash,must_change_password FROM teachers WHERE LOWER(email)=? AND is_active=TRUE LIMIT 1', [email]);
    const teacher = rows[0];
    const valid = Boolean(teacher && await passwordMatches(password, teacher.password_hash));
    if (!valid) {
      const next = attempt && attempt.blockedUntil <= Date.now() ? { count: 0 } : (attempt || { count: 0 });
      next.count += 1;
      if (next.count >= 5) next.blockedUntil = Date.now() + 15 * 60 * 1000;
      teacherLoginFailures.set(key, next);
      return json(res, 401, { error: 'identifiants_invalides', message: 'Adresse ou mot de passe incorrect.' });
    }
    teacherLoginFailures.delete(key);
    await db.execute('DELETE FROM teacher_sessions WHERE expires_at <= NOW()');
    const token = randomBytes(32).toString('base64url');
    await db.execute('INSERT INTO teacher_sessions (teacher_id, token_hash, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? HOUR))', [teacher.id, hashCode(token), ADMIN_SESSION_HOURS]);
    await db.execute('UPDATE teachers SET last_login=NOW() WHERE id=?', [teacher.id]);
    await auditTeacher(db,teacher.id,'teacher_login','session',req,{});
    setTeacherCookie(res, token);
    return json(res, 200, { ok: true, must_change_password: Boolean(teacher.must_change_password), user: { id: teacher.id, email: teacher.email, full_name: teacher.full_name } });
  }
  if (req.method === 'POST' && url.pathname === '/api/teacher/logout') {
    const token = cookieValue(req, 'teacher_session');
    if (token) await db.execute('DELETE FROM teacher_sessions WHERE token_hash=?', [hashCode(token)]);
    clearTeacherCookie(res);
    return json(res, 200, { ok: true });
  }
  const allowChange = req.method === 'POST' && url.pathname === '/api/teacher/change-password';
  const context = await teacherContext(req, db, allowChange);
  if (context.error) return json(res, context.error === 'changement_mot_de_passe_requis' ? 403 : 401, { error: context.error, user: context.teacher });
  const teacher = context.teacher;
  if (req.method === 'GET' && url.pathname === '/api/teacher/me') return json(res, 200, { ok: true, user: teacher });
  const timetableResponse = await teacherTimetableApi(req, res, url, db, teacher, json, (request, maxBytes) => readJsonBody(request, maxBytes));
  if (timetableResponse !== null) return timetableResponse;
  if (allowChange) {
    const body = await readJsonBody(req);
    const oldPassword = String(body.oldPassword || '');
    const newPassword = String(body.newPassword || '');
    if (newPassword.length < 12 || newPassword.length > 128) return json(res, 400, { error: 'mot_de_passe_faible', message: 'Le nouveau mot de passe doit contenir au moins 12 caractères.' });
    const [rows] = await db.execute('SELECT password_hash FROM teachers WHERE id=?', [teacher.id]);
    if (!rows.length || !(await passwordMatches(oldPassword, rows[0].password_hash))) return json(res, 400, { error: 'ancien_mot_de_passe_invalide' });
    const hashed = await passwordHash(newPassword);
    await db.execute('UPDATE teachers SET password_hash=?, must_change_password=FALSE WHERE id=?', [hashed, teacher.id]);
    await db.execute('DELETE FROM teacher_sessions WHERE teacher_id=?', [teacher.id]);
    const token = randomBytes(32).toString('base64url');
    await db.execute('INSERT INTO teacher_sessions (teacher_id,token_hash,expires_at) VALUES (?,?,DATE_ADD(NOW(), INTERVAL ? HOUR))', [teacher.id, hashCode(token), ADMIN_SESSION_HOURS]);
    await auditTeacher(db,teacher.id,'password_changed','teacher',req,{});
    setTeacherCookie(res, token);
    return json(res, 200, { ok: true, message: 'Mot de passe modifié.' });
  }
  if (req.method === 'GET' && url.pathname === '/api/teacher/workspace') {
    const [classes] = await db.execute(`SELECT c.id,c.name,c.school_year_id FROM teacher_class_access a
      JOIN classes c ON c.id=a.class_id JOIN school_years y ON y.id=c.school_year_id
      WHERE a.teacher_id=? AND a.is_active=TRUE AND c.is_active=TRUE AND y.is_current=TRUE AND y.is_active=TRUE
      ORDER BY c.name`, [teacher.id]);
    const store = {};
    for (const classRow of classes) {
      const className = classRow.name;
      store[className] = { eleves: [], semestres: { Semestre1: {}, Semestre2: {} } };
      const [students] = await db.execute(`SELECT st.matricule,st.external_id,st.first_name,st.last_name,st.gender
        FROM enrollments e JOIN students st ON st.id=e.student_id
        WHERE e.class_id=? AND e.school_year_id=? AND e.status='ACTIVE' AND st.is_active=TRUE
        ORDER BY st.last_name,st.first_name`, [classRow.id,classRow.school_year_id]);
      const clientId = (student) => {
        const parts = String(student.external_id || '').split(':');
        return parts.length === 3 && parts[0] === 'teacher' && parts[1] === String(teacher.id) ? parts[2] : student.matricule;
      };
      store[className].eleves = students.map((student) => ({
        id: clientId(student), nom: student.last_name, prenom: student.first_name,
        genre: student.gender === 'M' ? 'garçon' : student.gender === 'F' ? 'fille' : ''
      }));
      const [terms] = await db.execute('SELECT id,name FROM terms WHERE school_year_id=?', [classRow.school_year_id]);
      const termIds = Object.fromEntries(terms.map((term) => [term.name,term.id]));
      const [assignments] = await db.execute(`SELECT cs.id,cs.term_id,t.name AS term_name,cs.coefficient,cs.has_composition,s.name AS subject_name
        FROM class_subjects cs JOIN subjects s ON s.id=cs.subject_id JOIN terms t ON t.id=cs.term_id
        WHERE cs.class_id=? AND cs.teacher_id=? AND cs.is_active=TRUE ORDER BY t.name,s.name`, [classRow.id,teacher.id]);
      for (const assignment of assignments) {
        const termName = assignment.term_name;
        const [grades] = await db.execute(`SELECT st.external_id,st.matricule,g.devoir1,g.devoir2,g.composition
          FROM student_grades g JOIN enrollments e ON e.id=g.enrollment_id JOIN students st ON st.id=e.student_id
          WHERE g.class_subject_id=? AND g.term_id=? AND e.class_id=? AND e.status='ACTIVE'`, [assignment.id,assignment.term_id,classRow.id]);
        const notes = {};
        for (const grade of grades) {
          const id = clientId(grade);
          notes[id] = {
            d1: grade.devoir1 === null ? '' : String(grade.devoir1),
            d2: grade.devoir2 === null ? '' : String(grade.devoir2),
            compo: grade.composition === null ? '' : String(grade.composition)
          };
        }
        store[className].semestres[termName][assignment.subject_name] = {
          coefficient: Number(assignment.coefficient), composition: Boolean(assignment.has_composition), notes
        };
      }
    }
    return json(res,200,{ok:true,store});
  }
  if (req.method === 'PUT' && url.pathname === '/api/teacher/workspace') {
    const body = await readJsonBody(req);
    const workspace = body.store;
    if (!workspace || typeof workspace !== 'object' || Array.isArray(workspace) || Object.keys(workspace).length > 100) return json(res,400,{error:'espace_invalide'});
    const [yearRows] = await db.execute('SELECT id FROM school_years WHERE is_current=TRUE AND is_active=TRUE LIMIT 1');
    if (!yearRows.length) return json(res,409,{error:'annee_scolaire_non_configuree',message:'Un administrateur doit d’abord créer et activer l’année scolaire en cours.'});
    const yearId = yearRows[0].id;
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      for (const [classNameRaw,classData] of Object.entries(workspace)) {
        const className = String(classNameRaw).trim();
        if (!className || className.length > 80 || !classData || typeof classData !== 'object') throw new Error('classe_invalide');
        const [classRows] = await connection.execute(`SELECT c.id FROM classes c
          JOIN teacher_class_access a ON a.class_id=c.id AND a.teacher_id=? AND a.is_active=TRUE
          WHERE c.school_year_id=? AND c.name=? AND c.is_active=TRUE LIMIT 1`,[teacher.id,yearId,className]);
        if (!classRows.length) throw new Error('classe_non_autorisee');
        const classId = classRows[0].id;
        const students = Array.isArray(classData.eleves) ? classData.eleves.slice(0,1000) : [];
        const studentMap = new Map();
        for (const student of students) {
          const clientId = String(student?.id || '').trim();
          const firstName = String(student?.prenom || '').trim();
          const lastName = String(student?.nom || '').trim();
          if (!clientId || clientId.length > 80 || (!firstName && !lastName) || firstName.length > 80 || lastName.length > 80) continue;
          const externalId = `teacher:${teacher.id}:${clientId}`;
          const gender = student.genre === 'garçon' ? 'M' : student.genre === 'fille' ? 'F' : 'UNSPECIFIED';
          let [existing] = await connection.execute('SELECT id FROM students WHERE external_id=? OR matricule=? LIMIT 1',[externalId,clientId]);
          let studentId;
          if (existing.length) {
            studentId = existing[0].id;
            await connection.execute('UPDATE students SET first_name=?,last_name=?,gender=?,is_active=TRUE WHERE id=?',[firstName,lastName,gender,studentId]);
          } else {
            const matricule = `T${teacher.id}-${hashCode(clientId).slice(0,16)}`;
            const [created] = await connection.execute('INSERT INTO students (matricule,external_id,first_name,last_name,gender) VALUES (?,?,?,?,?)',[matricule,externalId,firstName,lastName,gender]);
            studentId = created.insertId;
          }
          await connection.execute(`INSERT INTO enrollments (student_id,class_id,school_year_id,status) VALUES (?,?,?,'ACTIVE')
            ON DUPLICATE KEY UPDATE class_id=VALUES(class_id),status='ACTIVE'`,[studentId,classId,yearId]);
          const [enrollmentRows] = await connection.execute('SELECT id FROM enrollments WHERE student_id=? AND school_year_id=? LIMIT 1',[studentId,yearId]);
          studentMap.set(clientId,{studentId,enrollmentId:enrollmentRows[0].id});
        }
        const keptEnrollmentIds = [...studentMap.values()].map((item) => item.enrollmentId);
        if (keptEnrollmentIds.length) {
          await connection.execute(`UPDATE enrollments SET status='WITHDRAWN' WHERE class_id=? AND school_year_id=? AND status='ACTIVE' AND id NOT IN (${keptEnrollmentIds.map(() => '?').join(',')})`,[classId,yearId,...keptEnrollmentIds]);
        } else {
          await connection.execute(`UPDATE enrollments SET status='WITHDRAWN' WHERE class_id=? AND school_year_id=? AND status='ACTIVE'`,[classId,yearId]);
        }
        const semesters = classData.semestres && typeof classData.semestres === 'object' ? classData.semestres : {};
        const [termRows] = await connection.execute('SELECT id,name FROM terms WHERE school_year_id=?',[yearId]);
        const termMap = Object.fromEntries(termRows.map((term) => [term.name,term.id]));
        for (const termName of ['Semestre1','Semestre2']) {
          const termId = termMap[termName];
          if (!termId) throw new Error('semestres_non_configures');
          const subjects = semesters[termName] && typeof semesters[termName] === 'object' ? semesters[termName] : {};
          for (const [subjectNameRaw,record] of Object.entries(subjects)) {
            const subjectName = String(subjectNameRaw).trim();
            if (!subjectName || subjectName.length > 100 || !record || typeof record !== 'object') continue;
            let [subjectRows] = await connection.execute('SELECT id FROM subjects WHERE name=? LIMIT 1',[subjectName]);
            let subjectId;
            if (subjectRows.length) subjectId = subjectRows[0].id;
            else { const [created] = await connection.execute('INSERT INTO subjects (name) VALUES (?)',[subjectName]); subjectId = created.insertId; }
            const coefficient = Number(record.coefficient ?? 1);
            if (!isValidCoefficient(coefficient)) throw new Error('coefficient_invalide');
            const [existingAssignment] = await connection.execute('SELECT id,teacher_id FROM class_subjects WHERE class_id=? AND subject_id=? AND term_id=? LIMIT 1',[classId,subjectId,termId]);
            if (existingAssignment.length && existingAssignment[0].teacher_id && Number(existingAssignment[0].teacher_id) !== Number(teacher.id)) throw new Error('matiere_deja_attribuee');
            await connection.execute(`INSERT INTO class_subjects (class_id,subject_id,term_id,teacher_id,coefficient,has_composition,is_active) VALUES (?,?,?,?,?,?,TRUE)
              ON DUPLICATE KEY UPDATE teacher_id=VALUES(teacher_id),coefficient=VALUES(coefficient),has_composition=VALUES(has_composition),is_active=TRUE`,
              [classId,subjectId,termId,teacher.id,coefficient,Boolean(record.composition)]);
            const [assignmentRows] = await connection.execute('SELECT id FROM class_subjects WHERE class_id=? AND subject_id=? AND term_id=? LIMIT 1',[classId,subjectId,termId]);
            const assignmentId = assignmentRows[0].id;
            const notes = record.notes && typeof record.notes === 'object' ? record.notes : {};
            for (const [clientId,note] of Object.entries(notes)) {
              const mapped = studentMap.get(clientId);
              if (!mapped) continue;
              const parseNote = (raw) => {
                try { return parseGradeValue(raw); }
                catch { throw new Error('note_invalide'); }
              };
              const d1 = parseNote(note?.d1); const d2 = parseNote(note?.d2); const compo = parseNote(note?.compo);
              await connection.execute(`INSERT INTO student_grades (enrollment_id,class_subject_id,term_id,devoir1,devoir2,composition,updated_by_teacher_id)
                VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE devoir1=VALUES(devoir1),devoir2=VALUES(devoir2),composition=VALUES(composition),updated_by_teacher_id=VALUES(updated_by_teacher_id)`,
                [mapped.enrollmentId,assignmentId,termId,d1,d2,compo,teacher.id]);
            }
          }
        }
      }
      await connection.commit();
      await auditTeacher(db,teacher.id,'workspace_synced','school_data',req,{class_count:Object.keys(workspace).length});
      return json(res,200,{ok:true,synced_at:new Date().toISOString()});
    } catch (error) {
      try { await connection.rollback(); } catch {}
      if (['classe_invalide','semestres_non_configures','coefficient_invalide','note_invalide','matiere_deja_attribuee'].includes(error.message)) return json(res,400,{error:error.message});
      if (error?.code === 'ER_DUP_ENTRY') return json(res,409,{error:'conflit_donnees'});
      throw error;
    } finally { connection.release(); }
  }
  if (req.method === 'GET' && url.pathname === '/api/teacher/classes') {
    const [rows] = await db.execute(`SELECT cs.id AS class_subject_id, cs.class_id, c.name AS class_name, c.school_year_id, y.label AS school_year,
      cs.subject_id, s.name AS subject_name, t.id AS term_id, t.name AS term_name, cs.coefficient, cs.has_composition
      FROM class_subjects cs JOIN classes c ON c.id=cs.class_id JOIN school_years y ON y.id=c.school_year_id
      JOIN subjects s ON s.id=cs.subject_id JOIN terms t ON t.id=cs.term_id WHERE cs.teacher_id=? AND cs.is_active=TRUE AND c.is_active=TRUE AND y.is_active=TRUE
      ORDER BY y.is_current DESC, c.name, s.name`, [teacher.id]);
    return json(res, 200, { classes: rows });
  }
  const classStudentsMatch = url.pathname.match(/^\/api\/teacher\/classes\/(\d+)\/students$/);
  if (req.method === 'GET' && classStudentsMatch) {
    const classId = Number(classStudentsMatch[1]);
    const classSubjectId = Number(url.searchParams.get('class_subject_id'));
    const termId = Number(url.searchParams.get('term_id'));
    if (!Number.isSafeInteger(classId) || !Number.isSafeInteger(classSubjectId) || !Number.isSafeInteger(termId) || classId < 1 || classSubjectId < 1 || termId < 1) return json(res, 400, { error: 'parametres_invalides' });
    const [assignment] = await db.execute(`SELECT cs.id FROM class_subjects cs JOIN classes c ON c.id=cs.class_id JOIN terms t ON t.id=cs.term_id AND t.school_year_id=c.school_year_id
      WHERE cs.id=? AND cs.class_id=? AND cs.teacher_id=? AND cs.is_active=TRUE AND t.id=? AND t.is_closed=FALSE LIMIT 1`, [classSubjectId, classId, teacher.id, termId]);
    if (!assignment.length) return json(res, 403, { error: 'affectation_introuvable' });
    const [rows] = await db.execute(`SELECT e.id AS enrollment_id, st.id AS student_id, st.matricule, st.first_name, st.last_name,
      g.devoir1, g.devoir2, g.composition, g.updated_at
      FROM enrollments e JOIN students st ON st.id=e.student_id
      LEFT JOIN student_grades g ON g.enrollment_id=e.id AND g.class_subject_id=? AND g.term_id=?
      WHERE e.class_id=? AND e.status='ACTIVE' AND st.is_active=TRUE ORDER BY st.last_name, st.first_name`, [classSubjectId, termId, classId]);
    return json(res, 200, { students: rows });
  }
  if (req.method === 'PUT' && url.pathname === '/api/teacher/grades') {
    const body = await readJsonBody(req);
    const enrollmentId = Number(body.enrollment_id);
    const classSubjectId = Number(body.class_subject_id);
    const termId = Number(body.term_id);
    if (![enrollmentId, classSubjectId, termId].every((value) => Number.isSafeInteger(value) && value > 0)) return json(res, 400, { error: 'parametres_invalides' });
    const noteFields = ['devoir1', 'devoir2', 'composition'];
    const notes = {};
    for (const field of noteFields) {
      const raw = body[field];
      if (raw === null || raw === undefined || raw === '') notes[field] = null;
      else {
        try { notes[field] = parseGradeValue(raw); }
        catch { return json(res, 400, { error: 'note_invalide', field }); }
      }
    }
    const [allowed] = await db.execute(`SELECT e.id FROM class_subjects cs JOIN classes c ON c.id=cs.class_id
      JOIN enrollments e ON e.class_id=c.id JOIN terms t ON t.id=cs.term_id AND t.school_year_id=c.school_year_id
      WHERE cs.id=? AND cs.teacher_id=? AND cs.is_active=TRUE AND e.id=? AND e.status='ACTIVE' AND t.id=? AND t.is_closed=FALSE LIMIT 1`,
      [classSubjectId, teacher.id, enrollmentId, termId]);
    if (!allowed.length) return json(res, 403, { error: 'saisie_non_autorisee' });
    await db.execute(`INSERT INTO student_grades (enrollment_id,class_subject_id,term_id,devoir1,devoir2,composition,updated_by_teacher_id)
      VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE devoir1=VALUES(devoir1),devoir2=VALUES(devoir2),composition=VALUES(composition),updated_by_teacher_id=VALUES(updated_by_teacher_id)`,
      [enrollmentId, classSubjectId, termId, notes.devoir1, notes.devoir2, notes.composition, teacher.id]);
    await auditTeacher(db,teacher.id,'grade_updated','student_grade',req,{enrollment_id:enrollmentId,class_subject_id:classSubjectId,term_id:termId});
    return json(res, 200, { ok: true });
  }
  return json(res, 404, { error: 'route_invalide' });
}

function rejectCrossSiteRequest(req) {
  const fetchSite = String(req.headers['sec-fetch-site'] || '').toLowerCase();
  if (fetchSite === 'cross-site') return true;
  const origin = req.headers.origin;
  if (!origin) return false; // outils non navigateur; les cookies restent SameSite=Strict
  try {
    const originUrl = new URL(origin);
    const requestHost = String(req.headers.host || '').toLowerCase();
    return originUrl.host.toLowerCase() !== requestHost;
  } catch {
    return true;
  }
}

async function adminApi(req, res, url) {
  if (['POST','PUT','PATCH','DELETE'].includes(req.method) && rejectCrossSiteRequest(req)) {
    return json(res, 403, { error: 'origine_refusee' });
  }
  const db = await getDb();
  if (req.method === 'POST' && url.pathname === '/api/admin/login') {
    const body = await readJsonBody(req);
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!email || email.length > 150 || password.length > 128) {
      return json(res, 401, { error: 'identifiants_invalides', message: 'Adresse ou mot de passe incorrect.' });
    }
    if (loginFailures.size > 5000) {
      for (const [failureKey, failure] of loginFailures) {
        if (!failure.blockedUntil || failure.blockedUntil <= Date.now()) loginFailures.delete(failureKey);
        if (loginFailures.size <= 4000) break;
      }
    }
    const key = `${req.socket.remoteAddress || 'unknown'}:${email}`;
    const attempt = loginFailures.get(key);
    if (attempt && attempt.blockedUntil > Date.now()) return json(res, 429, {error:'trop_de_tentatives', message:'Réessayez dans 15 minutes.'});
    const [users] = await db.execute('SELECT id,email,full_name,password_hash,role_id,is_active,must_change_password FROM admin_users WHERE LOWER(email)=? LIMIT 1', [email]);
    const user = users[0];
    const valid = Boolean(user && user.is_active && await passwordMatches(password, user.password_hash));
    if (!valid) {
      const next = attempt && attempt.blockedUntil <= Date.now() ? {count:0} : (attempt || {count:0});
      next.count += 1;
      if (next.count >= 5) next.blockedUntil = Date.now() + 15*60*1000;
      loginFailures.set(key, next);
      return json(res, 401, {error:'identifiants_invalides', message:'Adresse ou mot de passe incorrect.'});
    }
    loginFailures.delete(key);
    await db.execute('DELETE FROM admin_sessions WHERE expires_at <= NOW()');
    const token = randomBytes(32).toString('base64url');
    await db.execute('INSERT INTO admin_sessions (admin_user_id, token_hash, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? HOUR))', [user.id, hashCode(token), ADMIN_SESSION_HOURS]);
    await db.execute('UPDATE admin_users SET last_login=NOW() WHERE id=?', [user.id]);
    await audit(db, user.id, 'login', 'admin_session', req);
    setAdminCookie(res, token);
    const [role] = await db.execute('SELECT name FROM roles WHERE id=?', [user.role_id]);
    return json(res, 200, {ok:true, must_change_password:Boolean(user.must_change_password), user:{id:user.id,email:user.email,full_name:user.full_name,role_id:user.role_id,role_name:role[0]?.name || ''}});
  }
  if (req.method === 'POST' && url.pathname === '/api/admin/logout') {
    const token = cookieValue(req, 'admin_session');
    if (token) await db.execute('DELETE FROM admin_sessions WHERE token_hash=?', [hashCode(token)]);
    clearAdminCookie(res);
    return json(res, 200, {ok:true});
  }
  const allowChange = req.method === 'POST' && url.pathname === '/api/admin/change-password';
  const context = await adminContext(req, db, allowChange);
  if (context.error) return json(res, context.error === 'changement_mot_de_passe_requis' ? 403 : 401, {error:context.error, user:context.user ? {id:context.user.admin_user_id,email:context.user.email,full_name:context.user.full_name} : undefined});
  const user = context.user;
  if (req.method === 'GET' && url.pathname === '/api/admin/me') return json(res, 200, {ok:true,user});
  if (allowChange) {
    const body = await readJsonBody(req);
    const oldPassword = String(body.oldPassword || '');
    const newPassword = String(body.newPassword || '');
    if (newPassword.length < 12 || newPassword.length > 128) return json(res, 400, {error:'mot_de_passe_faible',message:'Le nouveau mot de passe doit contenir au moins 12 caractères.'});
    const [rows] = await db.execute('SELECT password_hash FROM admin_users WHERE id=?', [user.id]);
    if (!rows.length || !(await passwordMatches(oldPassword, rows[0].password_hash))) return json(res, 400, {error:'ancien_mot_de_passe_invalide'});
    const hashed = await passwordHash(newPassword);
    await db.execute('UPDATE admin_users SET password_hash=?, must_change_password=FALSE WHERE id=?', [hashed,user.id]);
    await db.execute('DELETE FROM admin_sessions WHERE admin_user_id=?', [user.id]);
    const newToken = randomBytes(32).toString('base64url');
    await db.execute('INSERT INTO admin_sessions (admin_user_id,token_hash,expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? HOUR))', [user.id,hashCode(newToken),ADMIN_SESSION_HOURS]);
    await audit(db,user.id,'password_changed','admin_user',req);
    setAdminCookie(res,newToken);
    return json(res,200,{ok:true,message:'Mot de passe modifié.'});
  }
  const can = (permission) => user.permissions.includes(permission);
  const timetableUpload = await adminTimetableUpload(req, res, url, db, user, (request, maxBytes) => readJsonBody(request, maxBytes), audit);
  if (timetableUpload !== null) {
    if (timetableUpload.handled && timetableUpload.response === 'forbidden') return json(res, 403, { error: 'droits_insuffisants' });
    if (timetableUpload.handled && timetableUpload.response === 'invalid_document') return json(res, 400, { error: 'document_invalide' });
    if (timetableUpload.handled && timetableUpload.response === 'invalid_document_type') return json(res, 400, { error: 'type_document_invalide' });
    if (timetableUpload.handled && timetableUpload.response === 'storage_not_configured') return json(res, 503, { error: 'storage_not_configured' });
    if (timetableUpload.handled && timetableUpload.response === 'ok') return json(res, 201, { ok: true });
    return timetableUpload;
  }
  const timetableResponse = await adminTimetableApi(req, res, url, db, user, json, (request, maxBytes) => readJsonBody(request, maxBytes), audit);
  if (timetableResponse !== null) return timetableResponse;
  const patchMatch = url.pathname.match(/^\/api\/admin\/(classes|students|teachers|subjects)\/(\d+)$/);
  if (req.method === 'PATCH' && patchMatch) {
    const entity=patchMatch[1];const id=Number(patchMatch[2]);
    if(!Number.isSafeInteger(id)||id<1)return json(res,400,{error:'identifiant_invalide'});
    const body=await readJsonBody(req);const active=body.is_active;
    if(active!==undefined&&typeof active!=='boolean')return json(res,400,{error:'donnees_invalides'});
    if(entity==='classes'){
      if(!can('classes.edit'))return json(res,403,{error:'droits_insuffisants'});
      const name=body.name===undefined?null:String(body.name).trim();const level=body.level===undefined?undefined:(String(body.level).trim()||null);
      if(name!==null&&(!name||name.length>80))return json(res,400,{error:'nom_classe_invalide'});
      const [rows]=await db.execute('SELECT id FROM classes WHERE id=? LIMIT 1',[id]);if(!rows.length)return json(res,404,{error:'classe_introuvable'});
      if(name!==null)await db.execute('UPDATE classes SET name=?,level=COALESCE(?,level),is_active=COALESCE(?,is_active) WHERE id=?',[name,level===undefined?null:level,active===undefined?null:active,id]);
      else await db.execute('UPDATE classes SET level=COALESCE(?,level),is_active=COALESCE(?,is_active) WHERE id=?',[level===undefined?null:level,active===undefined?null:active,id]);
      if(active===false){await db.execute('UPDATE class_subjects SET is_active=FALSE WHERE class_id=?',[id]);await db.execute('UPDATE teacher_class_access SET is_active=FALSE WHERE class_id=?',[id]);}
      await audit(db,user.id,'class_updated','class',req,{class_id:id,is_active:active});return json(res,200,{ok:true});
    }
    if(entity==='students'){
      if(!can('students.edit'))return json(res,403,{error:'droits_insuffisants'});
      const [rows]=await db.execute('SELECT id FROM students WHERE id=? LIMIT 1',[id]);if(!rows.length)return json(res,404,{error:'eleve_introuvable'});
      const fields={first_name:body.first_name===undefined?undefined:String(body.first_name).trim(),last_name:body.last_name===undefined?undefined:String(body.last_name).trim(),gender:body.gender,birth_date:body.birth_date,guardian_name:body.guardian_name,guardian_phone:body.guardian_phone};
      if(fields.first_name!==undefined&&(!fields.first_name||fields.first_name.length>80))return json(res,400,{error:'prenom_invalide'});
      if(fields.last_name!==undefined&&(!fields.last_name||fields.last_name.length>80))return json(res,400,{error:'nom_invalide'});
      if(fields.gender!==undefined&&!['M','F','OTHER','UNSPECIFIED'].includes(fields.gender))return json(res,400,{error:'genre_invalide'});
      await db.execute(`UPDATE students SET first_name=COALESCE(?,first_name),last_name=COALESCE(?,last_name),gender=COALESCE(?,gender),birth_date=COALESCE(?,birth_date),guardian_name=COALESCE(?,guardian_name),guardian_phone=COALESCE(?,guardian_phone),is_active=COALESCE(?,is_active) WHERE id=?`,[fields.first_name??null,fields.last_name??null,fields.gender??null,fields.birth_date??null,fields.guardian_name??null,fields.guardian_phone??null,active??null,id]);
      if(active===false)await db.execute(`UPDATE enrollments SET status='WITHDRAWN' WHERE student_id=? AND status='ACTIVE'`,[id]);
      if(active===true)await db.execute(`UPDATE enrollments e JOIN school_years y ON y.id=e.school_year_id SET e.status='ACTIVE' WHERE e.student_id=? AND e.status='WITHDRAWN' AND y.is_current=TRUE`,[id]);
      await audit(db,user.id,'student_updated','student',req,{student_id:id,is_active:active});return json(res,200,{ok:true});
    }
    if(entity==='teachers'){
      if(!can('teachers.edit'))return json(res,403,{error:'droits_insuffisants'});
      const [rows]=await db.execute('SELECT id FROM teachers WHERE id=? LIMIT 1',[id]);if(!rows.length)return json(res,404,{error:'professeur_introuvable'});
      const fullName=body.full_name===undefined?null:String(body.full_name).trim();const phone=body.phone===undefined?null:(String(body.phone).trim()||null);
      if(fullName!==null&&(!fullName||fullName.length>140))return json(res,400,{error:'nom_professeur_invalide'});
      await db.execute('UPDATE teachers SET full_name=COALESCE(?,full_name),phone=COALESCE(?,phone),is_active=COALESCE(?,is_active) WHERE id=?',[fullName,phone,active??null,id]);
      if(active===false)await db.execute('DELETE FROM teacher_sessions WHERE teacher_id=?',[id]);
      await audit(db,user.id,'teacher_updated','teacher',req,{teacher_id:id,is_active:active});return json(res,200,{ok:true});
    }
    if(entity==='subjects'){
      if(!can('subjects.edit'))return json(res,403,{error:'droits_insuffisants'});
      const [rows]=await db.execute('SELECT id FROM subjects WHERE id=? LIMIT 1',[id]);if(!rows.length)return json(res,404,{error:'matiere_introuvable'});
      const name=body.name===undefined?null:String(body.name).trim();const code=body.code===undefined?null:(String(body.code).trim()||null);
      if(name!==null&&(!name||name.length>100))return json(res,400,{error:'nom_matiere_invalide'});
      if(code!==null&&code.length>30)return json(res,400,{error:'code_matiere_invalide'});
      await db.execute('UPDATE subjects SET name=COALESCE(?,name),code=COALESCE(?,code),is_active=COALESCE(?,is_active) WHERE id=?',[name,code,active??null,id]);
      if(active===false)await db.execute('UPDATE class_subjects SET is_active=FALSE WHERE subject_id=?',[id]);
      await audit(db,user.id,'subject_updated','subject',req,{subject_id:id,is_active:active});return json(res,200,{ok:true});
    }
  }
  if (req.method === 'GET' && url.pathname === '/api/admin/overview') {
    const [years] = await db.execute('SELECT COUNT(*) AS total FROM school_years WHERE is_active=TRUE');
    const [classes] = await db.execute('SELECT COUNT(*) AS total FROM classes WHERE is_active=TRUE');
    const [students] = await db.execute('SELECT COUNT(*) AS total FROM students WHERE is_active=TRUE');
    const [teachers] = await db.execute('SELECT COUNT(*) AS total FROM teachers WHERE is_active=TRUE');
    return json(res, 200, { stats: { school_years: years[0].total, classes: classes[0].total, students: students[0].total, teachers: teachers[0].total } });
  }
  if (req.method === 'GET' && url.pathname === '/api/admin/school-years') {
    if (!can('classes.view')) return json(res, 403, { error: 'droits_insuffisants' });
    const [rows] = await db.execute('SELECT id,label,starts_on,ends_on,is_current,is_active FROM school_years ORDER BY label DESC');
    return json(res, 200, { school_years: rows });
  }
  if (req.method === 'POST' && url.pathname === '/api/admin/school-years') {
    if (!can('settings.edit')) return json(res, 403, { error: 'droits_insuffisants' });
    const body = await readJsonBody(req);
    const label = String(body.label || '').trim();
    if (!/^\d{4}[-/]\d{4}$/.test(label)) return json(res, 400, { error: 'annee_scolaire_invalide', message: 'Format attendu : 2026-2027.' });
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      if (body.is_current) await connection.execute('UPDATE school_years SET is_current=FALSE');
      const [result] = await connection.execute('INSERT INTO school_years (label,starts_on,ends_on,is_current) VALUES (?,?,?,?)', [label, body.starts_on || null, body.ends_on || null, Boolean(body.is_current)]);
      await connection.execute("INSERT INTO terms (school_year_id,name) VALUES (?,'Semestre1'),(?,'Semestre2')", [result.insertId, result.insertId]);
      await connection.commit();
      await audit(db, user.id, 'school_year_created', 'school_year', req, { school_year_id: result.insertId, label });
      return json(res, 201, { ok: true, id: result.insertId });
    } catch (error) { await connection.rollback(); if (error?.code === 'ER_DUP_ENTRY') return json(res, 409, { error: 'annee_deja_existante' }); throw error; }
    finally { connection.release(); }
  }
  if (req.method === 'GET' && url.pathname === '/api/admin/classes') {
    if (!can('classes.view')) return json(res, 403, { error: 'droits_insuffisants' });
    const [rows] = await db.execute(`SELECT c.id,c.name,c.level,c.is_active,c.school_year_id,y.label AS school_year,
      COUNT(DISTINCT e.id) AS student_count FROM classes c JOIN school_years y ON y.id=c.school_year_id
      LEFT JOIN enrollments e ON e.class_id=c.id AND e.status='ACTIVE' GROUP BY c.id ORDER BY y.label DESC,c.name`);
    return json(res, 200, { classes: rows });
  }
  if (req.method === 'POST' && url.pathname === '/api/admin/classes') {
    if (!can('classes.create')) return json(res, 403, { error: 'droits_insuffisants' });
    const body = await readJsonBody(req); const name = String(body.name || '').trim(); const level = String(body.level || '').trim() || null; const yearId = Number(body.school_year_id);
    if (!name || name.length > 80 || !Number.isSafeInteger(yearId) || yearId < 1) return json(res, 400, { error: 'donnees_invalides' });
    try { const [result] = await db.execute('INSERT INTO classes (school_year_id,name,level) VALUES (?,?,?)', [yearId,name,level]); await audit(db,user.id,'class_created','class',req,{class_id:result.insertId,name}); return json(res,201,{ok:true,id:result.insertId}); }
    catch (error) { if (error?.code === 'ER_DUP_ENTRY') return json(res,409,{error:'classe_deja_existante'}); if (error?.code === 'ER_NO_REFERENCED_ROW_2') return json(res,400,{error:'annee_scolaire_introuvable'}); throw error; }
  }
  if (req.method === 'GET' && url.pathname === '/api/admin/students') {
    if (!can('students.view')) return json(res, 403, { error: 'droits_insuffisants' });
    const [rows] = await db.execute(`SELECT st.id,st.matricule,st.first_name,st.last_name,st.gender,st.birth_date,st.is_active,
      c.id AS class_id,c.name AS class_name,y.label AS school_year FROM students st
      LEFT JOIN enrollments e ON e.student_id=st.id AND e.status='ACTIVE' LEFT JOIN classes c ON c.id=e.class_id
      LEFT JOIN school_years y ON y.id=e.school_year_id ORDER BY st.last_name,st.first_name LIMIT 1000`);
    return json(res,200,{students:rows});
  }
  if (req.method === 'POST' && url.pathname === '/api/admin/students') {
    if (!can('students.create')) return json(res,403,{error:'droits_insuffisants'});
    const body=await readJsonBody(req); const matricule=String(body.matricule||'').trim(); const firstName=String(body.first_name||'').trim(); const lastName=String(body.last_name||'').trim(); const classId=Number(body.class_id);
    if (!matricule || matricule.length>40 || !firstName || firstName.length>80 || !lastName || lastName.length>80 || !Number.isSafeInteger(classId) || classId<1) return json(res,400,{error:'donnees_invalides'});
    const connection=await db.getConnection();
    try { await connection.beginTransaction(); const [classes]=await connection.execute('SELECT id,school_year_id FROM classes WHERE id=? AND is_active=TRUE LIMIT 1',[classId]); if(!classes.length){await connection.rollback();return json(res,400,{error:'classe_introuvable'});} const [result]=await connection.execute('INSERT INTO students (matricule,first_name,last_name,gender,birth_date,guardian_name,guardian_phone) VALUES (?,?,?,?,?,?,?)',[matricule,firstName,lastName,['M','F','OTHER','UNSPECIFIED'].includes(body.gender)?body.gender:'UNSPECIFIED',body.birth_date||null,String(body.guardian_name||'').trim()||null,String(body.guardian_phone||'').trim()||null]); await connection.execute('INSERT INTO enrollments (student_id,class_id,school_year_id) VALUES (?,?,?)',[result.insertId,classId,classes[0].school_year_id]); await connection.commit(); await audit(db,user.id,'student_created','student',req,{student_id:result.insertId,matricule,class_id:classId}); return json(res,201,{ok:true,id:result.insertId}); }
    catch(error){await connection.rollback();if(error?.code==='ER_DUP_ENTRY')return json(res,409,{error:'matricule_deja_utilise'});throw error;} finally{connection.release();}
  }
  if (req.method === 'GET' && url.pathname === '/api/admin/subjects') {
    if (!can('subjects.view')) return json(res,403,{error:'droits_insuffisants'});
    const [rows]=await db.execute('SELECT id,code,name,is_active FROM subjects ORDER BY name'); return json(res,200,{subjects:rows});
  }
  if (req.method === 'POST' && url.pathname === '/api/admin/subjects') {
    if (!can('subjects.create')) return json(res,403,{error:'droits_insuffisants'});
    const body=await readJsonBody(req); const name=String(body.name||'').trim(); const code=String(body.code||'').trim()||null;
    if(!name||name.length>100||(code&&code.length>30))return json(res,400,{error:'donnees_invalides'});
    try{const [result]=await db.execute('INSERT INTO subjects (code,name) VALUES (?,?)',[code,name]);await audit(db,user.id,'subject_created','subject',req,{subject_id:result.insertId,name});return json(res,201,{ok:true,id:result.insertId});}
    catch(error){if(error?.code==='ER_DUP_ENTRY')return json(res,409,{error:'matiere_deja_existante'});throw error;}
  }
  if (req.method === 'GET' && url.pathname === '/api/admin/results') {
    if (!can('reports.view') && !can('grades.view')) return json(res,403,{error:'droits_insuffisants'});
    const classId=Number(url.searchParams.get('class_id'));
    const termId=Number(url.searchParams.get('term_id'));
    if(![classId,termId].every(value=>Number.isSafeInteger(value)&&value>0))return json(res,400,{error:'parametres_invalides'});
    const [valid]=await db.execute('SELECT c.id,c.name,t.name AS term_name FROM classes c JOIN terms t ON t.school_year_id=c.school_year_id WHERE c.id=? AND t.id=? LIMIT 1',[classId,termId]);
    if(!valid.length)return json(res,404,{error:'classe_ou_semestre_introuvable'});
    const [students]=await db.execute(`SELECT e.id AS enrollment_id,st.id AS student_id,st.matricule,st.first_name,st.last_name
      FROM enrollments e JOIN students st ON st.id=e.student_id WHERE e.class_id=? AND e.status='ACTIVE' AND st.is_active=TRUE ORDER BY st.last_name,st.first_name`,[classId]);
    const [assignments]=await db.execute(`SELECT cs.id AS class_subject_id,s.name AS subject_name,cs.coefficient,cs.has_composition
      FROM class_subjects cs JOIN subjects s ON s.id=cs.subject_id WHERE cs.class_id=? AND cs.term_id=? AND cs.is_active=TRUE ORDER BY s.name`,[classId,termId]);
    const [grades]=assignments.length && students.length ? await db.execute(`SELECT g.enrollment_id,g.class_subject_id,g.devoir1,g.devoir2,g.composition
      FROM student_grades g WHERE g.term_id=? AND g.class_subject_id IN (${assignments.map(()=>'?').join(',')}) AND g.enrollment_id IN (${students.map(()=>'?').join(',')})`,[termId,...assignments.map(a=>a.class_subject_id),...students.map(st=>st.enrollment_id)]) : [[]];
    const gradeMap=new Map(grades.map((grade)=>[`${grade.enrollment_id}:${grade.class_subject_id}`,grade]));
    const subjectDefs=assignments.map((a)=>({id:a.class_subject_id,name:a.subject_name,coefficient:Number(a.coefficient),has_composition:Boolean(a.has_composition)}));
    const results=students.map((student)=>{
      let complete=subjectDefs.length>0;
      const subjects=subjectDefs.map((subject)=>{
        const grade=gradeMap.get(`${student.enrollment_id}:${subject.id}`);
        const d1=grade?.devoir1===null||grade?.devoir1===undefined?null:Number(grade.devoir1);
        const d2=grade?.devoir2===null||grade?.devoir2===undefined?null:Number(grade.devoir2);
        const compo=grade?.composition===null||grade?.composition===undefined?null:Number(grade.composition);
        const average=calculateSubjectAverage({devoir1:d1,devoir2:d2,composition:compo,hasComposition:subject.has_composition});
        if(average===null)complete=false;
        return {...subject,devoir1:d1,devoir2:d2,composition:compo,average};
      });
      return {enrollment_id:student.enrollment_id,matricule:student.matricule,first_name:student.first_name,last_name:student.last_name,subjects,complete,general_average:complete?calculateGeneralAverage(subjects):null};
    });
    return json(res,200,{class:valid[0].name,term:valid[0].term_name,subjects:subjectDefs,results});
  }
  if (req.method === 'GET' && url.pathname === '/api/admin/terms') {
    if (!can('subjects.view')) return json(res,403,{error:'droits_insuffisants'});
    const [rows]=await db.execute('SELECT t.id,t.name,t.school_year_id,y.label AS school_year,t.is_closed FROM terms t JOIN school_years y ON y.id=t.school_year_id ORDER BY y.label DESC,t.name');
    return json(res,200,{terms:rows});
  }
  if (req.method === 'GET' && url.pathname === '/api/admin/class-subjects') {
    if (!can('subjects.view')) return json(res,403,{error:'droits_insuffisants'});
    const [rows]=await db.execute(`SELECT cs.id,cs.class_id,c.name AS class_name,cs.subject_id,s.name AS subject_name,cs.teacher_id,teacher.full_name AS teacher_name,term.name AS term_name,cs.coefficient,cs.has_composition
      FROM class_subjects cs JOIN classes c ON c.id=cs.class_id JOIN subjects s ON s.id=cs.subject_id JOIN terms term ON term.id=cs.term_id LEFT JOIN teachers teacher ON teacher.id=cs.teacher_id ORDER BY c.name,term.name,s.name`);
    return json(res,200,{assignments:rows});
  }
  if (req.method === 'POST' && url.pathname === '/api/admin/class-subjects') {
    if (!can('subjects.edit')) return json(res,403,{error:'droits_insuffisants'});
    const body=await readJsonBody(req);const classId=Number(body.class_id);const subjectId=Number(body.subject_id);const termId=Number(body.term_id);const teacherId=body.teacher_id?Number(body.teacher_id):null;const coefficient=Number(body.coefficient??1);const hasComposition=body.has_composition!==false;
    if(![classId,subjectId,termId].every(v=>Number.isSafeInteger(v)&&v>0)|| (teacherId!==null&&(!Number.isSafeInteger(teacherId)||teacherId<1)) || !isValidCoefficient(coefficient))return json(res,400,{error:'donnees_invalides'});
    const [validAssignment]=await db.execute('SELECT c.id FROM classes c JOIN terms t ON t.school_year_id=c.school_year_id WHERE c.id=? AND t.id=? LIMIT 1',[classId,termId]);
    if(!validAssignment.length)return json(res,400,{error:'classe_ou_semestre_invalide'});
    await db.execute(`INSERT INTO class_subjects (class_id,subject_id,term_id,teacher_id,coefficient,has_composition) VALUES (?,?,?,?,?,?)
      ON DUPLICATE KEY UPDATE teacher_id=VALUES(teacher_id),coefficient=VALUES(coefficient),has_composition=VALUES(has_composition),is_active=TRUE`,[classId,subjectId,termId,teacherId,coefficient,hasComposition]);
    if (teacherId) await db.execute(`INSERT INTO teacher_class_access (teacher_id,class_id,is_active) VALUES (?,?,TRUE) ON DUPLICATE KEY UPDATE is_active=TRUE`,[teacherId,classId]);
    await audit(db,user.id,'class_subject_assigned','class_subject',req,{class_id:classId,subject_id:subjectId,teacher_id:teacherId});return json(res,200,{ok:true});
  }
  if (req.method === 'GET' && url.pathname === '/api/admin/teachers') {
    if (!user.permissions.includes('teachers.view')) return json(res, 403, { error: 'droits_insuffisants' });
    const [rows] = await db.execute('SELECT id,email,full_name,phone,is_active,must_change_password,last_login,created_at FROM teachers ORDER BY full_name');
    return json(res, 200, { teachers: rows });
  }
  if (req.method === 'POST' && url.pathname === '/api/admin/teachers') {
    if (!user.permissions.includes('teachers.create')) return json(res, 403, { error: 'droits_insuffisants' });
    const body = await readJsonBody(req);
    const email = String(body.email || '').trim().toLowerCase();
    const fullName = String(body.full_name || '').trim();
    const phone = String(body.phone || '').trim() || null;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 150 || !fullName || fullName.length > 140 || (phone && phone.length > 40)) {
      return json(res, 400, { error: 'donnees_invalides', message: 'Vérifie le nom, l’adresse e-mail et le téléphone.' });
    }
    const temporaryPassword = randomBytes(15).toString('base64url');
    const hashed = await passwordHash(temporaryPassword);
    try {
      const [result] = await db.execute('INSERT INTO teachers (email,full_name,phone,password_hash,is_active,must_change_password) VALUES (?,?,?,?,TRUE,TRUE)', [email, fullName, phone, hashed]);
      await audit(db, user.id, 'teacher_created', 'teacher', req, { teacher_id: result.insertId, email });
      return json(res, 201, { ok: true, teacher: { id: result.insertId, email, full_name: fullName }, temporary_password: temporaryPassword, message: 'Transmets ce mot de passe au professeur de manière sécurisée. Il devra le changer à sa première connexion.' });
    } catch (error) {
      if (error?.code === 'ER_DUP_ENTRY') return json(res, 409, { error: 'email_deja_utilise' });
      throw error;
    }
  }
  if (req.method === 'GET' && url.pathname === '/api/admin/backup') {
    if (user.role_name !== 'principal') return json(res,403,{error:'droits_insuffisants'});
    const backupTables = [
      'roles','permissions','role_permissions','admin_users','audit_logs',
      'school_years','classes','students','enrollments','teachers','teacher_activity_logs','subjects','terms',
      'class_subjects','student_grades','teacher_class_access'
    ];
    const tables = {};
    let totalRows = 0;
    for (const table of backupTables) {
      const [rows] = await db.query(`SELECT * FROM \`${table}\``);
      totalRows += rows.length;
      if (totalRows > 200000) return json(res,413,{error:'sauvegarde_trop_volumineuse'});
      tables[table] = rows.map((row) => Object.fromEntries(Object.entries(row).map(([key,value]) => [key, value instanceof Date ? value.toISOString().slice(0,19).replace('T',' ') : value])));
    }
    const payload = { app:'SUNU MOYENNE', formatVersion:1, createdAt:new Date().toISOString(), includesSessions:false, tables };
    const checksum = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    const content = JSON.stringify({ ...payload, checksum });
    if (Buffer.byteLength(content,'utf8') > 50 * 1024 * 1024) return json(res,413,{error:'sauvegarde_trop_volumineuse'});
    res.writeHead(200,{
      'Content-Type':'application/json; charset=utf-8',
      'Content-Disposition':`attachment; filename="sunu-moyenne-backup-${new Date().toISOString().slice(0,10)}.json"`,
      'Cache-Control':'no-store',
      'X-Content-Type-Options':'nosniff'
    });
    return res.end(content);
  }
  if (req.method === 'GET' && url.pathname === '/api/admin/users') {
    if (user.role_name !== 'principal') return json(res,403,{error:'droits_insuffisants'});
    const [rows] = await db.execute('SELECT u.id,u.email,u.full_name,u.is_active,u.must_change_password,u.last_login,u.created_at,r.name AS role_name FROM admin_users u JOIN roles r ON r.id=u.role_id ORDER BY u.id');
    return json(res,200,{users:rows});
  }
  if (req.method === 'GET' && url.pathname === '/api/admin/audit/logs') {
    if (user.role_name !== 'principal') return json(res,403,{error:'droits_insuffisants'});
    const [rows] = await db.execute(`SELECT * FROM (
      SELECT al.id,al.action,al.resource,al.details,al.ip_address,al.created_at,u.full_name AS admin_name,'administrateur' AS actor_type FROM audit_logs al LEFT JOIN admin_users u ON u.id=al.admin_user_id
      UNION ALL
      SELECT tl.id,tl.action,tl.resource,tl.details,tl.ip_address,tl.created_at,t.full_name AS admin_name,'professeur' AS actor_type FROM teacher_activity_logs tl JOIN teachers t ON t.id=tl.teacher_id
    ) activity ORDER BY created_at DESC LIMIT 100`);
    return json(res,200,{logs:rows});
  }
  return json(res,404,{error:'route_invalide'});
}

const server = createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  if (process.env.NODE_ENV === 'production') res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  let url;
  try { url = new URL(req.url, `http://${req.headers.host || 'localhost'}`); }
  catch { return json(res, 400, { error: 'url_invalide' }); }

  // Routes API existantes (migration)
  if (url.pathname === '/api/migration/create' && req.method === 'POST') return createMigration(req, res);
  if (url.pathname === '/api/migration/import' && req.method === 'POST') {
    let body;
    try { body = await readJsonBody(req); } catch (error) { return json(res, 400, { error: error.message }); }
    return importMigration(req, res, String(body.code || ''));
  }
  if (url.pathname === '/api/migration/health' && req.method === 'GET') {
    try { await getDb(); return json(res, 200, { ok: true, database: true }); }
    catch (error) {
      console.error('Migration health:', error?.code || '', error?.message || error);
      return json(res, 503, { ok: false, database: false, reason: error?.message === 'mysql_not_configured' ? 'mysql_not_configured' : 'mysql_unavailable' });
    }
  }
  // Lien de migration : redirection vers la racine
  if (req.method === 'GET' || req.method === 'HEAD') {
    const migrationMatch = url.pathname.match(/^\/migration\/([^/]+)\/?$/);
    if (migrationMatch) {
      let code = '';
      try { code = decodeURIComponent(migrationMatch[1]); } catch {}
      res.writeHead(302, {
        Location: code ? `/?migration=${encodeURIComponent(code)}#migration` : '/#migration',
        'Cache-Control': 'no-store',
        'Referrer-Policy': 'no-referrer'
      });
      return res.end();
    }
    if (url.pathname === '/migration' || url.pathname === '/migration/') {
      res.writeHead(302, { Location: '/#migration', 'Cache-Control': 'no-store' });
      return res.end();
    }
  }

  // API authentification professeur — sessions serveur uniquement
  if (url.pathname.startsWith('/api/teacher/')) {
    try { return await teacherApi(req, res, url); }
    catch (error) {
      console.error('Teacher API:', error?.code || '', error?.message || error);
      if (error?.message === 'mysql_not_configured') return json(res, 503, { error: 'mysql_not_configured' });
      if (error?.message === 'payload_too_large') return json(res, 413, { error: 'payload_too_large' });
      if (error?.message === 'invalid_json') return json(res, 400, { error: 'invalid_json' });
      if (error?.code === 'ER_NO_SUCH_TABLE') return json(res,503,{error:'schema_not_installed',message:'Le schéma MySQL requis n’est pas installé. Contacte l’administrateur système.'});
      return json(res, 500, { error: 'serveur_indisponible' });
    }
  }

  // API Administration — implémentation native Node.js
  if (url.pathname.startsWith('/api/admin/')) {
    try { return await adminApi(req, res, url); }
    catch (error) {
      console.error('Administration API:', error?.code || '', error?.message || error);
      if (error?.message === 'mysql_not_configured') return json(res, 503, {error:'mysql_not_configured'});
      if (error?.message === 'payload_too_large') return json(res, 413, {error:'payload_too_large'});
      if (error?.message === 'invalid_json') return json(res, 400, {error:'invalid_json'});
      if (error?.code === 'ER_NO_SUCH_TABLE') return json(res,503,{error:'schema_not_installed',message:'Le schéma MySQL requis n’est pas installé. Lance d’abord l’installation sur une base de test.'});
      return json(res, 500, {error:'serveur_indisponible'});
    }
  }

  // Servir les fichiers statiques
  if (url.pathname === '/admin' || url.pathname === '/admin/') url.pathname = '/admin/index.html';
  return serveStatic(res, url.pathname, req.method);
});

if (process.env.NODE_ENV === 'production' && !hasDatabaseConfig()) { throw new Error('Configuration MySQL obligatoire en production'); }
server.listen(PORT, () => console.log(`SUNU MOYENNE — serveur démarré sur http://localhost:${PORT}`));

export { getDb };