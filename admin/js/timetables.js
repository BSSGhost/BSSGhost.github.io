/* SUNU MOYENNE — Administration : module « Emplois du temps ».
   Greffé sur admin/js/app.js (routes, permissions, composants UI). Les droits sont masqués côté interface
   ET revérifiés par le serveur sur chaque appel (/api/admin/timetables/*). */
import { icon } from './icons.js';
import { $, esc, norm, badge, empty, skeleton, toast, modal, confirmDialog, formModal, field, input, select, relTime } from './ui.js';
import { DAYS, DEFAULT_DAYS, STATUS_LABELS, MAX_FILE_BYTES, validateSessions, buildGrid, gridHtml, toMinutes, normalizeTime, detectFileType } from '../../timetable-core.js';

const TONE = { PUBLISHED: 'green', DRAFT: 'orange', ARCHIVED: 'neutral' };
const URL_API = '/api/admin/timetables';
const dayName = (n) => DAYS.find((d) => d.n === n)?.label || '';
const defaultSlots = () => [
  { start: '08:00', end: '10:00', kind: 'COURSE', label: '', cells: {} },
  { start: '10:00', end: '10:15', kind: 'BREAK', label: 'Récréation', cells: {} },
  { start: '10:15', end: '12:15', kind: 'COURSE', label: '', cells: {} },
  { start: '12:15', end: '15:00', kind: 'BREAK', label: 'Pause déjeuner', cells: {} },
  { start: '15:00', end: '17:00', kind: 'COURSE', label: '', cells: {} }
];

export function createTimetables(ctx) {
  const { api, can, pageHead, btn, menu, rerender } = ctx;
  const T = { list: null, options: null, error: '', loading: false, ui: { q: '', year: '', status: '' }, editor: null };

  async function load() {
    if (T.loading) return; T.loading = true; T.error = '';
    try {
      const [l, o] = await Promise.all([api(URL_API), api(`${URL_API}/options`)]);
      T.list = l.timetables; T.options = o;
    } catch (e) { T.error = e.message || 'Chargement impossible.'; T.list = T.list || []; }
    finally { T.loading = false; rerender(); }
  }
  const reload = () => { T.list = null; return load(); };

  /* ============================== Liste ============================== */
  const classes = () => T.options?.classes || [];
  const years = () => [...new Map(classes().map((c) => [c.school_year_id, c.school_year])).entries()].map(([value, label]) => ({ value, label }));
  const ttOf = (id) => (T.list || []).find((t) => Number(t.id) === Number(id));

  function render() {
    if (T.editor) return editorView();
    if (T.list === null && !T.loading) setTimeout(load, 0);
    const actions = (can('timetable.create') ? btn('Créer un emploi du temps', 'tt-new', 'plus') : '') + (can('timetable.upload') ? btn('Importer un emploi du temps', 'tt-import', 'upload', 'ghost') : '');
    const head = pageHead('Emplois du temps', 'Créez ou importez l’emploi du temps de chaque classe, puis publiez-le pour les professeurs concernés.', actions);
    if (T.list === null) return head + skeleton(4);
    const yearOpts = [{ value: '', label: 'Toutes les années' }, ...years()];
    const stOpts = [{ value: '', label: 'Tous les statuts' }, { value: 'PUBLISHED', label: 'Publié' }, { value: 'DRAFT', label: 'Brouillon' }, { value: 'ARCHIVED', label: 'Archivé' }, { value: 'NONE', label: 'Aucun emploi publié' }];
    return `${head}${T.error ? `<p class="tt-ed-errors" role="alert">${esc(T.error)}</p>` : ''}<div class="ui-filters"><label class="ui-search">${icon('search')}<input type="search" data-tt-filter="q" value="${esc(T.ui.q)}" placeholder="Rechercher une classe…" aria-label="Rechercher une classe"></label>
      ${select('year', yearOpts, T.ui.year, 'data-tt-filter="year" aria-label="Année scolaire"')}${select('status', stOpts, T.ui.status, 'data-tt-filter="status" aria-label="Statut"')}</div><div id="tt-list">${listHtml()}</div>`;
  }

  function listHtml() {
    let cls = classes();
    if (T.ui.year) cls = cls.filter((c) => String(c.school_year_id) === String(T.ui.year));
    if (T.ui.q) cls = cls.filter((c) => norm(`${c.name} ${c.level || ''}`).includes(norm(T.ui.q)));
    const by = (c) => (T.list || []).filter((t) => Number(t.class_id) === Number(c.id));
    if (T.ui.status === 'NONE') cls = cls.filter((c) => !by(c).some((t) => t.status === 'PUBLISHED'));
    else if (T.ui.status) cls = cls.filter((c) => by(c).some((t) => t.status === T.ui.status));
    if (!cls.length) return empty('calendar-days', 'Aucune classe à afficher', classes().length ? 'Modifiez vos filtres.' : 'Créez d’abord une classe dans la rubrique Classes.');
    return `<div class="tt-classes">${cls.map((c, i) => classCard(c, by(c), i)).join('')}</div>`;
  }

  function classCard(c, items, i) {
    const pub = items.find((t) => t.status === 'PUBLISHED');
    const rows = items.map(rowHtml).join('');
    return `<article class="tt-class" style="--d:${i * 30}ms"><header class="tt-class-head"><div><h2>${esc(c.name)}</h2><p>${esc(c.level || 'Niveau non précisé')} · ${esc(c.school_year)}</p></div>${pub ? badge('Publié', 'green') : badge('Non publié', 'neutral')}</header>
      ${items.length ? `<ul class="tt-rows">${rows}</ul>` : '<p class="tt-class-empty">Aucun emploi du temps pour cette classe.</p>'}
      ${can('timetable.create') || can('timetable.upload') ? `<div class="tt-class-actions">${can('timetable.create') ? btn('Créer', 'tt-new', 'plus', 'ghost', `data-class="${c.id}"`) : ''}${can('timetable.upload') ? btn('Importer', 'tt-import', 'upload', 'ghost', `data-class="${c.id}"`) : ''}</div>` : ''}</article>`;
  }

  function rowHtml(t) {
    const isGrid = t.kind === 'GRID';
    const label = t.title || (isGrid ? 'Grille hebdomadaire' : (t.document_name || 'Document importé'));
    const meta = isGrid ? `${t.course_count} cours` : `${(t.document_mime || '').includes('pdf') ? 'PDF' : 'Image'} · ${Math.max(1, Math.round((t.document_size || 0) / 1024))} Ko`;
    const items = [
      { act: 'tt-preview', label: 'Prévisualiser', icon: 'eye', data: { id: t.id } },
      can('timetable.edit') && { act: 'tt-edit', label: isGrid ? 'Modifier la grille' : 'Renommer', icon: 'pencil', data: { id: t.id } },
      !isGrid && can('timetable.upload') && { act: 'tt-replace', label: 'Remplacer le document', icon: 'upload', data: { id: t.id } },
      { act: 'tt-print', label: 'Imprimer', icon: 'printer', data: { id: t.id } },
      can('timetable.publish') && (t.status === 'PUBLISHED'
        ? { act: 'tt-unpublish', label: 'Dépublier', icon: 'rotate-ccw', data: { id: t.id } }
        : { act: 'tt-publish', label: 'Publier', icon: 'send', data: { id: t.id } }),
      can('timetable.publish') && t.status !== 'ARCHIVED' && { act: 'tt-archive', label: 'Archiver', icon: 'archive', data: { id: t.id } },
      can('timetable.delete') && { act: 'tt-delete', label: 'Supprimer', icon: 'trash', danger: true, data: { id: t.id } }
    ];
    return `<li class="tt-row"><span class="tt-row-ico">${icon(isGrid ? 'calendar-days' : 'file-text')}</span><div class="tt-row-main"><strong title="${esc(label)}">${esc(label)}</strong><small>${esc(meta)} · modifié ${esc(relTime(t.updated_at))}</small></div>
      <div class="tt-row-end">${badge(STATUS_LABELS[t.status], TONE[t.status])}${menu(items)}</div></li>`;
  }

  /* ============================== Aperçu / impression ============================== */
  async function detail(id) { return api(`${URL_API}/${encodeURIComponent(id)}`); }
  const docUrl = (id, dl = false) => `${URL_API}/${encodeURIComponent(id)}/document${dl ? '?download=1' : ''}`;
  function viewBody(d) {
    const t = d.timetable;
    if (t.kind === 'GRID') return `<div class="tt-wrap">${gridHtml(buildGrid(d.sessions, t.days))}</div>`;
    const img = (t.document_mime || '').startsWith('image/');
    return `${img ? `<img class="tt-img" src="${docUrl(t.id)}" alt="Emploi du temps ${esc(t.class_name)}">` : `<iframe class="tt-frame" src="${docUrl(t.id)}" title="Emploi du temps ${esc(t.class_name)}"></iframe>`}
      <div class="tt-doc-links"><a class="ui-btn ui-btn--ghost" href="${docUrl(t.id)}" target="_blank" rel="noopener">${icon('eye')}<span>Ouvrir</span></a><a class="ui-btn ui-btn--ghost" href="${docUrl(t.id, true)}">${icon('download')}<span>Télécharger</span></a></div>`;
  }
  async function preview(id) {
    const d = await detail(id); const t = d.timetable;
    const m = modal({ title: `${t.class_name} — ${t.school_year}`, size: 'xl', body: `<p class="ui-hint" style="margin:0 0 12px">${badge(STATUS_LABELS[t.status], TONE[t.status])} ${esc(t.title || '')}</p>${viewBody(d)}`,
      footer: `<button type="button" class="ui-btn ui-btn--ghost" data-close>Fermer</button>${t.kind === 'GRID' ? `<button type="button" class="ui-btn ui-btn--primary" data-print>${icon('printer')}<span>Imprimer</span></button>` : ''}` });
    m.el.querySelector('[data-print]')?.addEventListener('click', () => printGrid(t, d.sessions));
  }
  function printGrid(t, sessions) {
    const host = $('tt-print'); if (!host) return;
    host.innerHTML = `<div class="tt-head"><h1>${esc(t.class_name)} — Emploi du temps</h1><p>LYNAQE Sédhiou · Année scolaire ${esc(t.school_year)}${t.title ? ` · ${esc(t.title)}` : ''}</p></div>${gridHtml(buildGrid(sessions, t.days))}`;
    document.body.classList.add('tt-printing');
    const done = () => { document.body.classList.remove('tt-printing'); host.innerHTML = ''; window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done); window.print();
  }
  async function print(id) {
    const d = await detail(id);
    if (d.timetable.kind === 'GRID') return printGrid(d.timetable, d.sessions);
    window.open(docUrl(id), '_blank', 'noopener'); toast('Document ouvert : utilisez l’impression de votre navigateur.', 'info');
  }

  /* ============================== Import / remplacement de document ============================== */
  async function checkFile(file) {
    if (!file) throw new Error('Choisissez un fichier.');
    if (file.size > MAX_FILE_BYTES) throw new Error('Le fichier dépasse 5 Mo.');
    if (!file.size) throw new Error('Le fichier est vide.');
    const type = detectFileType(new Uint8Array(await file.arrayBuffer()));
    if (!type) throw new Error('Format refusé : seuls les PDF, PNG et JPG valides sont acceptés.');
    return type;
  }
  async function sendFile(method, url, file) {
    const r = await fetch(url, { method, credentials: 'same-origin', headers: { 'Content-Type': 'application/octet-stream' }, body: file });
    let data = {}; try { data = await r.json(); } catch {}
    if (!r.ok) throw new Error(data.message || data.error || `Erreur ${r.status}`);
    return data;
  }
  function bindFilePreview(el) {
    const box = el.querySelector('.tt-file-preview'); let blobUrl = '';
    el.querySelector('input[type=file]').addEventListener('change', async (e) => {
      if (blobUrl) URL.revokeObjectURL(blobUrl); box.innerHTML = '';
      const file = e.target.files[0]; if (!file) return;
      try {
        const type = await checkFile(file); blobUrl = URL.createObjectURL(file);
        box.innerHTML = `${type.mime === 'application/pdf' ? `<iframe src="${blobUrl}" title="Prévisualisation"></iframe>` : `<img class="tt-img" src="${blobUrl}" alt="Prévisualisation">`}<p class="tt-file-name">${esc(file.name)} · ${Math.max(1, Math.round(file.size / 1024))} Ko</p>`;
      } catch (err) { e.target.value = ''; box.innerHTML = `<p class="ui-form-error">${esc(err.message)}</p>`; }
    });
  }
  const FILE_INPUT = input('file', { type: 'file', required: true, accept: '.pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg' });

  function importDoc(classId) {
    const ys = years(); const first = classId ? classes().find((c) => String(c.id) === String(classId)) : classes().find((c) => c.is_current) || classes()[0];
    const yearId = first?.school_year_id ?? ys[0]?.value;
    const clsOpts = (y) => classes().filter((c) => String(c.school_year_id) === String(y)).map((c) => ({ value: c.id, label: c.name }));
    const m = formModal({ title: 'Importer un emploi du temps', size: 'lg', submitLabel: 'Confirmer l’enregistrement',
      fields: `${field('Année scolaire', select('year', ys, yearId, 'required'))}${field('Classe', select('class_id', clsOpts(yearId), first?.id, 'required'))}${field('Titre (facultatif)', input('title', { maxlength: 150, placeholder: 'Ex. Emploi du temps — rentrée' }))}
        ${field('Document (PDF, PNG ou JPG — 5 Mo maximum)', FILE_INPUT)}<div class="tt-file-preview" aria-live="polite"></div><p class="ui-hint">Le document est enregistré en brouillon : vous pourrez ensuite le publier.</p>`,
      onSubmit: async (fd, mm) => {
        const file = fd.get('file'); await checkFile(file);
        const q = new URLSearchParams({ class_id: fd.get('class_id'), title: fd.get('title') || '', name: encodeURIComponent(file.name) });
        await sendFile('POST', `${URL_API}/import?${q}`, file); mm.close(); await reload(); toast('Document enregistré en brouillon. Vous pouvez maintenant le publier.');
      } });
    m.el.querySelector('select[name=year]').addEventListener('change', (e) => { m.el.querySelector('select[name=class_id]').innerHTML = clsOpts(e.target.value).map((o) => `<option value="${o.value}">${esc(o.label)}</option>`).join(''); });
    bindFilePreview(m.el);
  }
  function replaceDoc(id) {
    const t = ttOf(id); if (!t) return;
    const m = formModal({ title: 'Remplacer le document', submitLabel: 'Remplacer', fields: `<p class="ui-hint" style="margin:0">Classe ${esc(t.class_name)} — document actuel : ${esc(t.document_name || '—')}. Si l’emploi du temps est publié, les professeurs verront immédiatement la nouvelle version.</p>${field('Nouveau document (PDF, PNG ou JPG)', FILE_INPUT)}<div class="tt-file-preview"></div>`,
      onSubmit: async (fd, mm) => { const file = fd.get('file'); await checkFile(file); await sendFile('PUT', `${docUrl(id).replace(/\?.*$/, '')}?name=${encodeURIComponent(encodeURIComponent(file.name))}`, file); mm.close(); await reload(); toast('Document remplacé.'); } });
    bindFilePreview(m.el);
  }
  function rename(id) {
    const t = ttOf(id); if (!t) return;
    if (t.kind === 'GRID') return openEditor(id);
    formModal({ title: 'Renommer l’emploi du temps', fields: field('Titre', input('title', { maxlength: 150, value: t.title || '' })),
      onSubmit: async (fd, mm) => { await api(`${URL_API}/${id}`, { method: 'PUT', body: JSON.stringify({ title: fd.get('title') }) }); mm.close(); await reload(); toast('Titre mis à jour.'); } });
  }

  /* ============================== Publication & suppression ============================== */
  async function setStatus(id, action) {
    const t = ttOf(id); if (!t) return;
    const texts = {
      publish: { title: 'Publier cet emploi du temps ?', message: `Les professeurs rattachés à <strong>${esc(t.class_name)}</strong> pourront le consulter immédiatement.${(T.list || []).some((x) => x.class_id === t.class_id && x.status === 'PUBLISHED' && x.id !== t.id) ? ' L’emploi du temps actuellement publié pour cette classe sera archivé.' : ''}`, ok: 'Publier' },
      unpublish: { title: 'Dépublier cet emploi du temps ?', message: 'Il redeviendra un brouillon et disparaîtra de l’espace des professeurs.', ok: 'Dépublier' },
      archive: { title: 'Archiver cet emploi du temps ?', message: 'Il ne sera plus visible par les professeurs.', ok: 'Archiver' }
    }[action];
    if (!(await confirmDialog({ title: texts.title, message: texts.message, confirmText: texts.ok }))) return;
    const r = await api(`${URL_API}/${id}/${action}`, { method: 'POST', body: '{}' }); await reload();
    toast(action === 'publish' ? `Emploi du temps publié${r.teacher_count ? ` — visible par ${r.teacher_count} professeur${r.teacher_count > 1 ? 's' : ''}.` : ' (aucun professeur n’est encore affecté à cette classe).'}` : action === 'unpublish' ? 'Emploi du temps dépublié.' : 'Emploi du temps archivé.');
  }
  async function remove(id) {
    const t = ttOf(id); if (!t) return;
    if (!(await confirmDialog({ title: 'Supprimer cet emploi du temps ?', message: `Suppression définitive de « ${esc(t.title || t.document_name || 'Grille hebdomadaire')} » (${esc(t.class_name)}). Cette action est irréversible.`, confirmText: 'Supprimer', danger: true }))) return;
    await api(`${URL_API}/${id}`, { method: 'DELETE' }); await reload(); toast('Emploi du temps supprimé.');
  }

  /* ============================== Éditeur de grille ============================== */
  async function openEditor(id, classId) {
    if (!T.options) await load();
    if (id) {
      const d = await detail(id); const t = d.timetable;
      const rows = new Map();
      d.sessions.forEach((s) => { const k = `${s.start}-${s.end}`; if (!rows.has(k)) rows.set(k, { start: s.start, end: s.end, sessions: [] }); rows.get(k).sessions.push(s); });
      const slots = [...rows.values()].sort((a, b) => toMinutes(a.start) - toMinutes(b.start)).map((r) => {
        const allBreak = r.sessions.every((s) => s.kind === 'BREAK');
        return { start: r.start, end: r.end, kind: allBreak ? 'BREAK' : 'COURSE', label: allBreak ? (r.sessions[0].subject_name || 'Pause') : '',
          cells: allBreak ? {} : Object.fromEntries(r.sessions.map((s) => [s.day, { kind: s.kind, subject_id: s.subject_id, subject_label: s.subject_name || s.subject_label, teacher_id: s.teacher_id, teacher_label: s.teacher_name || s.teacher_label, room: s.room }])) };
      });
      T.editor = { id, class_id: t.class_id, title: t.title || '', days: t.days.split(',').map(Number), slots: slots.length ? slots : defaultSlots(), assignments: [], status: t.status, label: `${t.class_name} — ${t.school_year}` };
    } else {
      const first = classId ? classes().find((c) => String(c.id) === String(classId)) : classes().find((c) => c.is_current) || classes()[0];
      T.editor = { id: null, class_id: first?.id || '', title: '', days: [...DEFAULT_DAYS], slots: defaultSlots(), assignments: [], status: 'DRAFT', label: '' };
    }
    await loadAssignments(); rerender();
  }
  async function loadAssignments() {
    const E = T.editor; if (!E?.class_id) return;
    try { E.assignments = (await api(`${URL_API}/options?class_id=${encodeURIComponent(E.class_id)}`)).assignments || []; } catch { E.assignments = []; }
  }

  function flatten(E) {
    const out = [];
    for (const s of E.slots) for (const d of E.days) {
      if (s.kind === 'BREAK') out.push({ day: d, kind: 'BREAK', start: s.start, end: s.end, subject_label: s.label || 'Pause' });
      else if (s.cells[d]) out.push({ day: d, kind: s.cells[d].kind || 'COURSE', start: s.start, end: s.end, ...s.cells[d] });
    }
    return out;
  }
  function problems(E) {
    const errs = []; const list = E.slots.map((s, i) => ({ i, s: toMinutes(s.start), e: toMinutes(s.end), s0: s })).filter((x) => { if (x.s === null || x.e === null) { errs.push(`Créneau ${x.i + 1} : horaire invalide.`); return false; } if (x.e <= x.s) { errs.push(`Créneau ${x.i + 1} : l’heure de fin doit être après l’heure de début.`); return false; } return true; });
    list.sort((a, b) => a.s - b.s);
    for (let k = 1; k < list.length; k++) if (list[k].s < list[k - 1].e) errs.push(`Chevauchement : ${list[k - 1].s0.start}–${list[k - 1].s0.end} et ${list[k].s0.start}–${list[k].s0.end}.`);
    if (errs.length) return errs;
    return [...new Set(validateSessions(flatten(E), E.days).errors)];
  }

  function editorView() {
    const E = T.editor; const errs = problems(E);
    const cls = classes(); const cur = cls.find((c) => String(c.id) === String(E.class_id));
    const classOpts = cls.map((c) => ({ value: c.id, label: `${c.name} — ${c.school_year}` }));
    const head = `<div class="tt-ed-top">${btn('Retour', 'tt-ed-cancel', 'chevron-left', 'ghost')}<h1>${E.id ? 'Modifier l’emploi du temps' : 'Créer un emploi du temps'}</h1>${E.id ? badge(STATUS_LABELS[E.status], TONE[E.status]) : ''}</div>`;
    const meta = `<div class="tt-ed-box"><div class="tt-ed-meta">
      <label class="ui-field"><span class="ui-label">Année scolaire</span><input class="ui-input" value="${esc(cur?.school_year || '—')}" disabled></label>
      <label class="ui-field"><span class="ui-label">Classe</span>${select('class_id', classOpts, E.class_id, `data-tt="class" ${E.id ? 'disabled' : ''}`)}</label>
      <label class="ui-field"><span class="ui-label">Titre (facultatif)</span>${input('title', { 'data-tt': 'title', maxlength: 150, value: E.title, placeholder: 'Ex. Emploi du temps — 1er semestre' })}</label></div>
      <div style="margin-top:14px"><span class="ui-label">Jours de cours</span><div class="tt-days" role="group" aria-label="Jours de cours">${DAYS.map((d) => `<label class="tt-day-chip"><input type="checkbox" data-tt="day" data-d="${d.n}" ${E.days.includes(d.n) ? 'checked' : ''}>${esc(d.label)}</label>`).join('')}</div>
      <p class="ui-hint" style="margin:8px 0 0">Les jours non cochés n’ont pas cours.</p></div></div>`;
    const dayCols = E.days.slice().sort((a, b) => a - b);
    const rows = E.slots.map((s, i) => {
      const times = `<th scope="row"><div class="tt-ed-times"><input type="time" data-tt="slot" data-i="${i}" data-f="start" value="${esc(s.start)}" aria-label="Début du créneau ${i + 1}"><input type="time" data-tt="slot" data-i="${i}" data-f="end" value="${esc(s.end)}" aria-label="Fin du créneau ${i + 1}"><button type="button" class="ui-icon-btn tt-icon-danger" data-act="tt-slot-del" data-i="${i}" aria-label="Supprimer le créneau ${i + 1}">${icon('trash')}</button></div></th>`;
      if (s.kind === 'BREAK') return `<tr class="tt-ed-break">${times}<td colspan="${dayCols.length}"><input type="text" data-tt="slot" data-i="${i}" data-f="label" value="${esc(s.label)}" maxlength="100" placeholder="Récréation, pause déjeuner…" aria-label="Nom de la pause"></td></tr>`;
      return `<tr>${times}${dayCols.map((d) => { const c = s.cells[d]; return `<td><button type="button" class="tt-ed-cell ${c ? 'is-filled' : ''}" data-act="tt-cell" data-i="${i}" data-d="${d}" aria-label="${esc(dayName(d))} ${esc(s.start)} : ${c ? esc(c.subject_label) : 'ajouter un cours'}">${c ? `<strong>${esc(c.subject_label)}</strong>${c.teacher_label ? `<small>${esc(c.teacher_label)}</small>` : ''}${c.room ? `<small>Salle ${esc(c.room)}</small>` : ''}` : `${icon('plus')} <span>Libre</span>`}</button></td>`; }).join('')}</tr>`;
    }).join('');
    const table = `<div class="tt-ed-box"><div class="tt-ed-wrap"><table class="tt-ed-table"><thead><tr><th>Créneau</th>${dayCols.map((d) => `<th>${esc(dayName(d))}</th>`).join('')}</tr></thead><tbody>${rows || `<tr><td colspan="${dayCols.length + 1}"><p class="tt-none">Ajoutez un créneau pour commencer.</p></td></tr>`}</tbody></table></div>
      <div class="tt-ed-tools">${btn('Ajouter un créneau de cours', 'tt-slot-add', 'plus', 'ghost')}${btn('Ajouter une pause', 'tt-break-add', 'clock', 'ghost')}</div></div>`;
    const status = errs.length ? `<ul class="tt-ed-errors" role="alert">${errs.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>` : `<p class="tt-ed-ok">${icon('circle-check')} Aucun chevauchement ni horaire incohérent détecté.</p>`;
    const bar = `<div class="tt-ed-bar">${btn('Annuler', 'tt-ed-cancel', '', 'ghost')}${btn('Aperçu', 'tt-ed-preview', 'eye', 'ghost')}${btn('Enregistrer', 'tt-ed-save', 'circle-check', 'ghost', errs.length ? 'disabled' : '')}${can('timetable.publish') ? btn('Enregistrer et publier', 'tt-ed-save-publish', 'send', 'primary', errs.length ? 'disabled' : '') : ''}</div>`;
    return `<div class="tt-editor">${head}${meta}${table}${status}${bar}</div>`;
  }

  function cellModal(i, d) {
    const E = T.editor; const slot = E.slots[i]; const cur = slot.cells[d] || {};
    const subjects = T.options.subjects; const teachers = T.options.teachers;
    const assigned = E.assignments.filter((a) => a.subject_id); const assignedIds = new Set(assigned.map((a) => Number(a.subject_id)));
    const opt = (v, l, sel) => `<option value="${esc(v)}" ${String(v) === String(sel) ? 'selected' : ''}>${esc(l)}</option>`;
    const subjectSel = `<select class="ui-input" name="subject_id" required><option value="">— Choisir une matière —</option>${assigned.length ? `<optgroup label="Matières de cette classe">${[...new Map(assigned.map((a) => [a.subject_id, a])).values()].map((a) => opt(a.subject_id, a.subject_name, cur.subject_id)).join('')}</optgroup>` : ''}<optgroup label="Autres matières">${subjects.filter((s) => !assignedIds.has(Number(s.id))).map((s) => opt(s.id, s.name, cur.subject_id)).join('')}</optgroup></select>`;
    const teacherSel = `<select class="ui-input" name="teacher_id"><option value="">— Aucun / non précisé —</option>${teachers.map((t) => opt(t.id, t.full_name, cur.teacher_id)).join('')}</select>`;
    const m = formModal({ title: `${dayName(d)} · ${slot.start} – ${slot.end}`, submitLabel: 'Valider', extraFooter: cur.subject_label ? '<button type="button" class="ui-btn ui-btn--ghost tt-icon-danger" data-clear>Retirer</button>' : '',
      fields: `${field('Matière', subjectSel)}${field('Professeur', teacherSel)}${field('Salle (facultatif)', input('room', { maxlength: 40, value: cur.room || '', placeholder: 'Ex. Salle 12' }))}`,
      onSubmit: async (fd, mm) => {
        const sid = Number(fd.get('subject_id')); const tid = fd.get('teacher_id') ? Number(fd.get('teacher_id')) : null;
        const s = subjects.find((x) => Number(x.id) === sid); const t = teachers.find((x) => Number(x.id) === tid);
        slot.cells[d] = { kind: 'COURSE', subject_id: sid, subject_label: s?.name || '', teacher_id: tid, teacher_label: t?.full_name || '', room: String(fd.get('room') || '').trim() };
        mm.close(); rerender();
      } });
    const subjSelect = m.el.querySelector('select[name=subject_id]'), teachSelect = m.el.querySelector('select[name=teacher_id]');
    subjSelect.addEventListener('change', () => { const a = assigned.find((x) => String(x.subject_id) === subjSelect.value && x.teacher_id); if (a && !teachSelect.value) teachSelect.value = String(a.teacher_id); });
    m.el.querySelector('[data-clear]')?.addEventListener('click', () => { delete slot.cells[d]; m.close(); rerender(); });
  }

  async function save(publish) {
    const E = T.editor; const errs = problems(E); if (errs.length) { toast(errs[0], 'error'); return; }
    const payload = { class_id: Number(E.class_id), title: E.title, days: E.days, sessions: flatten(E) };
    if (!payload.class_id) { toast('Choisissez une classe.', 'error'); return; }
    const r = await api(E.id ? `${URL_API}/${E.id}` : URL_API, { method: E.id ? 'PUT' : 'POST', body: JSON.stringify(payload) });
    const id = E.id || r.id;
    if (publish) { const p = await api(`${URL_API}/${id}/publish`, { method: 'POST', body: '{}' }); toast(`Emploi du temps publié${p.teacher_count ? ` — visible par ${p.teacher_count} professeur${p.teacher_count > 1 ? 's' : ''}.` : '.'}`); }
    else toast('Emploi du temps enregistré en brouillon.');
    T.editor = null; await reload();
  }

  function previewEditor() {
    const E = T.editor; const errs = problems(E); if (errs.length) { toast(errs[0], 'error'); return; }
    const cur = classes().find((c) => String(c.id) === String(E.class_id));
    const sessions = flatten(E).map((s) => ({ ...s, subject_name: s.subject_label, teacher_name: s.teacher_label }));
    modal({ title: `Aperçu — ${cur?.name || ''}`, size: 'xl', body: `<div class="tt-wrap">${gridHtml(buildGrid(sessions, E.days))}</div>`, footer: '<button type="button" class="ui-btn ui-btn--ghost" data-close>Fermer</button>' });
  }

  /* ============================== Actions & événements ============================== */
  const acts = {
    'tt-new': (d) => openEditor(null, d.class),
    'tt-import': (d) => importDoc(d.class),
    'tt-preview': (d) => preview(d.id), 'tt-edit': (d) => rename(d.id), 'tt-replace': (d) => replaceDoc(d.id), 'tt-print': (d) => print(d.id),
    'tt-publish': (d) => setStatus(d.id, 'publish'), 'tt-unpublish': (d) => setStatus(d.id, 'unpublish'), 'tt-archive': (d) => setStatus(d.id, 'archive'), 'tt-delete': (d) => remove(d.id),
    'tt-ed-cancel': () => { T.editor = null; rerender(); },
    'tt-ed-preview': previewEditor, 'tt-ed-save': () => save(false), 'tt-ed-save-publish': () => save(true),
    'tt-slot-add': () => { const last = T.editor.slots.at(-1); const s = last ? last.end : '08:00'; const e = toMinutes(s) + 120; T.editor.slots.push({ start: s, end: `${String(Math.min(Math.floor(e / 60), 20)).padStart(2, '0')}:${String(e % 60).padStart(2, '0')}`, kind: 'COURSE', label: '', cells: {} }); rerender(); },
    'tt-break-add': () => { const last = T.editor.slots.at(-1); const s = last ? last.end : '10:00'; const e = toMinutes(s) + 15; T.editor.slots.push({ start: s, end: `${String(Math.floor(e / 60)).padStart(2, '0')}:${String(e % 60).padStart(2, '0')}`, kind: 'BREAK', label: 'Récréation', cells: {} }); rerender(); },
    'tt-slot-del': (d) => { T.editor.slots.splice(Number(d.i), 1); rerender(); },
    'tt-cell': (d) => cellModal(Number(d.i), Number(d.d))
  };

  document.addEventListener('input', (e) => {
    const f = e.target.closest('[data-tt-filter]'); if (!f || T.editor) return;
    T.ui[f.dataset.ttFilter] = f.value; const list = $('tt-list'); if (list) list.innerHTML = listHtml();
  });
  document.addEventListener('change', async (e) => {
    const f = e.target.closest('[data-tt-filter]'); if (f && !T.editor) { T.ui[f.dataset.ttFilter] = f.value; const list = $('tt-list'); if (list) list.innerHTML = listHtml(); return; }
    const el = e.target.closest('[data-tt]'); const E = T.editor; if (!el || !E) return;
    const k = el.dataset.tt;
    if (k === 'title') E.title = el.value;
    else if (k === 'class') { E.class_id = el.value; await loadAssignments(); }
    else if (k === 'day') { const d = Number(el.dataset.d); E.days = el.checked ? [...new Set([...E.days, d])] : E.days.filter((x) => x !== d); if (!E.days.length) { E.days = [d]; toast('Au moins un jour de cours est requis.', 'info'); } }
    else if (k === 'slot') { const s = E.slots[Number(el.dataset.i)]; if (s) s[el.dataset.f] = el.value; if (el.dataset.f !== 'label') E.slots.sort((a, b) => (toMinutes(a.start) ?? 0) - (toMinutes(b.start) ?? 0)); }
    rerender();
  });

  return { render, acts, show: () => can('timetable.view') };
}
