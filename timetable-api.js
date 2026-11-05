import { createHash } from 'node:crypto';
import { v2 as cloudinary } from 'cloudinary';

const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Map([
  ['application/pdf', 'pdf'], ['image/png', 'png'], ['image/jpeg', 'jpg']
]);

function cloudinaryConfigured() {
  return Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}
function configureCloudinary() {
  cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET, secure: true });
}
function validInteger(value) { return Number.isSafeInteger(Number(value)) && Number(value) > 0; }
function validTime(value) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || '')); }
function safeSlots(value) {
  if (!Array.isArray(value) || value.length > 100) throw new Error('sessions_invalides');
  const weekdays = new Set(['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY']);
  for (const slot of value) {
    if (!slot || !weekdays.has(slot.weekday) || !['LESSON','BREAK','FREE'].includes(slot.session_type || 'LESSON')) throw new Error('sessions_invalides');
    if (!validTime(slot.starts_at) || !validTime(slot.ends_at) || slot.ends_at <= slot.starts_at) throw new Error('horaires_incoherents');
  }
  return value;
}
function detectMime(buffer) {
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString('ascii').startsWith('%PDF-')) return 'application/pdf';
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer.subarray(1, 4).toString('ascii') === 'PNG') return 'image/png';
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  return null;
}
function signedDocumentUrl(documentRow) {
  if (!cloudinaryConfigured()) throw new Error('storage_not_configured');
  configureCloudinary();
  return cloudinary.url(documentRow.cloudinary_public_id, {
    resource_type: documentRow.cloudinary_resource_type === 'raw' ? 'raw' : 'image', type: 'authenticated', sign_url: true, secure: true,
    format: documentRow.mime_type === 'application/pdf' ? undefined : (documentRow.mime_type === 'image/png' ? 'png' : 'jpg')
  });
}
async function uploadDocument(buffer, mime, originalName) {
  if (!cloudinaryConfigured()) throw new Error('storage_not_configured');
  configureCloudinary();
  const extension = ALLOWED.get(mime);
  const publicId = `sunu-moyenne/timetables/${createHash('sha256').update(buffer).digest('hex').slice(0, 32)}`;
  const result = await cloudinary.uploader.upload(`data:${mime};base64,${buffer.toString('base64')}`, {
    public_id: publicId, resource_type: 'image', type: 'authenticated', overwrite: false,
    format: extension, filename_override: originalName.replace(/[^A-Za-z0-9_.-]/g, '_').slice(0, 180)
  });
  return { public_id: result.public_id, resource_type: result.resource_type || 'image' };
}
async function destroyDocument(documentRow) {
  configureCloudinary();
  await cloudinary.uploader.destroy(documentRow.cloudinary_public_id, { resource_type: documentRow.cloudinary_resource_type === 'raw' ? 'raw' : 'image', type: 'authenticated', invalidate: true });
}
function overlaps(a, b) { return a.weekday === b.weekday && a.starts_at < b.ends_at && b.starts_at < a.ends_at; }

export async function adminTimetableApi(req, res, url, db, user, json, readJsonBody, audit) {
  const permission = (name) => user.permissions.includes(name);
  const requirePermission = (name) => { if (!permission(name)) throw Object.assign(new Error('forbidden'), { status: 403 }); };
  try {
    if (req.method === 'GET' && url.pathname === '/api/admin/timetables') {
      requirePermission('timetable.view');
      const [rows] = await db.execute(`SELECT tt.id,tt.school_year_id,tt.class_id,tt.title,tt.status,tt.published_at,tt.created_at,tt.updated_at,
        c.name AS class_name,y.label AS school_year, (SELECT COUNT(*) FROM timetable_sessions s WHERE s.timetable_id=tt.id) session_count,
        (SELECT COUNT(*) FROM timetable_documents d WHERE d.timetable_id=tt.id) has_document
        FROM timetables tt JOIN classes c ON c.id=tt.class_id JOIN school_years y ON y.id=tt.school_year_id
        ORDER BY y.is_current DESC, y.label DESC,c.name,tt.title`);
      return json(res, 200, { timetables: rows });
    }
    const detail = url.pathname.match(/^\/api\/admin\/timetables\/([1-9]\d*)$/);
    if (req.method === 'GET' && detail) {
      requirePermission('timetable.view'); const timetableId = Number(detail[1]);
      const [rows] = await db.execute(`SELECT tt.*,c.name AS class_name,y.label AS school_year FROM timetables tt JOIN classes c ON c.id=tt.class_id JOIN school_years y ON y.id=tt.school_year_id WHERE tt.id=? LIMIT 1`, [timetableId]);
      if (!rows.length) return json(res, 404, { error: 'emploi_du_temps_introuvable' });
      const [sessions] = await db.execute(`SELECT s.*,sub.name AS subject_name,t.full_name AS teacher_name FROM timetable_sessions s LEFT JOIN subjects sub ON sub.id=s.subject_id LEFT JOIN teachers t ON t.id=s.teacher_id WHERE s.timetable_id=? ORDER BY FIELD(s.weekday,'MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'),s.starts_at,s.sort_order`, [timetableId]);
      const [documents] = await db.execute('SELECT id,original_name,mime_type,file_size,created_at FROM timetable_documents WHERE timetable_id=? LIMIT 1',[timetableId]);
      return json(res, 200, { timetable: rows[0], sessions, document: documents[0] || null });
    }
    if (req.method === 'POST' && url.pathname === '/api/admin/timetables') {
      requirePermission('timetable.create'); const body = await readJsonBody(req);
      const schoolYearId = Number(body.school_year_id), classId = Number(body.class_id);
      if (!validInteger(schoolYearId) || !validInteger(classId)) return json(res, 400, { error: 'parametres_invalides' });
      const [classes] = await db.execute('SELECT id FROM classes WHERE id=? AND school_year_id=? LIMIT 1',[classId,schoolYearId]);
      if (!classes.length) return json(res, 400, { error: 'classe_invalide' });
      const [existing] = await db.execute('SELECT id FROM timetables WHERE class_id=? AND school_year_id=? LIMIT 1',[classId,schoolYearId]);
      if (existing.length) return json(res, 409, { error: 'emploi_du_temps_existant' });
      const sessions = safeSlots(body.sessions || []); for (const slot of sessions) if (sessions.some(other => other !== slot && overlaps(slot, other))) return json(res, 400,{error:'chevauchement_horaire'});
      const connection=await db.getConnection(); let timetableId;
      try {
        await connection.beginTransaction();
        const [result] = await connection.execute('INSERT INTO timetables (school_year_id,class_id,title,status,created_by_admin_id,updated_by_admin_id) VALUES (?, ?, ?, ?, ?, ?)',[schoolYearId,classId,String(body.title || '').trim().slice(0,160)||null,'DRAFT',user.id,user.id]);
        timetableId=result.insertId;
        await insertSessions(connection,timetableId,sessions);
        await connection.commit();
      } catch(error) { await connection.rollback(); throw error; } finally { connection.release(); }
      await audit(db,user.id,'timetable_created','timetable',req,{timetable_id:timetableId,class_id:classId});
      return json(res,201,{ok:true,id:timetableId});
    }
    const action = url.pathname.match(/^\/api\/admin\/timetables\/([1-9]\d*)\/([^/]+)$/);
    if (action) {
      const timetableId=Number(action[1]); const operation=action[2];
      const [rows]=await db.execute('SELECT * FROM timetables WHERE id=? LIMIT 1',[timetableId]); if (!rows.length) return json(res,404,{error:'emploi_du_temps_introuvable'}); const timetable=rows[0];
      if(req.method==='PATCH' && operation==='sessions') {
        requirePermission('timetable.edit'); const body=await readJsonBody(req); const sessions=safeSlots(body.sessions || []);
        for (const slot of sessions) if (sessions.some(other=>other!==slot&&overlaps(slot,other))) return json(res,400,{error:'chevauchement_horaire'});
        const connection=await db.getConnection(); try { await connection.beginTransaction(); await connection.execute('DELETE FROM timetable_sessions WHERE timetable_id=?',[timetableId]); await insertSessions(connection,timetableId,sessions,body); await connection.execute('UPDATE timetables SET status=IF(status="PUBLISHED","PUBLISHED","DRAFT"),updated_by_admin_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=?',[user.id,timetableId]); await connection.commit(); }
        catch(error){await connection.rollback();throw error;} finally{connection.release();}
        await audit(db,user.id,'timetable_updated','timetable',req,{timetable_id:timetableId}); return json(res,200,{ok:true});
      }
      if(req.method==='POST' && operation==='publish') { requirePermission('timetable.publish'); await db.execute('UPDATE timetables SET status="PUBLISHED",published_at=COALESCE(published_at,CURRENT_TIMESTAMP),updated_by_admin_id=? WHERE id=?',[user.id,timetableId]); await audit(db,user.id,'timetable_published','timetable',req,{timetable_id:timetableId}); return json(res,200,{ok:true}); }
      if(req.method==='POST' && operation==='unpublish') { requirePermission('timetable.publish'); await db.execute('UPDATE timetables SET status="DRAFT",published_at=NULL,updated_by_admin_id=? WHERE id=?',[user.id,timetableId]); await audit(db,user.id,'timetable_unpublished','timetable',req,{timetable_id:timetableId}); return json(res,200,{ok:true}); }
      if(req.method==='DELETE' && operation==='document') { requirePermission('timetable.edit'); await replaceDocument(db,timetableId,null); await audit(db,user.id,'timetable_document_deleted','timetable',req,{timetable_id:timetableId}); return json(res,200,{ok:true}); }
      if(req.method==='DELETE' && url.pathname === `/api/admin/timetables/${timetableId}`) { requirePermission('timetable.delete'); await db.execute('DELETE FROM timetables WHERE id=?',[timetableId]); await audit(db,user.id,'timetable_deleted','timetable',req,{timetable_id:timetableId}); return json(res,200,{ok:true}); }
    }
    const simpleDetail=url.pathname.match(/^\/api\/admin\/timetables\/([1-9]\d*)$/);
    if(req.method==='DELETE' && simpleDetail) { requirePermission('timetable.delete'); const timetableId=Number(simpleDetail[1]); await db.execute('DELETE FROM timetables WHERE id=?',[timetableId]); await audit(db,user.id,'timetable_deleted','timetable',req,{timetable_id:timetableId}); return json(res,200,{ok:true}); }
    if(req.method==='POST' && simpleDetail) return json(res,404,{error:'route_invalide'});
    return json(res,404,{error:'route_invalide'});
  } catch(error) {
    if(error.status===403) return json(res,403,{error:'droits_insuffisants'});
    if(error.status===404) return json(res,404,{error:error.message});
    if(error.status===400) return json(res,400,{error:error.message});
    if(['sessions_invalides','horaires_incoherents','chevauchement_horaire','storage_not_configured'].includes(error.message)) return json(res,error.message==='storage_not_configured'?503:400,{error:error.message});
    throw error;
  }
}

async function insertSessions(db,timetableId,sessions) {
  const [timetableRows] = await db.execute('SELECT class_id,school_year_id FROM timetables WHERE id=? LIMIT 1',[timetableId]);
  if (!timetableRows.length) throw Object.assign(new Error('emploi_du_temps_introuvable'), { status: 404 });
  const timetable=timetableRows[0];
  for(let i=0;i<sessions.length;i++) {
    const s=sessions[i]; const subjectId=s.subject_id&&validInteger(s.subject_id)?Number(s.subject_id):null; const teacherId=s.teacher_id&&validInteger(s.teacher_id)?Number(s.teacher_id):null;
    if (subjectId) { const [subjects]=await db.execute(`SELECT cs.id FROM class_subjects cs JOIN subjects sub ON sub.id=cs.subject_id WHERE cs.class_id=? AND cs.subject_id=? AND sub.is_active=TRUE LIMIT 1`,[timetable.class_id,subjectId]); if (!subjects.length) throw Object.assign(new Error('matiere_non_affectee_a_la_classe'), { status: 400 }); }
    if (teacherId) { const [teachers]=await db.execute('SELECT id FROM teacher_class_access WHERE class_id=? AND teacher_id=? AND is_active=TRUE LIMIT 1',[timetable.class_id,teacherId]); if (!teachers.length) throw Object.assign(new Error('professeur_non_affecte_a_la_classe'), { status: 400 }); }
    await db.execute(`INSERT INTO timetable_sessions (timetable_id,weekday,starts_at,ends_at,session_type,subject_id,teacher_id,room,note,sort_order) VALUES (?,?,?,?,?,?,?,?,?,?)`,[timetableId,s.weekday,s.starts_at,s.ends_at,s.session_type||'LESSON',subjectId,teacherId,String(s.room||'').trim().slice(0,80)||null,String(s.note||'').trim().slice(0,255)||null,i]);
  }
}
async function replaceDocument(db,timetableId,documentRow) { if(documentRow&&cloudinaryConfigured()) await destroyDocument(documentRow); await db.execute('DELETE FROM timetable_documents WHERE timetable_id=?',[timetableId]); }

export async function teacherTimetableApi(req,res,url,db,teacher,json,readJsonBody) {
  if(req.method==='GET' && url.pathname==='\/api\/teacher\/timetables') {
    const [rows]=await db.execute(`SELECT DISTINCT tt.id,tt.title,tt.status,c.id AS class_id,c.name AS class_name,y.label AS school_year,tt.updated_at
      FROM timetables tt JOIN classes c ON c.id=tt.class_id JOIN school_years y ON y.id=tt.school_year_id
      JOIN teacher_class_access a ON a.class_id=c.id AND a.teacher_id=? AND a.is_active=TRUE
      WHERE tt.status='PUBLISHED' AND c.is_active=TRUE AND y.is_active=TRUE ORDER BY y.is_current DESC,c.name`,[teacher.id]);
    return json(res,200,{timetables:rows});
  }
  const match=url.pathname.match(/^\/api\/teacher\/timetables\/([1-9]\d*)$/);
  if(req.method==='GET' && match) {
    const id=Number(match[1]); const [allowed]=await db.execute(`SELECT tt.id FROM timetables tt JOIN teacher_class_access a ON a.class_id=tt.class_id AND a.teacher_id=? AND a.is_active=TRUE WHERE tt.id=? AND tt.status='PUBLISHED' LIMIT 1`,[teacher.id,id]);
    if(!allowed.length)return json(res,403,{error:'emploi_du_temps_non_autorise'});
    const [sessions]=await db.execute(`SELECT s.*,sub.name AS subject_name,t.full_name AS teacher_name FROM timetable_sessions s LEFT JOIN subjects sub ON sub.id=s.subject_id LEFT JOIN teachers t ON t.id=s.teacher_id WHERE s.timetable_id=? ORDER BY FIELD(s.weekday,'MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'),s.starts_at`,[id]);
    const [documents]=await db.execute('SELECT id,original_name,mime_type,file_size,created_at FROM timetable_documents WHERE timetable_id=? LIMIT 1',[id]);
    return json(res,200,{sessions,document:documents[0]||null});
  }
  const documentMatch=url.pathname.match(/^\/api\/teacher\/timetable-documents\/([1-9]\d*)$/);
  if(req.method==='GET'&&documentMatch) {
    const id=Number(documentMatch[1]); const [rows]=await db.execute(`SELECT d.* FROM timetable_documents d JOIN timetables tt ON tt.id=d.timetable_id JOIN teacher_class_access a ON a.class_id=tt.class_id AND a.teacher_id=? AND a.is_active=TRUE WHERE d.id=? AND tt.status='PUBLISHED' LIMIT 1`,[teacher.id,id]);
    if(!rows.length)return json(res,403,{error:'document_non_autorise'}); let url; try{url=signedDocumentUrl(rows[0]);}catch(error){if(error.message==='storage_not_configured')return json(res,503,{error:'storage_not_configured'});throw error;} res.writeHead(302,{Location:url,'Cache-Control':'no-store'});res.end();return true;
  }
  return null;
}

export async function adminTimetableUpload(req,res,url,db,user,readJsonBody,audit) {
  const match=url.pathname.match(/^\/api\/admin\/timetables\/([1-9]\d*)\/document$/);
  if(!match || req.method!=='POST') return null;
  if(!user.permissions.includes('timetable.upload')) return {handled:true,response:'forbidden'};
  const timetableId=Number(match[1]);   const body=await readJsonBody(req, 12 * 1024 * 1024); const buffer=Buffer.from(String(body.data||''),'base64');
  if(!buffer.length||buffer.length>MAX_DOCUMENT_BYTES)return {handled:true,response:'invalid_document'};
  const declared=String(body.mime_type||'').toLowerCase(); const detected=detectMime(buffer);
  if(!ALLOWED.has(declared)||detected!==declared)return {handled:true,response:'invalid_document_type'};
  if(!cloudinaryConfigured())return {handled:true,response:'storage_not_configured'};
  const [rows]=await db.execute('SELECT id FROM timetable_documents WHERE timetable_id=? LIMIT 1',[timetableId]); const oldRows=rows.length?await db.execute('SELECT * FROM timetable_documents WHERE timetable_id=? LIMIT 1',[timetableId]):[[]];
  const uploaded=await uploadDocument(buffer,detected,String(body.name||'emploi-du-temps'));
  await replaceDocument(db,timetableId,oldRows[0][0]);
  await db.execute(`INSERT INTO timetable_documents (timetable_id,original_name,stored_name,mime_type,file_size,sha256,cloudinary_public_id,cloudinary_resource_type,created_by_admin_id) VALUES (?,?,?,?,?,?,?,?,?)`,[timetableId,String(body.name||'document').slice(0,255),uploaded.public_id,detected,buffer.length,createHash('sha256').update(buffer).digest('hex'),uploaded.public_id,uploaded.resource_type,user.id]);
  await audit(db,user.id,'timetable_document_uploaded','timetable',req,{timetable_id:timetableId,mime_type:detected,file_size:buffer.length});
  return {handled:true,response:'ok'};
}
