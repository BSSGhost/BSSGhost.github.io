/* SUNU MOYENNE — Emplois du temps : logique partagée (serveur + navigateur).
   Aucune dépendance, aucun accès DOM. Le serveur reste l'autorité : il rappelle validateSessions()
   à chaque enregistrement ; le navigateur ne l'utilise que pour guider l'administrateur. */

export const DAYS = [
  { n: 1, label: 'Lundi', short: 'Lun' }, { n: 2, label: 'Mardi', short: 'Mar' },
  { n: 3, label: 'Mercredi', short: 'Mer' }, { n: 4, label: 'Jeudi', short: 'Jeu' },
  { n: 5, label: 'Vendredi', short: 'Ven' }, { n: 6, label: 'Samedi', short: 'Sam' },
  { n: 7, label: 'Dimanche', short: 'Dim' }
];
export const DEFAULT_DAYS = [1, 2, 3, 4, 5];
export const LIMITS = { maxSessions: 200, earliest: 6 * 60, latest: 21 * 60, minMinutes: 10, maxCourse: 240, maxBreak: 180 };
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];
export const STATUS_LABELS = { DRAFT: 'Brouillon', PUBLISHED: 'Publié', ARCHIVED: 'Archivé' };

const dayLabel = (n) => DAYS.find((d) => d.n === n)?.label || `Jour ${n}`;

/* ------------------------------ Heures ------------------------------ */
export function toMinutes(value) {
  const m = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/.exec(String(value ?? '').trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}
export const normalizeTime = (value) => { const t = toMinutes(value); return t === null ? '' : `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };
export const fmtRange = (s) => `${normalizeTime(s.start)} – ${normalizeTime(s.end)}`;

export function parseDays(value) {
  const list = Array.isArray(value) ? value : String(value ?? '').split(',');
  const days = [...new Set(list.map((x) => Number(x)).filter((n) => Number.isInteger(n) && n >= 1 && n <= 7))].sort((a, b) => a - b);
  return days.length ? days : [...DEFAULT_DAYS];
}

/* --------------------------- Validation des séances --------------------------- */
const clip = (v, max) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);

/* Retourne { errors: string[], clean: séances normalisées }. Messages en français, destinés à l'administrateur. */
export function validateSessions(input, daysInput) {
  const errors = [];
  const days = parseDays(daysInput);
  if (!Array.isArray(input)) return { errors: ['Les séances sont invalides.'], clean: [] };
  if (input.length > LIMITS.maxSessions) return { errors: [`Trop de séances (maximum ${LIMITS.maxSessions}).`], clean: [] };
  const clean = [];
  input.forEach((raw, i) => {
    const where = `Séance ${i + 1}`;
    const day = Number(raw?.day);
    const kind = raw?.kind === 'BREAK' ? 'BREAK' : raw?.kind === 'COURSE' ? 'COURSE' : null;
    const s = toMinutes(raw?.start), e = toMinutes(raw?.end);
    if (!Number.isInteger(day) || !days.includes(day)) { errors.push(`${where} : le jour n'est pas un jour de cours de cet emploi du temps.`); return; }
    if (!kind) { errors.push(`${where} : type de séance invalide.`); return; }
    if (s === null || e === null) { errors.push(`${where} (${dayLabel(day)}) : horaire invalide (format HH:MM).`); return; }
    if (e <= s) { errors.push(`${dayLabel(day)} ${normalizeTime(raw.start)} : l'heure de fin doit être après l'heure de début.`); return; }
    if (s < LIMITS.earliest || e > LIMITS.latest) { errors.push(`${dayLabel(day)} ${normalizeTime(raw.start)}–${normalizeTime(raw.end)} : horaire hors de la plage 06:00–21:00.`); return; }
    const max = kind === 'BREAK' ? LIMITS.maxBreak : LIMITS.maxCourse;
    if (e - s < LIMITS.minMinutes) { errors.push(`${dayLabel(day)} ${normalizeTime(raw.start)} : durée trop courte (minimum ${LIMITS.minMinutes} min).`); return; }
    if (e - s > max) { errors.push(`${dayLabel(day)} ${normalizeTime(raw.start)}–${normalizeTime(raw.end)} : durée anormalement longue (maximum ${max / 60} h).`); return; }
    const subjectId = raw.subject_id === null || raw.subject_id === undefined || raw.subject_id === '' ? null : Number(raw.subject_id);
    const teacherId = raw.teacher_id === null || raw.teacher_id === undefined || raw.teacher_id === '' ? null : Number(raw.teacher_id);
    if ((subjectId !== null && (!Number.isSafeInteger(subjectId) || subjectId < 1)) || (teacherId !== null && (!Number.isSafeInteger(teacherId) || teacherId < 1))) { errors.push(`${where} : matière ou professeur invalide.`); return; }
    const subjectLabel = clip(raw.subject_label, 100);
    if (kind === 'COURSE' && subjectId === null && !subjectLabel) { errors.push(`${dayLabel(day)} ${normalizeTime(raw.start)} : choisissez une matière.`); return; }
    if (kind === 'BREAK' && !subjectLabel) { /* libellé par défaut */ }
    clean.push({
      day, kind, start: normalizeTime(raw.start), end: normalizeTime(raw.end), _s: s, _e: e,
      subject_id: kind === 'COURSE' ? subjectId : null,
      subject_label: kind === 'BREAK' ? (subjectLabel || 'Pause') : subjectLabel,
      teacher_id: kind === 'COURSE' ? teacherId : null,
      teacher_label: kind === 'COURSE' ? clip(raw.teacher_label, 140) : '',
      room: kind === 'COURSE' ? clip(raw.room, 40) : ''
    });
  });
  /* Chevauchements : par jour, deux séances ne peuvent pas se recouvrir. */
  for (const d of days) {
    const list = clean.filter((x) => x.day === d).sort((a, b) => a._s - b._s || a._e - b._e);
    for (let i = 1; i < list.length; i++) {
      if (list[i]._s < list[i - 1]._e) errors.push(`Chevauchement le ${dayLabel(d).toLowerCase()} : ${fmtRange(list[i - 1])} et ${fmtRange(list[i])}.`);
    }
  }
  return { errors, clean: clean.map(({ _s, _e, ...rest }) => rest) };
}

/* --------------------------- Modèle de grille --------------------------- */
/* Lignes = créneaux distincts (début/fin) triés ; colonnes = jours de cours. */
export function buildGrid(sessions, daysInput) {
  const days = parseDays(daysInput).map((n) => ({ n, label: dayLabel(n), short: DAYS.find((d) => d.n === n).short }));
  const map = new Map();
  for (const s of sessions || []) {
    const start = normalizeTime(s.start), end = normalizeTime(s.end); if (!start || !end) continue;
    const key = `${start}-${end}`;
    if (!map.has(key)) map.set(key, { start, end, cells: {} });
    map.get(key).cells[Number(s.day)] = s;
  }
  const rows = [...map.values()].sort((a, b) => toMinutes(a.start) - toMinutes(b.start) || toMinutes(a.end) - toMinutes(b.end));
  rows.forEach((r) => {
    const present = days.map((d) => r.cells[d.n]).filter(Boolean);
    r.fullBreak = present.length === days.length && present.every((c) => c.kind === 'BREAK') && new Set(present.map((c) => c.subject_name || c.subject_label)).size === 1;
  });
  return { days, rows };
}

export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const subjectOf = (s) => s.subject_name || s.subject_label || '';
const teacherOf = (s) => s.teacher_name || s.teacher_label || '';

function cellHtml(s) {
  if (!s) return '<div class="tt-cell tt-empty" aria-label="Créneau libre"><span>—</span></div>';
  if (s.kind === 'BREAK') return `<div class="tt-cell tt-break"><strong>${esc(subjectOf(s))}</strong></div>`;
  return `<div class="tt-cell tt-course"><strong>${esc(subjectOf(s))}</strong>${teacherOf(s) ? `<span class="tt-teacher">${esc(teacherOf(s))}</span>` : ''}${s.room ? `<em class="tt-room">Salle ${esc(s.room)}</em>` : ''}</div>`;
}

/* Rendu lecture seule : tableau (ordinateur) + agenda par jour (smartphone). Tout texte est échappé. */
export function gridHtml(grid) {
  if (!grid.rows.length) return '<p class="tt-none">Cet emploi du temps ne contient encore aucune séance.</p>';
  const head = `<tr><th class="tt-time-h" scope="col">Horaires</th>${grid.days.map((d) => `<th scope="col">${esc(d.label)}</th>`).join('')}</tr>`;
  const body = grid.rows.map((r) => `<tr><th class="tt-time" scope="row">${esc(r.start)}<small>${esc(r.end)}</small></th>${r.fullBreak
    ? `<td colspan="${grid.days.length}">${cellHtml(r.cells[grid.days[0].n])}</td>`
    : grid.days.map((d) => `<td>${cellHtml(r.cells[d.n])}</td>`).join('')}</tr>`).join('');
  const agenda = grid.days.map((d) => {
    const items = grid.rows.map((r) => ({ r, s: r.cells[d.n] })).filter((x) => x.s);
    return `<section class="tt-day"><h4>${esc(d.label)}</h4>${items.length ? items.map(({ r, s }) => `<div class="tt-item ${s.kind === 'BREAK' ? 'is-break' : ''}"><time>${esc(r.start)}<small>${esc(r.end)}</small></time>${cellHtml(s)}</div>`).join('') : '<p class="tt-noday">Pas de cours</p>'}</section>`;
  }).join('');
  return `<div class="tt-table-wrap"><table class="tt-table"><thead>${head}</thead><tbody>${body}</tbody></table></div><div class="tt-agenda">${agenda}</div>`;
}

/* ------------------------ Contrôle réel des fichiers ------------------------ */
const startsWith = (buf, bytes, at = 0) => bytes.every((b, i) => buf[at + i] === b);
function lastIndexOfBytes(buf, bytes, from) {
  for (let i = buf.length - bytes.length; i >= Math.max(0, from); i--) if (startsWith(buf, bytes, i)) return i;
  return -1;
}

/* Détecte le type RÉEL d'après le contenu (jamais d'après l'extension ni l'en-tête envoyé par le client). */
export function detectFileType(buf) {
  if (!buf || buf.length < 16) return null;
  if (startsWith(buf, [0x25, 0x50, 0x44, 0x46, 0x2d])) { // %PDF-
    if (lastIndexOfBytes(buf, [0x25, 0x25, 0x45, 0x4f, 0x46], buf.length - 2048) < 0) return null; // %%EOF
    return { mime: 'application/pdf', ext: 'pdf' };
  }
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    if (lastIndexOfBytes(buf, [0x49, 0x45, 0x4e, 0x44], buf.length - 64) < 0) return null; // IEND
    return { mime: 'image/png', ext: 'png' };
  }
  if (startsWith(buf, [0xff, 0xd8, 0xff])) {
    if (lastIndexOfBytes(buf, [0xff, 0xd9], buf.length - 64) < 0) return null; // EOI
    return { mime: 'image/jpeg', ext: 'jpg' };
  }
  return null;
}

/* Refuse les PDF contenant du code actif ou des pièces jointes (analyse « au mieux » : les flux compressés ne sont pas ouverts). */
export function pdfHasActiveContent(buf) {
  return /\/(JavaScript|JS|Launch|EmbeddedFile|RichMedia|XFA|SubmitForm|ImportData)(?![A-Za-z0-9])/.test(buf.toString('latin1'));
}

/* Nom de fichier sûr : jamais utilisé comme chemin (le contenu est en base), seulement affiché/téléchargé. */
export function sanitizeFileName(name, ext) {
  let base = String(name ?? '').normalize('NFC').split(/[\\/]/).pop().replace(/\.[A-Za-z0-9]{1,5}$/, '');
  base = base.replace(/[^\p{L}\p{N} ._()-]/gu, '_').replace(/\.{2,}/g, '.').replace(/^[. _]+|[. _]+$/g, '').replace(/\s+/g, ' ').slice(0, 90);
  return `${base || 'emploi-du-temps'}.${ext}`;
}
