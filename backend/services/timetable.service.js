/* SUNU MOYENNE — Emplois du temps : routes API (administration + professeurs).
   Branché depuis server.js, qui fournit l'authentification, les sessions et le contrôle d'origine existants.
   Aucune route ici n'est joignable sans passer par adminContext()/teacherContext() de server.js. */
import { createHash } from 'node:crypto';
import {
  MAX_FILE_BYTES, parseDays, validateSessions, normalizeTime, detectFileType, pdfHasActiveContent, sanitizeFileName
} from '../../timetable-core.js';

const ID = '(\\d{1,18})';
const safeId = (v) => { const n = Number(v); return Number.isSafeInteger(n) && n >= 1 ? n : null; };
const cleanText = (v, max) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);

async function readBinaryBody(req, max) {
  const declared = Number(req.headers['content-length'] || 0);
  if (declared > max) throw new Error('payload_too_large');
  let total = 0; const chunks = [];
  for await (const chunk of req) { total += chunk.length; if (total > max) throw new Error('payload_too_large'); chunks.push(chunk); }
  return Buffer.concat(chunks);
}

async function withTx(db, fn) {
  const conn = await db.getConnection();
  try { await conn.beginTransaction(); const out = await fn(conn); await conn.commit(); return out; }
  catch (error) { try { await conn.rollback(); } catch {} throw error; }
  finally { conn.release(); }
}

const SESSION_SELECT = `SELECT ts.id, ts.day_of_week AS day, ts.starts_at AS start, ts.ends_at AS end, ts.kind,
  ts.subject_id, ts.teacher_id, ts.subject_label, ts.teacher_label, ts.room,
  COALESCE(sub.name, NULLIF(ts.subject_label,'')) AS subject_name, COALESCE(t.full_name, NULLIF(ts.teacher_label,'')) AS teacher_name
  FROM timetable_sessions ts LEFT JOIN subjects sub ON sub.id=ts.subject_id LEFT JOIN teachers t ON t.id=ts.teacher_id`;

const shapeSession = (r, { ids = true } = {}) => ({
  ...(ids ? { id: r.id, subject_id: r.subject_id, teacher_id: r.teacher_id, subject_label: r.subject_label, teacher_label: r.teacher_label } : {}),
  day: r.day, start: normalizeTime(r.start), end: normalizeTime(r.end), kind: r.kind,
  subject_name: r.subject_name || '', teacher_name: r.teacher_name || '', room: r.room || ''
});

/* Remplit les libellés depuis les référentiels et refuse les identifiants inconnus. */
async function resolveReferences(conn, sessions) {
  const subjectIds = [...new Set(sessions.map((s) => s.subject_id).filter(Boolean))];
  const teacherIds = [...new Set(sessions.map((s) => s.teacher_id).filter(Boolean))];
  const subjects = new Map(), teachers = new Map();
  if (subjectIds.length) { const [rows] = await conn.execute(`SELECT id,name FROM subjects WHERE id IN (${subjectIds.map(() => '?').join(',')})`, subjectIds); rows.forEach((r) => subjects.set(Number(r.id), r.name)); }
  if (teacherIds.length) { const [rows] = await conn.execute(`SELECT id,full_name FROM teachers WHERE id IN (${teacherIds.map(() => '?').join(',')})`, teacherIds); rows.forEach((r) => teachers.set(Number(r.id), r.full_name)); }
  for (const s of sessions) {
    if (s.subject_id && !subjects.has(s.subject_id)) return { error: 'Une matière sélectionnée n’existe plus.' };
    if (s.teacher_id && !teachers.has(s.teacher_id)) return { error: 'Un professeur sélectionné n’existe plus.' };
    if (s.subject_id) s.subject_label = subjects.get(s.subject_id);
    if (s.teacher_id) s.teacher_label = teachers.get(s.teacher_id);
  }
  return { sessions };
}

async function replaceSessions(conn, timetableId, sessions) {
  await conn.execute('DELETE FROM timetable_sessions WHERE timetable_id=?', [timetableId]);
  for (const s of sessions) {
    await conn.execute(`INSERT INTO timetable_sessions (timetable_id,day_of_week,starts_at,ends_at,kind,subject_id,teacher_id,subject_label,teacher_label,room) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [timetableId, s.day, `${s.start}:00`, `${s.end}:00`, s.kind, s.subject_id, s.teacher_id, s.subject_label, s.teacher_label, s.room]);
  }
}

function sendDocument(res, row, download) {
  const mime = ['application/pdf', 'image/png', 'image/jpeg'].includes(row.mime_type) ? row.mime_type : 'application/octet-stream';
  const ascii = row.original_name.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  res.writeHead(200, {
    'Content-Type': mime,
    'Content-Length': row.content.length,
    'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(row.original_name)}`,
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Content-Security-Policy': "frame-ancestors 'self'",
    'Referrer-Policy': 'no-referrer'
  });
  res.end(row.content);
}

/* Valide le fichier reçu : taille, type réel, contenu actif. Retourne { error } ou { buf, type, name }. */
function checkUpload(buf, rawName) {
  if (!buf.length) return { error: 'fichier_vide', message: 'Aucun fichier reçu.', status: 400 };
  if (buf.length > MAX_FILE_BYTES) return { error: 'fichier_trop_volumineux', message: 'Le fichier dépasse 5 Mo.', status: 413 };
  const type = detectFileType(buf);
  if (!type) return { error: 'type_fichier_refuse', message: 'Format refusé : seuls les PDF, PNG et JPG valides sont acceptés.', status: 415 };
  if (type.ext === 'pdf' && pdfHasActiveContent(buf)) return { error: 'pdf_dangereux', message: 'Ce PDF contient du code actif ou des pièces jointes : importation refusée.', status: 422 };
  let name = ''; try { name = decodeURIComponent(String(rawName || '')); } catch { name = String(rawName || ''); }
  return { buf, type, name: sanitizeFileName(name, type.ext) };
}

const TT_LIST = `SELECT t.id, t.class_id, c.name AS class_name, t.school_year_id, y.label AS school_year, t.title, t.kind, t.status, t.days,
  t.published_at, t.created_at, t.updated_at, u.full_name AS created_by_name,
  (SELECT COUNT(*) FROM timetable_sessions s WHERE s.timetable_id=t.id AND s.kind='COURSE') AS course_count,
  d.original_name AS document_name, d.mime_type AS document_mime, d.size_bytes AS document_size, d.version AS document_version
  FROM timetables t JOIN classes c ON c.id=t.class_id JOIN school_years y ON y.id=t.school_year_id
  LEFT JOIN timetable_documents d ON d.timetable_id=t.id LEFT JOIN admin_users u ON u.id=t.created_by`;

/* ============================== ADMINISTRATION ============================== */
/* Retourne true si la requête a été traitée. `h` = { req, res, url, db, user, can, json, readJsonBody, audit }. */
export async function handleAdminTimetables(h) {
  const { req, res, url, db, user, can, json, readJsonBody, audit } = h;
  const p = url.pathname;
  if (p !== '/api/admin/timetables' && !p.startsWith('/api/admin/timetables/')) return false;
  const deny = (perm) => { if (can(perm)) return false; json(res, 403, { error: 'droits_insuffisants', message: 'Vous n’avez pas l’autorisation d’effectuer cette action.' }); return true; };
  const bad = (message, errors) => json(res, 400, { error: 'emploi_du_temps_invalide', message, errors });
  const m = req.method;

  /* --- Données de référence pour les formulaires --- */
  if (m === 'GET' && p === '/api/admin/timetables/options') {
    if (deny('timetable.view')) return true;
    const classId = safeId(url.searchParams.get('class_id'));
    const [classes] = await db.execute(`SELECT c.id,c.name,c.level,c.school_year_id,y.label AS school_year,y.is_current FROM classes c JOIN school_years y ON y.id=c.school_year_id WHERE c.is_active=TRUE AND y.is_active=TRUE ORDER BY y.is_current DESC,y.label DESC,c.name`);
    const [subjects] = await db.execute('SELECT id,name FROM subjects WHERE is_active=TRUE ORDER BY name');
    const [teachers] = await db.execute('SELECT id,full_name FROM teachers WHERE is_active=TRUE ORDER BY full_name');
    let assignments = [];
    if (classId) {
      [assignments] = await db.execute(`SELECT DISTINCT cs.subject_id, s.name AS subject_name, cs.teacher_id, t.full_name AS teacher_name FROM class_subjects cs JOIN subjects s ON s.id=cs.subject_id LEFT JOIN teachers t ON t.id=cs.teacher_id WHERE cs.class_id=? AND cs.is_active=TRUE ORDER BY s.name`, [classId]);
    }
    return json(res, 200, { classes, subjects, teachers, assignments }), true;
  }

  /* --- Liste --- */
  if (m === 'GET' && p === '/api/admin/timetables') {
    if (deny('timetable.view')) return true;
    const [rows] = await db.execute(`${TT_LIST} ORDER BY y.label DESC, c.name, FIELD(t.status,'PUBLISHED','DRAFT','ARCHIVED'), t.updated_at DESC`);
    return json(res, 200, { timetables: rows }), true;
  }

  /* --- Importation d'un document (création) --- */
  if (m === 'POST' && p === '/api/admin/timetables/import') {
    if (deny('timetable.upload')) return true;
    const classId = safeId(url.searchParams.get('class_id'));
    if (!classId) return json(res, 400, { error: 'donnees_invalides', message: 'Classe invalide.' }), true;
    const checked = checkUpload(await readBinaryBody(req, MAX_FILE_BYTES + 1024), url.searchParams.get('name'));
    if (checked.error) return json(res, checked.status, { error: checked.error, message: checked.message }), true;
    const [cls] = await db.execute('SELECT id,school_year_id,is_active FROM classes WHERE id=? LIMIT 1', [classId]);
    if (!cls.length || !cls[0].is_active) return json(res, 404, { error: 'classe_introuvable', message: 'Classe introuvable ou inactive.' }), true;
    const title = cleanText(url.searchParams.get('title'), 150) || null;
    const id = await withTx(db, async (conn) => {
      const [r] = await conn.execute(`INSERT INTO timetables (school_year_id,class_id,title,kind,status,created_by,updated_by) VALUES (?,?,?,'DOCUMENT','DRAFT',?,?)`, [cls[0].school_year_id, classId, title, user.id, user.id]);
      await conn.execute('INSERT INTO timetable_documents (timetable_id,original_name,mime_type,size_bytes,sha256,content,uploaded_by) VALUES (?,?,?,?,?,?,?)',
        [r.insertId, checked.name, checked.type.mime, checked.buf.length, createHash('sha256').update(checked.buf).digest('hex'), checked.buf, user.id]);
      return r.insertId;
    });
    await audit(db, user.id, 'timetable_imported', 'timetable', req, { timetable_id: id, class_id: classId, mime: checked.type.mime, size: checked.buf.length });
    return json(res, 201, { ok: true, id }), true;
  }

  /* --- Création d'une grille --- */
  if (m === 'POST' && p === '/api/admin/timetables') {
    if (deny('timetable.create')) return true;
    const body = await readJsonBody(req);
    const classId = safeId(body.class_id);
    if (!classId) return bad('Choisissez une classe.'), true;
    const days = parseDays(body.days);
    const { errors, clean } = validateSessions(body.sessions ?? [], days);
    if (errors.length) return bad(errors[0], errors), true;
    const [cls] = await db.execute('SELECT id,school_year_id,is_active FROM classes WHERE id=? LIMIT 1', [classId]);
    if (!cls.length || !cls[0].is_active) return json(res, 404, { error: 'classe_introuvable', message: 'Classe introuvable ou inactive.' }), true;
    const title = cleanText(body.title, 150) || null;
    const out = await withTx(db, async (conn) => {
      const ref = await resolveReferences(conn, clean); if (ref.error) return ref;
      const [r] = await conn.execute(`INSERT INTO timetables (school_year_id,class_id,title,kind,status,days,created_by,updated_by) VALUES (?,?,?,'GRID','DRAFT',?,?,?)`, [cls[0].school_year_id, classId, title, days.join(','), user.id, user.id]);
      await replaceSessions(conn, r.insertId, ref.sessions);
      return { id: r.insertId };
    });
    if (out.error) return bad(out.error), true;
    await audit(db, user.id, 'timetable_created', 'timetable', req, { timetable_id: out.id, class_id: classId, sessions: clean.length });
    return json(res, 201, { ok: true, id: out.id }), true;
  }

  const one = p.match(new RegExp(`^/api/admin/timetables/${ID}$`));
  const sub = p.match(new RegExp(`^/api/admin/timetables/${ID}/(document|publish|unpublish|archive)$`));
  const id = safeId((one || sub)?.[1]);
  if (!(one || sub)) return json(res, 404, { error: 'route_invalide' }), true;
  if (!id) return json(res, 400, { error: 'identifiant_invalide' }), true;

  /* --- Détail --- */
  if (one && m === 'GET') {
    if (deny('timetable.view')) return true;
    const [rows] = await db.execute(`${TT_LIST} WHERE t.id=? LIMIT 1`, [id]);
    if (!rows.length) return json(res, 404, { error: 'emploi_du_temps_introuvable' }), true;
    const [sessions] = await db.execute(`${SESSION_SELECT} WHERE ts.timetable_id=? ORDER BY ts.day_of_week, ts.starts_at`, [id]);
    return json(res, 200, { timetable: rows[0], sessions: sessions.map((r) => shapeSession(r)) }), true;
  }

  /* --- Modification (grille ou titre) --- */
  if (one && m === 'PUT') {
    if (deny('timetable.edit')) return true;
    const body = await readJsonBody(req);
    const [rows] = await db.execute('SELECT id,kind,days FROM timetables WHERE id=? LIMIT 1', [id]);
    if (!rows.length) return json(res, 404, { error: 'emploi_du_temps_introuvable' }), true;
    const tt = rows[0];
    const title = body.title === undefined ? undefined : (cleanText(body.title, 150) || null);
    if (tt.kind === 'GRID' && body.sessions !== undefined) {
      const days = parseDays(body.days ?? tt.days);
      const { errors, clean } = validateSessions(body.sessions, days);
      if (errors.length) return bad(errors[0], errors), true;
      const out = await withTx(db, async (conn) => {
        const ref = await resolveReferences(conn, clean); if (ref.error) return ref;
        await conn.execute('UPDATE timetables SET title=COALESCE(?,title), days=?, updated_by=? WHERE id=?', [title === undefined ? null : title, days.join(','), user.id, id]);
        if (title === null) await conn.execute('UPDATE timetables SET title=NULL WHERE id=?', [id]);
        await replaceSessions(conn, id, ref.sessions);
        return {};
      });
      if (out.error) return bad(out.error), true;
    } else if (title !== undefined) {
      await db.execute('UPDATE timetables SET title=?, updated_by=? WHERE id=?', [title, user.id, id]);
    }
    await audit(db, user.id, 'timetable_updated', 'timetable', req, { timetable_id: id });
    return json(res, 200, { ok: true }), true;
  }

  /* --- Suppression --- */
  if (one && m === 'DELETE') {
    if (deny('timetable.delete')) return true;
    const [r] = await db.execute('DELETE FROM timetables WHERE id=?', [id]);
    if (!r.affectedRows) return json(res, 404, { error: 'emploi_du_temps_introuvable' }), true;
    await audit(db, user.id, 'timetable_deleted', 'timetable', req, { timetable_id: id });
    return json(res, 200, { ok: true }), true;
  }

  /* --- Document : lecture / remplacement --- */
  if (sub?.[2] === 'document' && m === 'GET') {
    if (deny('timetable.view')) return true;
    const [rows] = await db.execute('SELECT original_name,mime_type,content FROM timetable_documents WHERE timetable_id=? LIMIT 1', [id]);
    if (!rows.length) return json(res, 404, { error: 'document_introuvable' }), true;
    return sendDocument(res, rows[0], url.searchParams.get('download') === '1'), true;
  }
  if (sub?.[2] === 'document' && m === 'PUT') {
    if (deny('timetable.upload')) return true;
    const checked = checkUpload(await readBinaryBody(req, MAX_FILE_BYTES + 1024), url.searchParams.get('name'));
    if (checked.error) return json(res, checked.status, { error: checked.error, message: checked.message }), true;
    const [rows] = await db.execute('SELECT id,kind FROM timetables WHERE id=? LIMIT 1', [id]);
    if (!rows.length) return json(res, 404, { error: 'emploi_du_temps_introuvable' }), true;
    if (rows[0].kind !== 'DOCUMENT') return json(res, 409, { error: 'type_incompatible', message: 'Cet emploi du temps est une grille : il n’a pas de document à remplacer.' }), true;
    await db.execute(`UPDATE timetable_documents SET original_name=?,mime_type=?,size_bytes=?,sha256=?,content=?,version=version+1,uploaded_by=? WHERE timetable_id=?`,
      [checked.name, checked.type.mime, checked.buf.length, createHash('sha256').update(checked.buf).digest('hex'), checked.buf, user.id, id]);
    await db.execute('UPDATE timetables SET updated_by=? WHERE id=?', [user.id, id]);
    await audit(db, user.id, 'timetable_document_replaced', 'timetable', req, { timetable_id: id, mime: checked.type.mime, size: checked.buf.length });
    return json(res, 200, { ok: true }), true;
  }

  /* --- Publication / dépublication / archivage --- */
  if (sub && m === 'POST' && ['publish', 'unpublish', 'archive'].includes(sub[2])) {
    if (deny('timetable.publish')) return true;
    const action = sub[2];
    try {
      const out = await withTx(db, async (conn) => {
        const [rows] = await conn.execute(`SELECT t.id,t.class_id,t.kind,t.status,t.days,c.is_active FROM timetables t JOIN classes c ON c.id=t.class_id WHERE t.id=? FOR UPDATE`, [id]);
        if (!rows.length) return { status: 404, error: 'emploi_du_temps_introuvable' };
        const tt = rows[0];
        if (action === 'unpublish') { await conn.execute(`UPDATE timetables SET status='DRAFT', published_at=NULL, updated_by=? WHERE id=?`, [user.id, id]); return { ok: true }; }
        if (action === 'archive') { await conn.execute(`UPDATE timetables SET status='ARCHIVED', published_at=NULL, updated_by=? WHERE id=?`, [user.id, id]); return { ok: true }; }
        if (!tt.is_active) return { status: 409, error: 'classe_inactive', message: 'La classe est inactive : publication impossible.' };
        if (tt.kind === 'GRID') {
          const [sessions] = await conn.execute(`${SESSION_SELECT} WHERE ts.timetable_id=?`, [id]);
          const check = validateSessions(sessions.map((r) => ({ day: r.day, kind: r.kind, start: normalizeTime(r.start), end: normalizeTime(r.end), subject_id: r.subject_id, subject_label: r.subject_label, teacher_id: r.teacher_id, teacher_label: r.teacher_label, room: r.room })), tt.days);
          if (check.errors.length) return { status: 400, error: 'emploi_du_temps_invalide', message: check.errors[0] };
          if (!sessions.some((r) => r.kind === 'COURSE')) return { status: 400, error: 'emploi_du_temps_vide', message: 'Ajoutez au moins un cours avant de publier.' };
        } else {
          const [docs] = await conn.execute('SELECT id FROM timetable_documents WHERE timetable_id=? LIMIT 1', [id]);
          if (!docs.length) return { status: 400, error: 'document_manquant', message: 'Aucun document à publier.' };
        }
        const [prev] = await conn.execute(`UPDATE timetables SET status='ARCHIVED', published_at=NULL WHERE class_id=? AND status='PUBLISHED' AND id<>?`, [tt.class_id, id]);
        await conn.execute(`UPDATE timetables SET status='PUBLISHED', published_at=NOW(), updated_by=? WHERE id=?`, [user.id, id]);
        const [[t]] = await conn.execute(`SELECT COUNT(DISTINCT teacher_id) AS n FROM class_subjects WHERE class_id=? AND is_active=TRUE AND teacher_id IS NOT NULL`, [tt.class_id]);
        return { ok: true, archived_previous: prev.affectedRows, teacher_count: Number(t.n) };
      });
      if (out.error) return json(res, out.status, { error: out.error, message: out.message }), true;
      await audit(db, user.id, `timetable_${action === 'publish' ? 'published' : action === 'unpublish' ? 'unpublished' : 'archived'}`, 'timetable', req, { timetable_id: id });
      return json(res, 200, out), true;
    } catch (error) {
      if (error?.code === 'ER_DUP_ENTRY') return json(res, 409, { error: 'deja_publie', message: 'Un autre emploi du temps est déjà publié pour cette classe.' }), true;
      throw error;
    }
  }
  return json(res, 405, { error: 'methode_non_autorisee' }), true;
}

/* ============================== ESPACE PROFESSEUR ============================== */
/* Lecture seule. Le rattachement est revérifié À CHAQUE requête via les affectations (class_subjects) :
   un identifiant modifié dans l'URL ne donne jamais accès à une classe non attribuée (réponse 404 neutre). */
const VISIBLE = `t.status='PUBLISHED' AND c.is_active=TRUE AND y.is_active=TRUE AND EXISTS (
  SELECT 1 FROM class_subjects cs WHERE cs.class_id=t.class_id AND cs.teacher_id=? AND cs.is_active=TRUE)`;

export async function handleTeacherTimetables(h) {
  const { req, res, url, db, teacher, json, auditTeacher } = h;
  const p = url.pathname;
  if (p !== '/api/teacher/timetables' && !p.startsWith('/api/teacher/timetables/')) return false;
  if (req.method !== 'GET') return json(res, 405, { error: 'lecture_seule', message: 'Les emplois du temps sont en consultation uniquement.' }), true;

  if (p === '/api/teacher/timetables') {
    const [rows] = await db.execute(`SELECT t.id, t.class_id, c.name AS class_name, y.label AS school_year, t.title, t.kind, t.days, t.published_at, t.updated_at,
      d.original_name AS document_name, d.mime_type AS document_mime, d.size_bytes AS document_size
      FROM timetables t JOIN classes c ON c.id=t.class_id JOIN school_years y ON y.id=t.school_year_id LEFT JOIN timetable_documents d ON d.timetable_id=t.id
      WHERE ${VISIBLE} ORDER BY y.is_current DESC, c.name`, [teacher.id]);
    const ids = rows.filter((r) => r.kind === 'GRID').map((r) => r.id);
    const byTt = new Map();
    if (ids.length) {
      const [sessions] = await db.execute(`${SESSION_SELECT} WHERE ts.timetable_id IN (${ids.map(() => '?').join(',')}) ORDER BY ts.day_of_week, ts.starts_at`.replace('SELECT ts.id,', 'SELECT ts.timetable_id, ts.id,'), ids);
      sessions.forEach((s) => { if (!byTt.has(s.timetable_id)) byTt.set(s.timetable_id, []); byTt.get(s.timetable_id).push(shapeSession(s, { ids: false })); });
    }
    return json(res, 200, { timetables: rows.map((r) => ({ ...r, sessions: byTt.get(r.id) || [] })) }), true;
  }

  const doc = p.match(new RegExp(`^/api/teacher/timetables/${ID}/document$`));
  const id = safeId(doc?.[1]);
  if (!doc || !id) return json(res, 404, { error: 'emploi_du_temps_introuvable' }), true;
  const [rows] = await db.execute(`SELECT d.original_name, d.mime_type, d.content FROM timetables t JOIN classes c ON c.id=t.class_id JOIN school_years y ON y.id=t.school_year_id
    JOIN timetable_documents d ON d.timetable_id=t.id WHERE t.id=? AND ${VISIBLE} LIMIT 1`, [id, teacher.id]);
  if (!rows.length) return json(res, 404, { error: 'emploi_du_temps_introuvable' }), true;
  const download = url.searchParams.get('download') === '1';
  if (download) await auditTeacher(db, teacher.id, 'timetable_document_downloaded', 'timetable', req, { timetable_id: id });
  return sendDocument(res, rows[0], download), true;
}
