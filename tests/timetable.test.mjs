/* Tests du module Emplois du temps.
   - Logique pure (validation, fichiers) : exécutée telle quelle.
   - Routes API : exécutées contre une base SQLite en mémoire qui reproduit le schéma (voir limites dans le rapport :
     ce n'est pas MySQL, la syntaxe SQL MySQL elle-même doit être validée avec `npm run install-timetables` sur la base de test). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { DatabaseSync } from 'node:sqlite';
import { readFile } from 'node:fs/promises';
import * as core from '../timetable-core.js';
import { handleAdminTimetables, handleTeacherTimetables } from '../backend/services/timetable.service.js';

/* ---------- fichiers de test ---------- */
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<<>>\n%%EOF\n');
const PDF_JS = Buffer.from('%PDF-1.4\n1 0 obj<</S/JavaScript/JS(app.alert(1))>>endobj\n%%EOF\n');
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(20, 1), Buffer.from('IEND'), Buffer.from([0xae, 0x42, 0x60, 0x82])]);
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(30, 2), Buffer.from([0xff, 0xd9])]);
const FAKE = Buffer.from('MZ\x90\x00 ceci est un executable renomme en pdf, pas un vrai document....');

/* ---------- base SQLite imitant le schéma MySQL ---------- */
function makeDb() {
  const raw = new DatabaseSync(':memory:'); raw.exec('PRAGMA foreign_keys=ON');
  raw.exec(`
  CREATE TABLE school_years(id INTEGER PRIMARY KEY, label TEXT, is_current INT DEFAULT 1, is_active INT DEFAULT 1);
  CREATE TABLE classes(id INTEGER PRIMARY KEY, name TEXT, level TEXT, school_year_id INT, is_active INT DEFAULT 1);
  CREATE TABLE subjects(id INTEGER PRIMARY KEY, name TEXT, is_active INT DEFAULT 1);
  CREATE TABLE teachers(id INTEGER PRIMARY KEY, full_name TEXT, is_active INT DEFAULT 1);
  CREATE TABLE admin_users(id INTEGER PRIMARY KEY, full_name TEXT);
  CREATE TABLE class_subjects(id INTEGER PRIMARY KEY, class_id INT, subject_id INT, teacher_id INT, is_active INT DEFAULT 1);
  CREATE TABLE timetables(id INTEGER PRIMARY KEY AUTOINCREMENT, school_year_id INT, class_id INT, title TEXT, kind TEXT, status TEXT DEFAULT 'DRAFT', days TEXT DEFAULT '1,2,3,4,5', published_at TEXT, created_by INT, updated_by INT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
  CREATE UNIQUE INDEX uq_pub ON timetables(class_id) WHERE status='PUBLISHED';
  CREATE TABLE timetable_sessions(id INTEGER PRIMARY KEY AUTOINCREMENT, timetable_id INT REFERENCES timetables(id) ON DELETE CASCADE, day_of_week INT, starts_at TEXT, ends_at TEXT, kind TEXT, subject_id INT, teacher_id INT, subject_label TEXT, teacher_label TEXT, room TEXT);
  CREATE TABLE timetable_documents(id INTEGER PRIMARY KEY AUTOINCREMENT, timetable_id INT UNIQUE REFERENCES timetables(id) ON DELETE CASCADE, original_name TEXT, mime_type TEXT, size_bytes INT, sha256 TEXT, content BLOB, version INT DEFAULT 1, uploaded_by INT);
  INSERT INTO school_years VALUES (1,'2025-2026',1,1);
  INSERT INTO classes VALUES (1,'2nde S04','2nde',1,1),(2,'1ère S1','1ère',1,1),(3,'Tle S2','Tle',1,1);
  INSERT INTO subjects VALUES (1,'Mathématiques',1),(2,'Physique-Chimie',1),(3,'Français',1);
  INSERT INTO teachers VALUES (1,'Prof A',1),(2,'Prof B',1),(3,'Prof C',1),(4,'Prof D',1);
  INSERT INTO admin_users VALUES (1,'Admin');
  INSERT INTO class_subjects(class_id,subject_id,teacher_id) VALUES (1,1,1),(1,2,2),(1,3,3),(2,1,1),(3,3,4);`);
  const tr = (sql) => sql.replace(/\s+FOR UPDATE/g, '').replace(/NOW\(\)/g, 'CURRENT_TIMESTAMP')
    .replace(/FIELD\(t\.status,'PUBLISHED','DRAFT','ARCHIVED'\)/g, "CASE t.status WHEN 'PUBLISHED' THEN 1 WHEN 'DRAFT' THEN 2 ELSE 3 END");
  const norm = (v) => (v instanceof Uint8Array ? Buffer.from(v) : v);
  async function execute(sql, params = []) {
    const st = raw.prepare(tr(sql));
    if (/^\s*select/i.test(sql)) return [st.all(...params).map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, norm(v)])))];
    try { const r = st.run(...params); return [{ insertId: Number(r.lastInsertRowid), affectedRows: Number(r.changes) }]; }
    catch (e) { if (/UNIQUE/.test(e.message)) e.code = 'ER_DUP_ENTRY'; throw e; }
  }
  const conn = { execute, beginTransaction: async () => raw.exec('BEGIN'), commit: async () => raw.exec('COMMIT'), rollback: async () => { try { raw.exec('ROLLBACK'); } catch {} }, release() {} };
  return { execute, getConnection: async () => conn, raw };
}

/* ---------- faux req/res ---------- */
function call(handler, { method = 'GET', path, body, headers = {}, ...ctx }) {
  const url = new URL(path, 'http://x');
  const payload = body === undefined ? [] : [Buffer.isBuffer(body) ? body : Buffer.from(JSON.stringify(body))];
  const req = Object.assign(Readable.from(payload), { method, headers: { 'content-length': String(payload[0]?.length || 0), ...headers } });
  return new Promise(async (resolve, reject) => {
    const res = { status: 0, headers: {}, chunks: [], writeHead(s, h) { this.status = s; Object.assign(this.headers, h); }, setHeader(k, v) { this.headers[k] = v; }, end(b) { resolve({ status: this.status, headers: this.headers, raw: b, json: (() => { try { return JSON.parse(String(b)); } catch { return null; } })() }); } };
    try { const handled = await handler({ req, res, url, ...ctx }); if (!handled) resolve({ status: 0, unhandled: true }); } catch (e) { resolve({ status: 500, error: e.message, thrown: e }); }
  });
}
const json = (res, status, obj) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
const audits = [];
const audit = async (_db, uid, action) => { audits.push(action); };
const readJsonBody = async (req) => { let s = ''; for await (const c of req) s += c; return s ? JSON.parse(s) : {}; };
const ALL = ['timetable.view', 'timetable.create', 'timetable.edit', 'timetable.delete', 'timetable.publish', 'timetable.upload'];
const admin = (db, perms = ALL) => (o) => call(handleAdminTimetables, { db, user: { id: 1 }, can: (p) => perms.includes(p), json, readJsonBody, audit, ...o });
const prof = (db, id) => (o) => call(handleTeacherTimetables, { db, teacher: { id }, json, auditTeacher: audit, ...o });
const S = (day, start, end, extra = {}) => ({ day, kind: 'COURSE', start, end, subject_id: 1, teacher_id: 1, room: '12', ...extra });

/* ============================ Logique pure ============================ */
test('validation : cas valides, chevauchements et horaires incohérents', () => {
  assert.equal(core.validateSessions([S(1, '08:00', '10:00'), S(1, '10:00', '12:00'), { day: 1, kind: 'BREAK', start: '12:00', end: '12:30', subject_label: 'Pause' }], [1, 2, 3]).errors.length, 0);
  assert.match(core.validateSessions([S(1, '08:00', '10:00'), S(1, '09:00', '11:00')], [1]).errors[0], /Chevauchement le lundi/);
  assert.match(core.validateSessions([S(1, '10:00', '09:00')], [1]).errors[0], /heure de fin/);
  assert.match(core.validateSessions([S(1, '04:00', '05:00')], [1]).errors[0], /hors de la plage/);
  assert.match(core.validateSessions([S(1, '08:00', '14:00')], [1]).errors[0], /anormalement longue/);
  assert.match(core.validateSessions([S(1, '08:30', '08:35')], [1]).errors[0], /trop courte/);
  assert.match(core.validateSessions([S(6, '08:00', '10:00')], [1, 2]).errors[0], /pas un jour de cours/);
  assert.match(core.validateSessions([S(1, '8h', '10:00')], [1]).errors[0], /horaire invalide/);
  assert.match(core.validateSessions([{ day: 1, kind: 'COURSE', start: '08:00', end: '09:00' }], [1]).errors[0], /matière/);
  assert.equal(core.validateSessions(Array.from({ length: 201 }, () => S(1, '08:00', '09:00')), [1]).errors.length, 1);
});
test('fichiers : le type réel est détecté, pas l\'extension', () => {
  assert.equal(core.detectFileType(PDF).mime, 'application/pdf');
  assert.equal(core.detectFileType(PNG).mime, 'image/png');
  assert.equal(core.detectFileType(JPG).mime, 'image/jpeg');
  assert.equal(core.detectFileType(FAKE), null);
  assert.equal(core.detectFileType(Buffer.from('%PDF-1.4 tronqué sans fin de fichier.............')), null);
  assert.equal(core.pdfHasActiveContent(PDF_JS), true); assert.equal(core.pdfHasActiveContent(PDF), false);
});
test('noms de fichiers : jamais de chemin ni de caractère dangereux', () => {
  assert.equal(core.sanitizeFileName('../../etc/passwd.pdf', 'pdf'), 'passwd.pdf');
  assert.equal(core.sanitizeFileName('C:\\Users\\x\\Emploi du temps 2nde.PDF', 'pdf'), 'Emploi du temps 2nde.pdf');
  const hostile = core.sanitizeFileName('<script>alert(1)</script>.png', 'png'); assert.ok(!/[<>\/\\]/.test(hostile) && hostile.endsWith('.png'));
  assert.equal(core.sanitizeFileName('', 'jpg'), 'emploi-du-temps.jpg');
  assert.ok(core.sanitizeFileName('a'.repeat(300) + '.pdf', 'pdf').length <= 94);
});
test('rendu : tout texte est échappé', () => {
  const g = core.buildGrid([{ day: 1, kind: 'COURSE', start: '08:00', end: '09:00', subject_name: '<img src=x onerror=1>', teacher_name: 'A&B' }], [1]);
  const html = core.gridHtml(g); assert.ok(!html.includes('<img')); assert.ok(html.includes('&lt;img') && html.includes('A&amp;B'));
});

/* ============================ Administration ============================ */
test('admin : création, modification, détail', async () => {
  const db = makeDb(); const a = admin(db);
  const c = await a({ method: 'POST', path: '/api/admin/timetables', body: { class_id: 1, title: 'S1', days: [1, 2, 3, 4, 5], sessions: [S(1, '08:00', '10:00'), S(2, '08:00', '10:00', { subject_id: 2, teacher_id: 2 }), { day: 1, kind: 'BREAK', start: '10:00', end: '10:15', subject_label: 'Récréation' }] } });
  assert.equal(c.status, 201, JSON.stringify(c.json || c.error));
  const id = c.json.id;
  let d = await a({ path: `/api/admin/timetables/${id}` });
  assert.equal(d.json.sessions.length, 3); assert.equal(d.json.sessions[0].subject_name, 'Mathématiques'); assert.equal(d.json.sessions[0].teacher_name, 'Prof A');
  assert.equal(d.json.timetable.status, 'DRAFT');
  const u = await a({ method: 'PUT', path: `/api/admin/timetables/${id}`, body: { title: 'S1 bis', days: [1, 2], sessions: [S(1, '09:00', '11:00', { subject_id: 3, teacher_id: 3 })] } });
  assert.equal(u.status, 200);
  d = await a({ path: `/api/admin/timetables/${id}` });
  assert.equal(d.json.sessions.length, 1); assert.equal(d.json.timetable.title, 'S1 bis'); assert.equal(d.json.timetable.days, '1,2');
  const l = await a({ path: '/api/admin/timetables' }); assert.equal(l.json.timetables.length, 1); assert.equal(l.json.timetables[0].class_name, '2nde S04');
});
test('admin : le serveur refuse chevauchements, horaires incohérents, matière inconnue, classe inconnue', async () => {
  const db = makeDb(); const a = admin(db); const post = (b) => a({ method: 'POST', path: '/api/admin/timetables', body: b });
  assert.equal((await post({ class_id: 1, sessions: [S(1, '08:00', '10:00'), S(1, '09:00', '11:00')] })).status, 400);
  assert.equal((await post({ class_id: 1, sessions: [S(1, '10:00', '08:00')] })).status, 400);
  assert.equal((await post({ class_id: 1, sessions: [S(1, '08:00', '10:00', { subject_id: 99 })] })).status, 400);
  assert.equal((await post({ class_id: 99, sessions: [] })).status, 404);
  assert.equal((await post({ sessions: [] })).status, 400);
  assert.equal(db.raw.prepare('SELECT COUNT(*) n FROM timetables').get().n, 0);
});
test('admin : permissions vérifiées route par route (contournement par API impossible)', async () => {
  const db = makeDb(); const full = admin(db);
  const id = (await full({ method: 'POST', path: '/api/admin/timetables', body: { class_id: 1, sessions: [S(1, '08:00', '10:00')] } })).json.id;
  const none = admin(db, []);
  const cases = [
    ['GET', '/api/admin/timetables'], ['GET', '/api/admin/timetables/options'], ['GET', `/api/admin/timetables/${id}`], ['GET', `/api/admin/timetables/${id}/document`],
    ['POST', '/api/admin/timetables', { class_id: 1, sessions: [] }], ['PUT', `/api/admin/timetables/${id}`, { title: 'x' }], ['DELETE', `/api/admin/timetables/${id}`],
    ['POST', `/api/admin/timetables/${id}/publish`, {}], ['POST', `/api/admin/timetables/${id}/unpublish`, {}], ['POST', `/api/admin/timetables/${id}/archive`, {}],
    ['POST', '/api/admin/timetables/import?class_id=1', PDF], ['PUT', `/api/admin/timetables/${id}/document`, PDF]
  ];
  for (const [method, path, body] of cases) { const r = await none({ method, path, body }); assert.equal(r.status, 403, `${method} ${path} → ${r.status}`); }
  /* Une permission n'en donne pas une autre. */
  const only = (p) => admin(db, [p]);
  assert.equal((await only('timetable.view')({ method: 'DELETE', path: `/api/admin/timetables/${id}` })).status, 403);
  assert.equal((await only('timetable.edit')({ method: 'POST', path: `/api/admin/timetables/${id}/publish`, body: {} })).status, 403);
  assert.equal((await only('timetable.create')({ method: 'POST', path: '/api/admin/timetables/import?class_id=1', body: PDF })).status, 403);
  assert.equal((await only('timetable.delete')({ method: 'DELETE', path: `/api/admin/timetables/${id}` })).status, 200);
  assert.equal(db.raw.prepare('SELECT COUNT(*) n FROM timetables').get().n, 0);
});
test('admin : importation PDF / PNG / JPG, rejet des faux fichiers, remplacement', async () => {
  const db = makeDb(); const a = admin(db);
  const imp = (buf, name = 'edt.pdf') => a({ method: 'POST', path: `/api/admin/timetables/import?class_id=1&title=T&name=${encodeURIComponent(encodeURIComponent(name))}`, body: buf, headers: { 'content-type': 'application/octet-stream' } });
  const pdf = await imp(PDF, 'Emploi 2nde S04.pdf'); assert.equal(pdf.status, 201);
  assert.equal((await imp(PNG, 'a.png')).status, 201); assert.equal((await imp(JPG, 'b.jpeg')).status, 201);
  const fake = await imp(FAKE, 'virus.pdf'); assert.equal(fake.status, 415);
  assert.equal((await imp(PDF_JS)).status, 422);
  assert.equal((await imp(Buffer.alloc(0))).status, 400);
  const big = await imp(Buffer.concat([PDF, Buffer.alloc(core.MAX_FILE_BYTES)])); assert.equal(big.status, 413);
  assert.equal(db.raw.prepare('SELECT COUNT(*) n FROM timetable_documents').get().n, 3);
  /* nom enregistré = nom assaini, type = type réel (le client ne choisit rien) */
  const row = db.raw.prepare('SELECT original_name,mime_type FROM timetable_documents WHERE timetable_id=?').get(pdf.json.id);
  assert.equal(row.original_name, 'Emploi 2nde S04.pdf'); assert.equal(row.mime_type, 'application/pdf');
  const png = await imp(PNG, '../../x.pdf'); assert.equal(db.raw.prepare('SELECT original_name,mime_type FROM timetable_documents WHERE timetable_id=?').get(png.json.id).original_name, 'x.png');
  /* lecture du document + en-têtes de sécurité */
  const g = await a({ path: `/api/admin/timetables/${pdf.json.id}/document` });
  assert.equal(g.status, 200); assert.equal(g.headers['Content-Type'], 'application/pdf'); assert.equal(g.headers['X-Content-Type-Options'], 'nosniff'); assert.match(g.headers['Cache-Control'], /no-store/); assert.ok(Buffer.compare(g.raw, PDF) === 0);
  assert.match((await a({ path: `/api/admin/timetables/${pdf.json.id}/document?download=1` })).headers['Content-Disposition'], /^attachment/);
  /* remplacement : nouvelle version conservée dans la même ligne */
  const rep = await a({ method: 'PUT', path: `/api/admin/timetables/${pdf.json.id}/document?name=n.png`, body: PNG }); assert.equal(rep.status, 200);
  const r2 = db.raw.prepare('SELECT version,mime_type FROM timetable_documents WHERE timetable_id=?').get(pdf.json.id); assert.equal(r2.version, 2); assert.equal(r2.mime_type, 'image/png');
  assert.equal((await a({ method: 'PUT', path: `/api/admin/timetables/${pdf.json.id}/document`, body: FAKE })).status, 415);
  const grid = (await a({ method: 'POST', path: '/api/admin/timetables', body: { class_id: 2, sessions: [S(1, '08:00', '09:00')] } })).json.id;
  assert.equal((await a({ method: 'PUT', path: `/api/admin/timetables/${grid}/document`, body: PDF })).status, 409);
});
test('admin : publication, une seule version publiée par classe, dépublication, suppression', async () => {
  const db = makeDb(); const a = admin(db);
  const mk = async (cls = 1) => (await a({ method: 'POST', path: '/api/admin/timetables', body: { class_id: cls, sessions: [S(1, '08:00', '10:00')] } })).json.id;
  const t1 = await mk(), t2 = await mk();
  const p1 = await a({ method: 'POST', path: `/api/admin/timetables/${t1}/publish`, body: {} }); assert.equal(p1.status, 200); assert.equal(p1.json.teacher_count, 3);
  const p2 = await a({ method: 'POST', path: `/api/admin/timetables/${t2}/publish`, body: {} }); assert.equal(p2.json.archived_previous, 1);
  const st = (id) => db.raw.prepare('SELECT status FROM timetables WHERE id=?').get(id).status;
  assert.equal(st(t1), 'ARCHIVED'); assert.equal(st(t2), 'PUBLISHED');
  assert.throws(() => db.raw.prepare("UPDATE timetables SET status='PUBLISHED' WHERE id=?").run(t1), /UNIQUE/); /* la contrainte de base protège aussi */
  assert.equal((await a({ method: 'POST', path: `/api/admin/timetables/${t2}/unpublish`, body: {} })).status, 200); assert.equal(st(t2), 'DRAFT');
  const empty = (await a({ method: 'POST', path: '/api/admin/timetables', body: { class_id: 3, sessions: [] } })).json.id;
  assert.equal((await a({ method: 'POST', path: `/api/admin/timetables/${empty}/publish`, body: {} })).status, 400);
  assert.equal((await a({ method: 'DELETE', path: `/api/admin/timetables/${t1}` })).status, 200);
  assert.equal((await a({ method: 'DELETE', path: `/api/admin/timetables/${t1}` })).status, 404);
  assert.ok(audits.includes('timetable_published') && audits.includes('timetable_deleted'));
});

/* ============================ Espace professeur ============================ */
test('professeur : visibilité automatique, strictement limitée aux classes affectées', async () => {
  const db = makeDb(); const a = admin(db);
  const grid = (await a({ method: 'POST', path: '/api/admin/timetables', body: { class_id: 1, title: '2nde S04', sessions: [S(1, '08:00', '10:00'), S(2, '08:00', '10:00', { subject_id: 2, teacher_id: 2 })] } })).json.id;
  const doc = (await a({ method: 'POST', path: '/api/admin/timetables/import?class_id=2&name=e.pdf', body: PDF })).json.id;
  const list = async (tid) => (await prof(db, tid)({ path: '/api/teacher/timetables' })).json.timetables;
  /* brouillon : personne ne voit rien */
  for (const t of [1, 2, 3, 4]) assert.equal((await list(t)).length, 0);
  assert.equal((await prof(db, 1)({ path: `/api/teacher/timetables/${doc}/document` })).status, 404);
  /* publication de la classe 1 : A, B, C la voient automatiquement, D (non rattaché) non */
  await a({ method: 'POST', path: `/api/admin/timetables/${grid}/publish`, body: {} });
  for (const t of [1, 2, 3]) { const l = await list(t); assert.equal(l.length, 1); assert.equal(l[0].class_name, '2nde S04'); assert.equal(l[0].sessions.length, 2); assert.equal(l[0].sessions[0].teacher_name, 'Prof A'); assert.equal('teacher_id' in l[0].sessions[0], false); }
  assert.equal((await list(4)).length, 0);
  /* A est aussi affecté à la classe 2 : il voit les deux ; B et C ne voient jamais la classe 2 */
  await a({ method: 'POST', path: `/api/admin/timetables/${doc}/publish`, body: {} });
  assert.deepEqual((await list(1)).map((x) => x.class_name).sort(), ['1ère S1', '2nde S04']);
  assert.equal((await list(2)).length, 1); assert.equal((await list(3)).length, 1);
  /* document : accès pour A, 404 pour B/C/D même en connaissant l'identifiant */
  const ok = await prof(db, 1)({ path: `/api/teacher/timetables/${doc}/document` }); assert.equal(ok.status, 200); assert.ok(Buffer.compare(ok.raw, PDF) === 0); assert.match(ok.headers['Cache-Control'], /no-store/);
  for (const t of [2, 3, 4]) assert.equal((await prof(db, t)({ path: `/api/teacher/timetables/${doc}/document` })).status, 404);
  assert.equal((await prof(db, 1)({ path: '/api/teacher/timetables/abc/document' })).status, 404);
  assert.equal((await prof(db, 1)({ path: '/api/teacher/timetables/0/document' })).status, 404);
  /* un professeur dont l'affectation devient inactive perd l'accès immédiatement */
  db.raw.exec('UPDATE class_subjects SET is_active=0 WHERE teacher_id=3'); assert.equal((await list(3)).length, 0);
  /* dépublication : disparaît pour tous */
  await a({ method: 'POST', path: `/api/admin/timetables/${doc}/unpublish`, body: {} });
  assert.equal((await prof(db, 1)({ path: `/api/teacher/timetables/${doc}/document` })).status, 404);
  assert.equal((await list(1)).length, 1);
  /* jamais d'écriture */
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) assert.equal((await prof(db, 1)({ method, path: `/api/teacher/timetables/${grid}`, body: {} })).status, 405);
  assert.equal((await prof(db, 1)({ method: 'POST', path: '/api/teacher/timetables', body: {} })).status, 405);
  assert.equal(db.raw.prepare('SELECT COUNT(*) n FROM timetables').get().n, 2);
});
test('routage : les chemins étrangers ne sont pas interceptés', async () => {
  const db = makeDb();
  assert.equal((await admin(db)({ path: '/api/admin/classes' })).unhandled, true);
  assert.equal((await prof(db, 1)({ path: '/api/teacher/classes' })).unhandled, true);
});

/* ============================ Intégration dans l'application ============================ */
test('intégration : server.js, admin, prof, migration', async () => {
  const rd = (p) => readFile(new URL(`../${p}`, import.meta.url), 'utf8');
  const [server, app, adminHtml, prof_, idx, sql] = await Promise.all(['server.js', 'admin/js/app.js', 'admin/index.html', 'prof.js', 'index.html', 'database/migrations/timetables.sql'].map(rd));
  assert.match(server, /handleAdminTimetables\(\{[^}]*can[^}]*\}\)/); assert.match(server, /handleTeacherTimetables\(\{[^}]*teacher[^}]*\}\)/);
  assert.ok(server.indexOf('handleAdminTimetables({') > server.indexOf('const can = '), 'hook admin après le calcul des permissions');
  assert.match(app, /emplois: \{ title: 'Emplois du temps'/); assert.match(app, /\.\.\.TT\.acts/);
  assert.match(adminHtml, /timetable\.css/); assert.match(idx, /prof-view-timetables/); assert.match(idx, /prof-tab-timetables/); assert.match(prof_, /\/api\/teacher\/timetables/);
  for (const p of ['view', 'create', 'edit', 'delete', 'publish', 'upload']) assert.ok(sql.includes(`'timetable.${p}'`));
  assert.ok(!/DROP\s|TRUNCATE|DELETE\s+FROM|ALTER\s+TABLE/i.test(sql), 'migration additive uniquement');
  assert.match(sql, /UNIQUE KEY uq_timetable_one_published_per_class \(published_class_id\)/);
  assert.ok(!/fs\.(write|mkdir)|createWriteStream/.test(await rd('backend/services/timetable.service.js')), 'aucun écrit disque local');
});
