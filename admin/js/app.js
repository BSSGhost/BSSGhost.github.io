/* SUNU MOYENNE — Administration (interface premium)
   Toute la donnée provient des API /api/admin/* existantes. Aucune donnée fictive.
   Les permissions sont appliquées côté interface ET côté serveur (le serveur reste l'autorité). */
import { icon } from './icons.js';
import { $, esc, norm, debounce, initials, fmtDate, fmtDateTime, relTime, badge, statusBadge, empty, skeleton, paginate, pager, toast, modal, confirmDialog, formModal, field, input, select, barChart } from './ui.js';

/* ============================== État & API ============================== */
const S = { user: null, loaded: false, route: 'accueil', lastBackup: null,
  ui: {
    students: { q: '', cls: '', year: '', status: '', page: 1 },
    teachers: { q: '', status: '', page: 1 },
    classes: { q: '', year: '', status: '', page: 1 },
    subjects: { q: '', status: '', page: 1 },
    assignments: { cls: '', term: '', page: 1 },
    results: { cls: '', term: '', data: null, page: 1 },
    logs: { q: '', actor: '', type: '', page: 1 }
  } };
const D = {};
const can = (p) => S.user?.permissions?.includes(p) || false;
const isPrincipal = () => S.user?.role_name === 'principal';
const roleLabel = (r) => (r === 'principal' ? 'Administrateur principal' : 'Administrateur pédagogique');

async function api(path, options = {}) {
  const response = await fetch(path, { credentials: 'same-origin', ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  let data = {}; try { data = await response.json(); } catch {}
  if (!response.ok) {
    if (response.status === 401 && S.user && !/\/api\/admin\/(login|me)$/.test(path)) sessionExpired();
    const error = new Error(data.message || data.error || `Erreur ${response.status}`); error.code = data.error; throw error;
  }
  return data;
}
function show(id) { ['login', 'change', 'dashboard'].forEach((key) => $(key).classList.toggle('hidden', key !== id)); document.body.classList.toggle('is-app', id === 'dashboard'); }
function sessionExpired() { S.user = null; show('login'); toast('Votre session a expiré. Veuillez vous reconnecter.', 'info'); }

const LOADERS = {
  overview: { ok: () => true, url: '/api/admin/overview', pick: (d) => d.stats },
  years: { ok: () => can('classes.view'), url: '/api/admin/school-years', pick: (d) => d.school_years },
  classes: { ok: () => can('classes.view'), url: '/api/admin/classes', pick: (d) => d.classes },
  students: { ok: () => can('students.view'), url: '/api/admin/students', pick: (d) => d.students },
  teachers: { ok: () => can('teachers.view'), url: '/api/admin/teachers', pick: (d) => d.teachers },
  subjects: { ok: () => can('subjects.view'), url: '/api/admin/subjects', pick: (d) => d.subjects },
  terms: { ok: () => can('subjects.view'), url: '/api/admin/terms', pick: (d) => d.terms },
  assignments: { ok: () => can('subjects.view'), url: '/api/admin/class-subjects', pick: (d) => d.assignments },
  users: { ok: () => isPrincipal(), url: '/api/admin/users', pick: (d) => d.users },
  logs: { ok: () => isPrincipal(), url: '/api/admin/audit/logs', pick: (d) => d.logs },
  timetables: { ok: () => can('timetable.view'), url: '/api/admin/timetables', pick: (d) => d.timetables }
};
async function loadAll() {
  const keys = Object.keys(LOADERS).filter((k) => LOADERS[k].ok());
  const res = await Promise.allSettled(keys.map(async (k) => { D[k] = LOADERS[k].pick(await api(LOADERS[k].url)); }));
  S.loaded = true;
  const failed = res.filter((r) => r.status === 'rejected');
  if (failed.length) toast('Certaines données n’ont pas pu être chargées. Vérifiez les permissions et le schéma MySQL.', 'error');
}
async function mutate(fn, successMsg) { await fn(); await loadAll(); renderRoute(false); if (successMsg) toast(successMsg); }

/* ============================== Navigation ============================== */
const ROUTES = {
  accueil: { title: 'Vue générale', icon: 'layout-dashboard', group: 'PRINCIPAL', show: () => true, render: vOverview },
  annees: { title: 'Années scolaires', icon: 'calendar-days', group: 'GESTION SCOLAIRE', show: () => can('settings.edit') || can('classes.view'), render: vYears },
  eleves: { title: 'Élèves', icon: 'graduation-cap', group: 'GESTION SCOLAIRE', show: () => can('students.view'), render: vStudents, list: lStudents },
  professeurs: { title: 'Professeurs', icon: 'presentation', group: 'GESTION SCOLAIRE', show: () => can('teachers.view'), render: vTeachers, list: lTeachers },
  classes: { title: 'Classes', icon: 'school', group: 'GESTION SCOLAIRE', show: () => can('classes.view'), render: vClasses, list: lClasses },
  matieres: { title: 'Matières', icon: 'book-open', group: 'GESTION PÉDAGOGIQUE', show: () => can('subjects.view'), render: vSubjects, list: lSubjects },
  affectations: { title: 'Affectations', icon: 'link', group: 'GESTION PÉDAGOGIQUE', show: () => can('subjects.view'), render: vAssignments, list: lAssignments },
  emplois_du_temps: { title: 'Emplois du temps', icon: 'calendar-range', group: 'GESTION PÉDAGOGIQUE', show: () => can('timetable.view'), render: vTimetables },
  resultats: { title: 'Résultats et moyennes', icon: 'bar-chart', group: 'GESTION PÉDAGOGIQUE', show: () => can('reports.view') || can('grades.view'), render: vResults, list: lResults },
  administrateurs: { title: 'Administrateurs', icon: 'shield-check', group: 'ADMINISTRATION', show: isPrincipal, render: vAdmins },
  journal: { title: 'Journal d’activité', icon: 'scroll-text', group: 'ADMINISTRATION', show: isPrincipal, render: vLogs, list: lLogs },
  sauvegardes: { title: 'Sauvegardes', icon: 'database', group: 'ADMINISTRATION', show: isPrincipal, render: vBackups },
  compte: { title: 'Mon compte', icon: 'circle-user', group: 'COMPTE', show: () => true, render: vAccount }
};
const GROUPS = ['PRINCIPAL', 'GESTION SCOLAIRE', 'GESTION PÉDAGOGIQUE', 'ADMINISTRATION', 'COMPTE'];

function buildNav() {
  $('nav').innerHTML = GROUPS.map((g) => {
    const items = Object.entries(ROUTES).filter(([, r]) => r.group === g && r.show());
    if (!items.length) return '';
    return `<div class="ui-nav-group"><p class="ui-nav-label">${g}</p>${items.map(([k, r]) => `<a class="ui-nav-item" href="#/${k}" data-route="${k}" title="${esc(r.title)}">${icon(r.icon)}<span>${esc(r.title)}</span></a>`).join('')}${g === 'COMPTE' ? `<button type="button" class="ui-nav-item" data-act="logout" title="Déconnexion">${icon('log-out')}<span>Déconnexion</span></button>` : ''}</div>`;
  }).join('');
}
function currentRouteName() { const n = location.hash.replace(/^#\/?/, '').split('?')[0] || 'accueil'; return ROUTES[n]?.show() ? n : 'accueil'; }
function go(name) { const target = `#/${name}`; if (location.hash === target) renderRoute(); else location.hash = target; }
function renderRoute(animate = true) {
  if (!S.user) return;
  const name = currentRouteName(); const r = ROUTES[name]; S.route = name;
  const view = $('view'); const scroll = window.scrollY;
  view.innerHTML = r.render();
  if (animate) { view.classList.remove('is-entering'); void view.offsetWidth; view.classList.add('is-entering'); window.scrollTo(0, 0); }
  else window.scrollTo(0, scroll);
  document.querySelectorAll('.ui-nav-item[data-route]').forEach((a) => a.classList.toggle('is-active', a.dataset.route === name));
  $('crumb').textContent = r.title; document.title = `${r.title} — SUNU MOYENNE`;
  document.body.classList.remove('sb-open'); renderBell();
}
function refreshList() { const r = ROUTES[S.route]; if (r?.list) $('list').innerHTML = r.list(); }

/* ============================== Helpers de vues ============================== */
const need = (fn) => (S.loaded ? fn() : skeleton(5));
const pageHead = (title, sub, actions = '') => `<header class="ui-page-head"><div><h1>${esc(title)}</h1>${sub ? `<p>${esc(sub)}</p>` : ''}</div><div class="ui-page-actions">${actions}</div></header>`;
const btn = (label, act, ic, cls = 'primary', data = '') => `<button type="button" class="ui-btn ui-btn--${cls}" data-act="${act}" ${data}>${ic ? icon(ic) : ''}<span>${esc(label)}</span></button>`;
const menu = (items) => `<div class="ui-menu"><button type="button" class="ui-icon-btn" data-act="menu" aria-label="Actions" aria-haspopup="true">${icon('ellipsis')}</button><div class="ui-menu-list" role="menu">${items.filter(Boolean).map((i) => `<button type="button" role="menuitem" class="ui-menu-item ${i.danger ? 'is-danger' : ''}" data-act="${i.act}" ${Object.entries(i.data || {}).map(([k, v]) => `data-${k}="${esc(v)}"`).join(' ')}>${icon(i.icon)}<span>${esc(i.label)}</span></button>`).join('')}</div></div>`;
function filterBar(view, selects = []) {
  const f = S.ui[view];
  return `<div class="ui-filters"><label class="ui-search">${icon('search')}<input type="search" data-filter="${view}.q" value="${esc(f.q)}" placeholder="Rechercher…" aria-label="Rechercher"></label>${selects.map((s) => `<select class="ui-input ui-filter-select" data-filter="${view}.${s.key}" aria-label="${esc(s.label)}">${[{ value: '', label: s.all }, ...s.options].map((o) => `<option value="${esc(o.value)}" ${String(o.value) === String(f[s.key]) ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>`).join('')}</div>`;
}
const STATUS_OPTS = [{ value: 'active', label: 'Actifs' }, { value: 'inactive', label: 'Inactifs' }];
const byStatus = (rows, st) => (st === 'active' ? rows.filter((r) => r.is_active) : st === 'inactive' ? rows.filter((r) => !r.is_active) : rows);
const cur = () => (D.years || []).find((y) => y.is_current);
const activeClasses = () => (D.classes || []).filter((c) => c.is_active);
const classLabel = (c) => `${c.name} — ${c.school_year}`;
const GENDER = { M: 'Garçon', F: 'Fille', OTHER: 'Autre', UNSPECIFIED: 'Non précisé' };

/* ============================== Alertes ============================== */
function computeAlerts() {
  const a = [];
  if (D.years && !cur()) a.push({ tone: 'orange', ic: 'calendar-days', title: 'Aucune année scolaire en cours', text: 'Définissez une année en cours pour inscrire des élèves.', route: 'annees' });
  const pending = (D.teachers || []).filter((t) => t.is_active && t.must_change_password).length;
  if (pending) a.push({ tone: 'blue', ic: 'key-round', title: `${pending} compte${pending > 1 ? 's' : ''} professeur à finaliser`, text: 'Mot de passe temporaire non encore changé.', route: 'professeurs' });
  const noStudents = activeClasses().filter((c) => Number(c.student_count) === 0).length;
  if (noStudents) a.push({ tone: 'orange', ic: 'school', title: `${noStudents} classe${noStudents > 1 ? 's' : ''} sans élève`, text: 'Aucune inscription active dans ces classes.', route: 'classes' });
  const noTeacher = (D.assignments || []).filter((x) => !x.teacher_name).length;
  if (noTeacher) a.push({ tone: 'orange', ic: 'link', title: `${noTeacher} affectation${noTeacher > 1 ? 's' : ''} sans professeur`, text: 'Attribuez un professeur pour permettre la saisie des notes.', route: 'affectations' });
  const noClass = (D.students || []).filter((s) => s.is_active && !s.class_id).length;
  if (noClass) a.push({ tone: 'red', ic: 'graduation-cap', title: `${noClass} élève${noClass > 1 ? 's' : ''} sans classe`, text: 'Ces élèves actifs n’ont pas d’inscription active.', route: 'eleves' });
  return a.filter((x) => ROUTES[x.route]?.show());
}
function renderBell() {
  const alerts = computeAlerts();
  $('bell-count').textContent = alerts.length; $('bell-count').classList.toggle('hidden', !alerts.length);
  $('bell-list').innerHTML = alerts.length ? alerts.map((x) => `<button type="button" class="ui-alert ui-alert--${x.tone}" data-act="goto" data-route-name="${x.route}">${icon(x.ic)}<span><strong>${esc(x.title)}</strong><small>${esc(x.text)}</small></span></button>`).join('') : `<p class="ui-pop-empty">${icon('circle-check')}Aucune alerte pour le moment.</p>`;
}

/* ============================== Journal : libellés ============================== */
const ACTIONS = {
  login: ['Connexion', 'key-round', 'connexion'], password_changed: ['Mot de passe modifié', 'lock', 'securite', true],
  school_year_created: ['Année scolaire créée', 'calendar-days', 'creation', true], class_created: ['Classe créée', 'school', 'creation'], class_updated: ['Classe modifiée', 'school', 'modification'],
  student_created: ['Élève ajouté', 'user-plus', 'creation'], student_updated: ['Fiche élève modifiée', 'graduation-cap', 'modification'],
  teacher_created: ['Compte professeur créé', 'presentation', 'creation', true], teacher_updated: ['Professeur modifié', 'presentation', 'modification'],
  subject_created: ['Matière créée', 'book-open', 'creation'], subject_updated: ['Matière modifiée', 'book-open', 'modification'], class_subject_assigned: ['Affectation enregistrée', 'link', 'creation']
};
function describe(log) {
  const base = ACTIONS[log.action] || [String(log.action || 'Action').replace(/_/g, ' '), 'activity', 'autre'];
  let d = log.details; try { if (typeof d === 'string') d = JSON.parse(d); } catch { d = null; }
  let label = base[0]; let important = Boolean(base[3]);
  if (d && d.is_active === false) { label += ' (désactivation)'; important = true; } else if (d && d.is_active === true) label += ' (réactivation)';
  return { label, icon: base[1], cat: base[2], important };
}

/* ============================== VUE : Accueil ============================== */
function vOverview() {
  const first = String(S.user.full_name || '').split(/\s+/)[0] || '';
  const hello = new Date().getHours() < 18 ? 'Bonjour' : 'Bonsoir';
  const date = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const head = `<section class="ui-hero"><div><p class="ui-eyebrow">${esc(date.charAt(0).toUpperCase() + date.slice(1))}</p><h1>${hello}, ${esc(first)}</h1><p>${esc(roleLabel(S.user.role_name))} · ${esc(S.user.email || '')}</p></div></section>`;
  return head + need(() => {
    const st = D.overview || {}; const y = cur(); const ac = activeClasses();
    const subj = D.subjects ? D.subjects.filter((s) => s.is_active).length : null;
    const pending = D.teachers ? D.teachers.filter((t) => t.is_active && t.must_change_password).length : null;
    const avg = ac.length ? Math.round(ac.reduce((n, c) => n + Number(c.student_count), 0) / ac.length) : null;
    const v = (x) => (x === undefined || x === null ? '—' : x);
    const cards = [
      { ic: 'graduation-cap', label: 'Élèves', val: v(st.students), sub: avg !== null ? `≈ ${avg} élèves par classe` : 'Élèves actifs', route: 'eleves' },
      { ic: 'presentation', label: 'Professeurs', val: v(st.teachers), sub: pending === null ? 'Comptes actifs' : pending ? `${pending} à finaliser` : 'Tous les comptes configurés', route: 'professeurs' },
      { ic: 'school', label: 'Classes', val: v(st.classes), sub: D.years ? `Année ${y ? y.label : 'non définie'}` : 'Classes actives', route: 'classes' },
      { ic: 'book-open', label: 'Matières', val: v(subj), sub: D.assignments ? `${D.assignments.length} affectation${D.assignments.length > 1 ? 's' : ''}` : 'Matières actives', route: 'matieres' },
      { ic: 'calendar-days', label: 'Année scolaire active', val: y ? y.label : D.years ? 'Aucune' : v(st.school_years), small: true, sub: y ? `${fmtDate(y.starts_on)} → ${fmtDate(y.ends_on)}` : D.years ? 'Aucune année en cours' : 'Années actives', route: 'annees' }
    ].map((c, i) => `<${ROUTES[c.route].show() ? `a href="#/${c.route}"` : 'div'} class="ui-stat" style="--d:${i * 60}ms"><span class="ui-stat-ic">${icon(c.ic)}</span><span class="ui-stat-label">${c.label}</span><strong class="ui-stat-val ${c.small ? 'is-small' : ''}">${esc(c.val)}</strong><span class="ui-stat-sub">${esc(c.sub)}</span></${ROUTES[c.route].show() ? 'a' : 'div'}>`).join('');

    const byYear = {}; (D.classes || []).forEach((c) => { byYear[c.school_year] = (byYear[c.school_year] || 0) + Number(c.student_count); });
    const years = Object.keys(byYear).sort();
    const chart = !D.classes ? empty('bar-chart', 'Données indisponibles', 'Vos droits ne permettent pas de consulter les classes.')
      : years.length ? barChart(years.map((l) => ({ label: l, value: byYear[l] }))) + (years.length < 2 ? '<p class="ui-hint">Une seule année enregistrée : l’évolution apparaîtra avec les prochaines années scolaires.</p>' : '')
      : empty('bar-chart', 'Aucun effectif', 'Les effectifs apparaîtront dès que des élèves seront inscrits.');

    const pool = (y ? ac.filter((c) => c.school_year_id === y.id) : ac).sort((a, b) => b.student_count - a.student_count).slice(0, 8);
    const maxC = Math.max(1, ...pool.map((c) => Number(c.student_count)));
    const dist = !D.classes ? empty('school', 'Données indisponibles') : pool.length ? `<ul class="ui-dist">${pool.map((c) => `<li><span class="ui-dist-name">${esc(c.name)}</span><span class="ui-dist-bar"><i style="width:${Math.round((Number(c.student_count) / maxC) * 100)}%"></i></span><b>${esc(c.student_count)}</b></li>`).join('')}</ul>` : empty('school', 'Aucune classe active', 'Créez une classe pour voir la répartition.');

    const acts = !isPrincipal() ? empty('scroll-text', 'Journal réservé', 'Le journal d’activité est réservé à l’administrateur principal.')
      : D.logs?.length ? `<ul class="ui-feed">${D.logs.slice(0, 6).map((l) => { const d = describe(l); return `<li>${`<span class="ui-feed-ic">${icon(d.icon)}</span>`}<div><strong>${esc(d.label)}</strong><small>${esc(l.admin_name || 'Compte supprimé')} · ${esc(relTime(l.created_at))}</small></div></li>`; }).join('')}</ul>` : empty('scroll-text', 'Aucune activité récente');
    const alerts = computeAlerts();
    const alertsHtml = alerts.length ? alerts.map((x) => `<button type="button" class="ui-alert ui-alert--${x.tone}" data-act="goto" data-route-name="${x.route}">${icon(x.ic)}<span><strong>${esc(x.title)}</strong><small>${esc(x.text)}</small></span></button>`).join('') : `<div class="ui-alert ui-alert--green">${icon('circle-check')}<span><strong>Tout est en ordre</strong><small>Aucune alerte détectée sur les données actuelles.</small></span></div>`;
    const sc = [
      can('students.create') && activeClasses().length && ['student-new', 'user-plus', 'Ajouter un élève'], can('classes.create') && ['class-new', 'school', 'Créer une classe'],
      can('teachers.create') && ['teacher-new', 'presentation', 'Ajouter un professeur'], can('subjects.create') && ['subject-new', 'book-open', 'Nouvelle matière'],
      can('subjects.edit') && ['assign-new', 'link', 'Affecter une matière'], ROUTES.resultats.show() && ['goto', 'bar-chart', 'Consulter les résultats', 'resultats'],
      isPrincipal() && ['backup-go', 'database', 'Sauvegarde']
    ].filter(Boolean);
    const shortcuts = sc.length ? `<div class="ui-shortcuts">${sc.map(([act, ic, label, r]) => `<button type="button" class="ui-shortcut" data-act="${act === 'backup-go' ? 'goto' : act}" ${r ? `data-route-name="${r}"` : ''} ${act === 'backup-go' ? 'data-route-name="sauvegardes"' : ''}>${icon(ic)}<span>${label}</span></button>`).join('')}</div>` : empty('inbox', 'Aucun raccourci disponible pour votre rôle');
    return `<div class="ui-stats">${cards}</div>
      <div class="ui-grid ui-grid--2"><section class="ui-card"><h2>Effectifs par année scolaire</h2><p class="ui-card-sub">Élèves inscrits, toutes classes confondues</p>${chart}</section>
      <section class="ui-card"><div class="ui-card-top"><div><h2>Répartition par classe</h2><p class="ui-card-sub">${y ? `Année ${esc(y.label)}` : 'Classes actives'}</p></div></div>${dist}</section></div>
      <div class="ui-grid ui-grid--3"><section class="ui-card"><h2>Activités récentes</h2><p class="ui-card-sub">Dernières actions enregistrées</p>${acts}</section>
      <section class="ui-card"><h2>Alertes et informations</h2><p class="ui-card-sub">Calculées à partir de vos données</p><div class="ui-alerts">${alertsHtml}</div></section>
      <section class="ui-card"><h2>Raccourcis</h2><p class="ui-card-sub">Opérations fréquentes</p>${shortcuts}</section></div>`;
  });
}

/* ============================== VUE : Années scolaires ============================== */
function vYears() {
  return pageHead('Années scolaires', 'Cycles scolaires et année en cours', can('settings.edit') ? btn('Nouvelle année', 'year-new', 'plus') : '') + need(() => {
    if (!D.years) return empty('calendar-days', 'Liste indisponible', 'Vos droits ne permettent pas de consulter les années existantes.');
    if (!D.years.length) return empty('calendar-days', 'Aucune année scolaire', 'Créez la première année pour commencer.', can('settings.edit') ? btn('Créer une année', 'year-new', 'plus') : '');
    return `<div class="ui-cards">${D.years.map((y, i) => {
      const cl = (D.classes || []).filter((c) => c.school_year_id === y.id); const n = cl.reduce((s, c) => s + Number(c.student_count), 0);
      return `<article class="ui-card ui-year ${y.is_current ? 'is-current' : ''}" style="--d:${i * 50}ms"><div class="ui-card-top"><h2>${esc(y.label)}</h2>${y.is_current ? badge('En cours', 'green') : y.is_active ? badge('Active', 'blue') : badge('Inactive', 'neutral')}</div>
        <p class="ui-card-sub">${esc(fmtDate(y.starts_on))} → ${esc(fmtDate(y.ends_on))}</p>
        <dl class="ui-kv"><div><dt>Classes</dt><dd>${cl.length}</dd></div><div><dt>Élèves inscrits</dt><dd>${n}</dd></div></dl>
        <div class="ui-card-foot">${btn('Consulter', 'year-view', 'eye', 'ghost', `data-id="${y.id}"`)}</div></article>`;
    }).join('')}</div>`;
  });
}
function yearView(id) {
  const y = (D.years || []).find((x) => String(x.id) === String(id)); if (!y) return;
  const cl = (D.classes || []).filter((c) => c.school_year_id === y.id);
  modal({ title: `Année ${y.label}`, size: 'md', body: `<dl class="ui-kv ui-kv--row"><div><dt>Statut</dt><dd>${y.is_current ? 'En cours' : y.is_active ? 'Active' : 'Inactive'}</dd></div><div><dt>Début</dt><dd>${esc(fmtDate(y.starts_on))}</dd></div><div><dt>Fin</dt><dd>${esc(fmtDate(y.ends_on))}</dd></div></dl><h3 class="ui-sub-title">Classes (${cl.length})</h3>${cl.length ? `<ul class="ui-list">${cl.map((c) => `<li><span>${esc(c.name)} ${c.level ? `<small>${esc(c.level)}</small>` : ''}</span><b>${esc(c.student_count)} élève${c.student_count > 1 ? 's' : ''}</b></li>`).join('')}</ul>` : empty('school', 'Aucune classe pour cette année')}` });
}
function yearNew() {
  formModal({ title: 'Nouvelle année scolaire', submitLabel: 'Créer l’année',
    fields: `${field('Année (ex. 2026-2027)', input('label', { required: true, pattern: '[0-9]{4}[-/][0-9]{4}', placeholder: '2026-2027' }))}<div class="ui-row">${field('Début', input('starts_on', { type: 'date' }))}${field('Fin', input('ends_on', { type: 'date' }))}</div><label class="ui-check"><input type="checkbox" name="is_current"><span>Définir comme année en cours</span></label>`,
    onSubmit: async (fd, m) => {
      const isCurrent = fd.get('is_current') === 'on';
      if (isCurrent && cur() && !(await confirmDialog({ title: 'Changer l’année en cours ?', message: `L’année <strong>${esc(cur().label)}</strong> ne sera plus l’année en cours.`, confirmText: 'Continuer' }))) return;
      await api('/api/admin/school-years', { method: 'POST', body: JSON.stringify({ label: fd.get('label'), starts_on: fd.get('starts_on') || null, ends_on: fd.get('ends_on') || null, is_current: isCurrent }) });
      m.close(); await mutate(async () => {}, 'Année scolaire créée.');
    } });
}

/* ============================== VUE : Élèves ============================== */
function vStudents() {
  const f = S.ui.students;
  return pageHead('Élèves', 'Dossiers et inscriptions', can('students.create') && activeClasses().length ? btn('Ajouter un élève', 'student-new', 'plus') : '') + need(() => `${filterBar('students', [
    { key: 'cls', label: 'Classe', all: 'Toutes les classes', options: activeClasses().map((c) => ({ value: c.id, label: classLabel(c) })) },
    { key: 'year', label: 'Année', all: 'Toutes les années', options: (D.years || []).map((y) => ({ value: y.label, label: y.label })) },
    { key: 'status', label: 'Statut', all: 'Tous les statuts', options: STATUS_OPTS }])}<div id="list">${lStudents()}</div>`);
}
function lStudents() {
  if (!S.loaded) return '';
  const f = S.ui.students; const q = norm(f.q);
  let rows = byStatus(D.students || [], f.status);
  if (f.cls) rows = rows.filter((s) => String(s.class_id) === String(f.cls));
  if (f.year) rows = rows.filter((s) => s.school_year === f.year);
  if (q) rows = rows.filter((s) => norm(`${s.first_name} ${s.last_name} ${s.matricule}`).includes(q));
  const pg = paginate(rows, f.page); f.page = pg.page;
  if (!rows.length) return empty('graduation-cap', 'Aucun élève trouvé', (D.students || []).length ? 'Modifiez vos filtres ou votre recherche.' : 'Ajoutez le premier élève pour commencer.');
  return `<div class="ui-table-card"><table class="ui-table"><thead><tr><th>Élève</th><th>Classe</th><th>Année</th><th>Statut</th><th class="ui-th-act"><span class="sr-only">Actions</span></th></tr></thead><tbody>${pg.items.map((s) => `<tr><td data-label="Élève"><button type="button" class="ui-person" data-act="student-view" data-id="${s.id}"><span class="ui-avatar">${esc(initials(`${s.first_name} ${s.last_name}`))}</span><span><strong>${esc(s.first_name)} ${esc(s.last_name)}</strong><small>${esc(s.matricule)}</small></span></button></td><td data-label="Classe">${esc(s.class_name || '—')}</td><td data-label="Année">${esc(s.school_year || '—')}</td><td data-label="Statut">${statusBadge(s.is_active)}</td><td class="ui-td-act">${menu([{ act: 'student-view', label: 'Voir la fiche', icon: 'eye', data: { id: s.id } }, can('students.edit') && { act: 'student-edit', label: 'Modifier', icon: 'pencil', data: { id: s.id } }, can('students.edit') && { act: 'toggle', label: s.is_active ? 'Désactiver' : 'Réactiver', icon: s.is_active ? 'power' : 'rotate-ccw', danger: s.is_active, data: { entity: 'students', id: s.id, next: !s.is_active, name: `${s.first_name} ${s.last_name}` } }])}</td></tr>`).join('')}</tbody></table>${pager(pg, 'students')}</div>`;
}
function studentView(id) {
  const s = (D.students || []).find((x) => String(x.id) === String(id)); if (!s) return;
  const m = modal({ title: 'Fiche élève', size: 'md',
    body: `<div class="ui-profile"><span class="ui-avatar ui-avatar--lg">${esc(initials(`${s.first_name} ${s.last_name}`))}</span><div><h3>${esc(s.first_name)} ${esc(s.last_name)}</h3>${statusBadge(s.is_active)}</div></div><dl class="ui-kv ui-kv--grid"><div><dt>Matricule</dt><dd>${esc(s.matricule)}</dd></div><div><dt>Genre</dt><dd>${esc(GENDER[s.gender] || '—')}</dd></div><div><dt>Naissance</dt><dd>${esc(fmtDate(s.birth_date))}</dd></div><div><dt>Classe</dt><dd>${esc(s.class_name || '—')}</dd></div><div><dt>Année scolaire</dt><dd>${esc(s.school_year || '—')}</dd></div></dl>`,
    footer: `<button type="button" class="ui-btn ui-btn--ghost" data-close>Fermer</button>${can('students.edit') ? `<button type="button" class="ui-btn ui-btn--primary" data-edit>${icon('pencil')}<span>Modifier</span></button>` : ''}` });
  m.el.querySelector('[data-edit]')?.addEventListener('click', () => { m.close(); studentEdit(id); });
}
function studentNew() {
  const classes = activeClasses();
  formModal({ title: 'Ajouter un élève', submitLabel: 'Ajouter l’élève',
    fields: `<div class="ui-row">${field('Matricule', input('matricule', { required: true, maxlength: 40 }))}${field('Genre', select('gender', Object.entries(GENDER).map(([value, label]) => ({ value, label })), 'UNSPECIFIED'))}</div><div class="ui-row">${field('Prénom', input('first_name', { required: true, maxlength: 80 }))}${field('Nom', input('last_name', { required: true, maxlength: 80 }))}</div>${field('Classe', select('class_id', classes.map((c) => ({ value: c.id, label: classLabel(c) })), '', 'required'))}`,
    onSubmit: async (fd, m) => { await api('/api/admin/students', { method: 'POST', body: JSON.stringify({ matricule: fd.get('matricule'), first_name: fd.get('first_name'), last_name: fd.get('last_name'), gender: fd.get('gender'), class_id: fd.get('class_id') }) }); m.close(); await mutate(async () => {}, 'Élève inscrit dans la classe.'); } });
}
function studentEdit(id) {
  const s = (D.students || []).find((x) => String(x.id) === String(id)); if (!s) return;
  formModal({ title: 'Modifier l’élève', fields: `<div class="ui-row">${field('Prénom', input('first_name', { required: true, maxlength: 80, value: s.first_name }))}${field('Nom', input('last_name', { required: true, maxlength: 80, value: s.last_name }))}</div>${field('Genre', select('gender', Object.entries(GENDER).map(([value, label]) => ({ value, label })), s.gender || 'UNSPECIFIED'))}<p class="ui-hint">Matricule : ${esc(s.matricule)} (non modifiable).</p>`,
    onSubmit: async (fd, m) => { await api(`/api/admin/students/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ first_name: fd.get('first_name'), last_name: fd.get('last_name'), gender: fd.get('gender') }) }); m.close(); await mutate(async () => {}, 'Fiche élève mise à jour.'); } });
}

/* ============================== Activation / désactivation (commun) ============================== */
const WARN = { classes: 'Les affectations pédagogiques de cette classe seront également désactivées.', subjects: 'Les affectations de cette matière seront également désactivées.', students: 'L’inscription active de l’élève sera retirée.', teachers: 'Ses sessions en cours seront fermées.' };
async function toggleEntity({ entity, id, next, name }) {
  const on = next === 'true';
  const ok = await confirmDialog({ title: on ? 'Réactiver' : 'Désactiver', message: `Voulez-vous vraiment ${on ? 'réactiver' : 'désactiver'} <strong>${esc(name)}</strong> ?${on ? '' : `<br><span class="ui-muted">${esc(WARN[entity] || '')}</span>`}`, confirmText: on ? 'Réactiver' : 'Désactiver', danger: !on });
  if (!ok) return;
  try { await mutate(() => api(`/api/admin/${entity}/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ is_active: on }) }), on ? 'Élément réactivé.' : 'Élément désactivé.'); }
  catch (e) { toast(e.message, 'error'); }
}

/* ============================== VUE : Professeurs ============================== */
function vTeachers() {
  return pageHead('Professeurs', 'Comptes enseignants et accès', can('teachers.create') ? btn('Ajouter un professeur', 'teacher-new', 'plus') : '') + need(() => `${filterBar('teachers', [{ key: 'status', label: 'Statut', all: 'Tous les statuts', options: STATUS_OPTS }])}<div id="list">${lTeachers()}</div>`);
}
function lTeachers() {
  if (!S.loaded) return '';
  const f = S.ui.teachers; const q = norm(f.q);
  let rows = byStatus(D.teachers || [], f.status);
  if (q) rows = rows.filter((t) => norm(`${t.full_name} ${t.email} ${t.phone || ''}`).includes(q));
  const pg = paginate(rows, f.page, 9); f.page = pg.page;
  if (!rows.length) return empty('presentation', 'Aucun professeur trouvé', (D.teachers || []).length ? 'Modifiez vos filtres ou votre recherche.' : 'Créez le premier compte professeur.');
  return `<div class="ui-cards">${pg.items.map((t, i) => { const n = (D.assignments || []).filter((a) => a.teacher_id === t.id).length;
    return `<article class="ui-card ui-teacher ${t.is_active ? '' : 'is-off'}" style="--d:${i * 40}ms"><div class="ui-card-top"><button type="button" class="ui-person" data-act="teacher-view" data-id="${t.id}"><span class="ui-avatar ui-avatar--lg">${esc(initials(t.full_name))}</span><span><strong>${esc(t.full_name)}</strong><small>${esc(t.email)}</small></span></button>${menu([{ act: 'teacher-view', label: 'Voir les détails', icon: 'eye', data: { id: t.id } }, can('teachers.edit') && { act: 'teacher-edit', label: 'Modifier', icon: 'pencil', data: { id: t.id } }, can('teachers.edit') && { act: 'toggle', label: t.is_active ? 'Désactiver' : 'Réactiver', icon: t.is_active ? 'power' : 'rotate-ccw', danger: t.is_active, data: { entity: 'teachers', id: t.id, next: !t.is_active, name: t.full_name } }])}</div>
      <div class="ui-tags">${statusBadge(t.is_active)}${t.must_change_password ? badge('Mot de passe à changer', 'orange') : ''}</div>
      <p class="ui-line">${icon('phone')}${esc(t.phone || 'Téléphone non renseigné')}</p><p class="ui-line">${icon('link')}${D.assignments ? `${n} affectation${n > 1 ? 's' : ''}` : '—'}</p></article>`; }).join('')}</div>${pager(pg, 'teachers')}`;
}
function teacherView(id) {
  const t = (D.teachers || []).find((x) => String(x.id) === String(id)); if (!t) return;
  const as = (D.assignments || []).filter((a) => a.teacher_id === t.id);
  const m = modal({ title: 'Détails du professeur', body: `<div class="ui-profile"><span class="ui-avatar ui-avatar--lg">${esc(initials(t.full_name))}</span><div><h3>${esc(t.full_name)}</h3><div class="ui-tags">${statusBadge(t.is_active)}${t.must_change_password ? badge('Mot de passe à changer', 'orange') : ''}</div></div></div>
    <dl class="ui-kv ui-kv--grid"><div><dt>E-mail</dt><dd>${esc(t.email)}</dd></div><div><dt>Téléphone</dt><dd>${esc(t.phone || '—')}</dd></div><div><dt>Dernière connexion</dt><dd>${esc(t.last_login ? fmtDateTime(t.last_login) : 'Jamais')}</dd></div><div><dt>Compte créé</dt><dd>${esc(fmtDate(t.created_at))}</dd></div></dl>
    <h3 class="ui-sub-title">Affectations (${as.length})</h3>${as.length ? `<ul class="ui-list">${as.map((a) => `<li><span>${esc(a.class_name)} — ${esc(a.subject_name)}</span><small>${esc(a.term_name)}</small></li>`).join('')}</ul>` : empty('link', 'Aucune affectation')}`,
    footer: `<button type="button" class="ui-btn ui-btn--ghost" data-close>Fermer</button>${can('teachers.edit') ? `<button type="button" class="ui-btn ui-btn--primary" data-edit>${icon('pencil')}<span>Modifier</span></button>` : ''}` });
  m.el.querySelector('[data-edit]')?.addEventListener('click', () => { m.close(); teacherEdit(id); });
}
function teacherNew() {
  formModal({ title: 'Créer un compte professeur', submitLabel: 'Créer le compte',
    fields: `${field('Nom complet', input('full_name', { required: true, maxlength: 140 }))}${field('Adresse e-mail', input('email', { type: 'email', required: true, maxlength: 150 }))}${field('Téléphone', input('phone', { maxlength: 40 }))}<p class="ui-hint">Un mot de passe temporaire sera généré. Il ne sera affiché qu’une seule fois.</p>`,
    onSubmit: async (fd, m) => {
      const d = await api('/api/admin/teachers', { method: 'POST', body: JSON.stringify({ full_name: fd.get('full_name'), email: fd.get('email'), phone: fd.get('phone') }) });
      m.close(); await mutate(async () => {}, 'Compte professeur créé.');
      const r = modal({ title: 'Compte créé', size: 'sm', body: `<p>Compte créé pour <strong>${esc(d.teacher.full_name)}</strong>. Transmettez ce mot de passe temporaire de manière sécurisée : <strong>il ne sera plus affiché</strong>. Le professeur devra le changer à sa première connexion.</p><div class="ui-secret"><code>${esc(d.temporary_password)}</code><button type="button" class="ui-icon-btn" data-copy="${esc(d.temporary_password)}" aria-label="Copier">${icon('copy')}</button></div>`, footer: '<button type="button" class="ui-btn ui-btn--primary" data-close>J’ai transmis le mot de passe</button>' });
    } });
}
function teacherEdit(id) {
  const t = (D.teachers || []).find((x) => String(x.id) === String(id)); if (!t) return;
  formModal({ title: 'Modifier le professeur', fields: `${field('Nom complet', input('full_name', { required: true, maxlength: 140, value: t.full_name }))}${field('Téléphone', input('phone', { maxlength: 40, value: t.phone || '' }))}<p class="ui-hint">E-mail : ${esc(t.email)} (non modifiable).</p>`,
    onSubmit: async (fd, m) => { await api(`/api/admin/teachers/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ full_name: fd.get('full_name'), phone: fd.get('phone') }) }); m.close(); await mutate(async () => {}, 'Professeur mis à jour.'); } });
}

/* ============================== VUE : Classes ============================== */
function vClasses() {
  return pageHead('Classes', 'Effectifs et organisation par année', can('classes.create') ? btn('Créer une classe', 'class-new', 'plus') : '') + need(() => `${filterBar('classes', [
    { key: 'year', label: 'Année', all: 'Toutes les années', options: (D.years || []).map((y) => ({ value: y.id, label: y.label })) },
    { key: 'status', label: 'Statut', all: 'Tous les statuts', options: STATUS_OPTS }])}<div id="list">${lClasses()}</div>`);
}
function lClasses() {
  if (!S.loaded) return '';
  const f = S.ui.classes; const q = norm(f.q);
  let rows = byStatus(D.classes || [], f.status);
  if (f.year) rows = rows.filter((c) => String(c.school_year_id) === String(f.year));
  if (q) rows = rows.filter((c) => norm(`${c.name} ${c.level || ''}`).includes(q));
  const pg = paginate(rows, f.page, 9); f.page = pg.page;
  if (!rows.length) return empty('school', 'Aucune classe trouvée', (D.classes || []).length ? 'Modifiez vos filtres ou votre recherche.' : 'Créez la première classe.');
  return `<div class="ui-cards">${pg.items.map((c, i) => `<article class="ui-card ui-class ${c.is_active ? '' : 'is-off'}" style="--d:${i * 40}ms"><div class="ui-card-top"><div><h2>${esc(c.name)}</h2><p class="ui-card-sub">${esc(c.level || 'Niveau non précisé')} · ${esc(c.school_year)}</p></div>${menu([can('classes.edit') && { act: 'class-edit', label: 'Modifier', icon: 'pencil', data: { id: c.id } }, can('students.view') && { act: 'class-students', label: 'Voir les élèves', icon: 'graduation-cap', data: { id: c.id } }, can('classes.edit') && { act: 'toggle', label: c.is_active ? 'Désactiver' : 'Réactiver', icon: c.is_active ? 'power' : 'rotate-ccw', danger: c.is_active, data: { entity: 'classes', id: c.id, next: !c.is_active, name: c.name } }])}</div>
    <div class="ui-class-n"><strong>${esc(c.student_count)}</strong><span>élève${c.student_count > 1 ? 's' : ''}</span></div><div class="ui-card-foot">${statusBadge(c.is_active, 'Active', 'Inactive')}${can('students.view') ? btn('Élèves', 'class-students', 'chevron-right', 'ghost', `data-id="${c.id}"`) : ''}</div></article>`).join('')}</div>${pager(pg, 'classes')}`;
}
function classNew() {
  const years = (D.years || []).filter((y) => y.is_active);
  formModal({ title: 'Créer une classe', submitLabel: 'Créer la classe', fields: `${field('Nom de la classe', input('name', { required: true, maxlength: 80, placeholder: 'Ex. Terminale S2' }))}${field('Niveau', input('level', { maxlength: 40, placeholder: 'Ex. Terminale' }))}${field('Année scolaire', select('school_year_id', years.map((y) => ({ value: y.id, label: y.label })), cur()?.id, 'required'))}`,
    onSubmit: async (fd, m) => { await api('/api/admin/classes', { method: 'POST', body: JSON.stringify({ name: fd.get('name'), level: fd.get('level'), school_year_id: fd.get('school_year_id') }) }); m.close(); await mutate(async () => {}, 'Classe créée.'); } });
}
function classEdit(id) {
  const c = (D.classes || []).find((x) => String(x.id) === String(id)); if (!c) return;
  formModal({ title: 'Modifier la classe', fields: `${field('Nom de la classe', input('name', { required: true, maxlength: 80, value: c.name }))}${field('Niveau', input('level', { maxlength: 40, value: c.level || '' }))}<p class="ui-hint">Année scolaire : ${esc(c.school_year)} (non modifiable).</p>`,
    onSubmit: async (fd, m) => { await api(`/api/admin/classes/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ name: fd.get('name'), level: fd.get('level') }) }); m.close(); await mutate(async () => {}, 'Classe mise à jour.'); } });
}

/* ============================== VUE : Matières ============================== */
function vSubjects() {
  return pageHead('Matières', 'Disciplines et coefficients', can('subjects.create') ? btn('Nouvelle matière', 'subject-new', 'plus') : '') + need(() => `${filterBar('subjects', [{ key: 'status', label: 'Statut', all: 'Tous les statuts', options: STATUS_OPTS }])}<div id="list">${lSubjects()}</div>`);
}
function lSubjects() {
  if (!S.loaded) return '';
  const f = S.ui.subjects; const q = norm(f.q);
  let rows = byStatus(D.subjects || [], f.status);
  if (q) rows = rows.filter((s) => norm(`${s.name} ${s.code || ''}`).includes(q));
  const pg = paginate(rows, f.page, 12); f.page = pg.page;
  if (!rows.length) return empty('book-open', 'Aucune matière trouvée', (D.subjects || []).length ? 'Modifiez vos filtres ou votre recherche.' : 'Créez la première matière.');
  return `<div class="ui-table-card"><table class="ui-table"><thead><tr><th>Matière</th><th>Code</th><th>Coefficients</th><th>Affectations</th><th>Statut</th><th class="ui-th-act"><span class="sr-only">Actions</span></th></tr></thead><tbody>${pg.items.map((s) => {
    const as = (D.assignments || []).filter((a) => a.subject_id === s.id); const co = as.map((a) => Number(a.coefficient)); const range = co.length ? (Math.min(...co) === Math.max(...co) ? `${Math.min(...co)}` : `${Math.min(...co)} – ${Math.max(...co)}`) : '—';
    return `<tr><td data-label="Matière"><strong>${esc(s.name)}</strong></td><td data-label="Code">${esc(s.code || '—')}</td><td data-label="Coefficients">${esc(range)}</td><td data-label="Affectations">${D.assignments ? as.length : '—'}</td><td data-label="Statut">${statusBadge(s.is_active, 'Active', 'Inactive')}</td><td class="ui-td-act">${menu([can('subjects.edit') && { act: 'subject-edit', label: 'Modifier', icon: 'pencil', data: { id: s.id } }, can('subjects.edit') && { act: 'toggle', label: s.is_active ? 'Désactiver' : 'Réactiver', icon: s.is_active ? 'power' : 'rotate-ccw', danger: s.is_active, data: { entity: 'subjects', id: s.id, next: !s.is_active, name: s.name } }])}</td></tr>`; }).join('')}</tbody></table>${pager(pg, 'subjects')}</div>`;
}
function subjectNew() {
  formModal({ title: 'Nouvelle matière', submitLabel: 'Créer la matière', fields: `${field('Nom de la matière', input('name', { required: true, maxlength: 100 }))}${field('Code (facultatif)', input('code', { maxlength: 30 }))}`,
    onSubmit: async (fd, m) => { await api('/api/admin/subjects', { method: 'POST', body: JSON.stringify({ name: fd.get('name'), code: fd.get('code') }) }); m.close(); await mutate(async () => {}, 'Matière créée.'); } });
}
function subjectEdit(id) {
  const s = (D.subjects || []).find((x) => String(x.id) === String(id)); if (!s) return;
  formModal({ title: 'Modifier la matière', fields: `${field('Nom de la matière', input('name', { required: true, maxlength: 100, value: s.name }))}${field('Code', input('code', { maxlength: 30, value: s.code || '' }))}`,
    onSubmit: async (fd, m) => { await api(`/api/admin/subjects/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ name: fd.get('name'), code: fd.get('code') }) }); m.close(); await mutate(async () => {}, 'Matière mise à jour.'); } });
}

/* ============================== VUE : Affectations ============================== */
const termsFor = (classId) => { const c = (D.classes || []).find((x) => String(x.id) === String(classId)); return (D.terms || []).filter((t) => !t.is_closed && (!c || t.school_year_id === c.school_year_id)); };
function vAssignments() {
  return pageHead('Affectations', 'Matière, classe, professeur et coefficient par semestre', can('subjects.edit') ? btn('Nouvelle affectation', 'assign-new', 'plus') : '') + need(() => `<div class="ui-filters">${['cls', 'term'].map((k) => `<select class="ui-input ui-filter-select" data-filter="assignments.${k}" aria-label="${k === 'cls' ? 'Classe' : 'Semestre'}"><option value="">${k === 'cls' ? 'Toutes les classes' : 'Tous les semestres'}</option>${(k === 'cls' ? activeClasses().map((c) => ({ value: c.id, label: classLabel(c) })) : [...new Set((D.assignments || []).map((a) => a.term_name))].map((n) => ({ value: n, label: n }))).map((o) => `<option value="${esc(o.value)}" ${String(S.ui.assignments[k]) === String(o.value) ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>`).join('')}</div><div id="list">${lAssignments()}</div>`);
}
function lAssignments() {
  if (!S.loaded) return '';
  const f = S.ui.assignments; let rows = D.assignments || [];
  if (f.cls) rows = rows.filter((a) => String(a.class_id) === String(f.cls));
  if (f.term) rows = rows.filter((a) => a.term_name === f.term);
  const pg = paginate(rows, f.page, 15); f.page = pg.page;
  if (!rows.length) return empty('link', 'Aucune affectation', 'Associez une matière à une classe, un professeur et un coefficient.');
  return `<div class="ui-table-card"><table class="ui-table"><thead><tr><th>Classe</th><th>Matière</th><th>Semestre</th><th>Professeur</th><th>Coef.</th><th>Composition</th><th class="ui-th-act"><span class="sr-only">Actions</span></th></tr></thead><tbody>${pg.items.map((a) => `<tr><td data-label="Classe"><strong>${esc(a.class_name)}</strong></td><td data-label="Matière">${esc(a.subject_name)}</td><td data-label="Semestre">${esc(a.term_name)}</td><td data-label="Professeur">${a.teacher_name ? esc(a.teacher_name) : badge('Non attribué', 'orange')}</td><td data-label="Coef.">${esc(a.coefficient)}</td><td data-label="Composition">${a.has_composition ? 'Oui' : 'Non'}</td><td class="ui-td-act">${can('subjects.edit') ? `<button type="button" class="ui-icon-btn" data-act="assign-edit" data-id="${a.id}" aria-label="Modifier">${icon('pencil')}</button>` : ''}</td></tr>`).join('')}</tbody></table>${pager(pg, 'assignments')}</div>`;
}
function assignForm(existing) {
  const classes = activeClasses(); const subjects = (D.subjects || []).filter((s) => s.is_active); const teachers = (D.teachers || []).filter((t) => t.is_active);
  const ec = existing ? (D.classes || []).find((c) => c.id === existing.class_id) : null;
  const et = existing && ec ? (D.terms || []).find((t) => t.school_year_id === ec.school_year_id && t.name === existing.term_name) : null;
  const firstClass = existing ? existing.class_id : classes[0]?.id;
  const termOpts = (cid) => termsFor(cid).map((t) => ({ value: t.id, label: `${t.school_year} · ${t.name}` }));
  const lock = existing ? 'disabled' : 'required';
  const m = formModal({ title: existing ? 'Modifier l’affectation' : 'Nouvelle affectation', submitLabel: existing ? 'Mettre à jour' : 'Enregistrer l’affectation',
    fields: `<div class="ui-row">${field('Classe', select('class_id', classes.concat(ec && !ec.is_active ? [ec] : []).map((c) => ({ value: c.id, label: classLabel(c) })), firstClass, lock))}${field('Matière', select('subject_id', subjects.map((s) => ({ value: s.id, label: s.name })), existing?.subject_id, lock))}</div><div class="ui-row">${field('Semestre', select('term_id', termOpts(firstClass), et?.id, lock))}${field('Professeur', select('teacher_id', [{ value: '', label: 'Non attribué' }, ...teachers.map((t) => ({ value: t.id, label: `${t.full_name} — ${t.email}` }))], existing?.teacher_id || ''))}</div><div class="ui-row">${field('Coefficient (1 à 8)', input('coefficient', { type: 'number', min: 1, max: 8, step: 1, value: existing ? existing.coefficient : 1, required: true }))}<label class="ui-check ui-check--pad"><input type="checkbox" name="has_composition" ${!existing || existing.has_composition ? 'checked' : ''}><span>Composition prévue</span></label></div><p class="ui-dup hidden" id="dup-hint"></p>`,
    onSubmit: async (fd, mm) => {
      const body = { class_id: existing ? existing.class_id : fd.get('class_id'), subject_id: existing ? existing.subject_id : fd.get('subject_id'), term_id: existing ? et?.id : fd.get('term_id'), teacher_id: fd.get('teacher_id') || null, coefficient: fd.get('coefficient'), has_composition: fd.get('has_composition') === 'on' };
      if (!body.term_id) throw new Error('Aucun semestre disponible pour cette classe.');
      await api('/api/admin/class-subjects', { method: 'POST', body: JSON.stringify(body) }); mm.close(); await mutate(async () => {}, existing ? 'Affectation mise à jour.' : 'Affectation enregistrée.');
    } });
  const form = m.el.querySelector('form'); const hint = m.el.querySelector('#dup-hint'); const submit = m.el.querySelector('[data-submit] span:last-child');
  const check = () => {
    if (existing) return;
    const cid = form.class_id.value, sid = form.subject_id.value, tid = form.term_id.value;
    const term = (D.terms || []).find((t) => String(t.id) === tid);
    const dup = (D.assignments || []).find((a) => String(a.class_id) === cid && String(a.subject_id) === sid && term && a.term_name === term.name);
    hint.classList.toggle('hidden', !dup); submit.textContent = dup ? 'Mettre à jour l’existante' : 'Enregistrer l’affectation';
    if (dup) hint.textContent = `Cette matière est déjà affectée à cette classe pour ce semestre (coefficient ${dup.coefficient}). L’enregistrement mettra à jour l’affectation existante.`;
  };
  form.addEventListener('change', (e) => { if (e.target.name === 'class_id') { form.term_id.innerHTML = termOpts(e.target.value).map((o) => `<option value="${o.value}">${esc(o.label)}</option>`).join(''); } check(); });
  check();
}

/* ============================== VUE : Résultats ============================== */
function vResults() {
  const f = S.ui.results; const classes = activeClasses();
  return pageHead('Résultats et moyennes', 'Moyennes par matière et moyenne générale') + need(() => {
    if (!classes.length) return empty('bar-chart', 'Aucune classe disponible', 'Aucune classe active n’est accessible avec vos droits.');
    if (!f.cls) f.cls = String(classes[0].id);
    const terms = (D.terms || []).filter((t) => { const c = classes.find((x) => String(x.id) === String(f.cls)); return !c || t.school_year_id === c.school_year_id; });
    if (!terms.some((t) => String(t.id) === String(f.term))) f.term = terms[0] ? String(terms[0].id) : '';
    return `<form class="ui-filters" data-results-form><select class="ui-input ui-filter-select" name="cls" aria-label="Classe">${classes.map((c) => `<option value="${c.id}" ${String(c.id) === f.cls ? 'selected' : ''}>${esc(classLabel(c))}</option>`).join('')}</select><select class="ui-input ui-filter-select" name="term" aria-label="Semestre">${terms.map((t) => `<option value="${t.id}" ${String(t.id) === f.term ? 'selected' : ''}>${esc(t.school_year)} · ${esc(t.name)}</option>`).join('')}</select><button class="ui-btn ui-btn--primary" type="submit">${icon('eye')}<span>Consulter</span></button></form><div id="list">${lResults()}</div>`;
  });
}
function lResults() {
  const f = S.ui.results; const r = f.data;
  if (!r) return empty('bar-chart', 'Sélectionnez une classe et un semestre', 'Les moyennes s’afficheront ici.');
  if (r.loading) return skeleton(5);
  if (r.error) return empty('triangle-alert', 'Impossible de charger les résultats', r.error);
  const done = r.results.filter((x) => x.general_average !== null).map((x) => Number(x.general_average));
  const ranked = [...r.results].filter((x) => x.general_average !== null).sort((a, b) => b.general_average - a.general_average); const rank = new Map(ranked.map((x, i) => [x.enrollment_id, i + 1]));
  const mean = done.length ? done.reduce((a, b) => a + b, 0) / done.length : null;
  const pass = done.length ? Math.round((done.filter((n) => n >= 10).length / done.length) * 100) : null;
  const kpi = [['Élèves', r.results.length], ['Moyennes complètes', `${done.length} / ${r.results.length}`], ['Moyenne de classe', mean === null ? '—' : mean.toFixed(2)], ['Meilleure moyenne', done.length ? Math.max(...done).toFixed(2) : '—'], ['Plus faible', done.length ? Math.min(...done).toFixed(2) : '—'], ['Taux de réussite (≥ 10)', pass === null ? '—' : `${pass} %`]];
  const pg = paginate(r.results, f.page, 15); f.page = pg.page;
  const tone = (n) => (n >= 14 ? 'green' : n >= 10 ? 'blue' : 'red');
  return `<p class="ui-card-sub">${esc(r.class)} · ${esc(r.term)}</p><div class="ui-kpis">${kpi.map(([l, v]) => `<div class="ui-kpi"><span>${l}</span><strong>${esc(v)}</strong></div>`).join('')}</div>
    <p class="ui-hint">Une moyenne générale n’est affichée que si toutes les matières affectées ont leurs notes complètes.</p>
    ${r.results.length ? `<div class="ui-table-card"><div class="ui-scroll"><table class="ui-table ui-table--wide"><thead><tr><th>Rang</th><th>Élève</th>${r.subjects.map((s) => `<th title="Coefficient ${esc(s.coefficient)}">${esc(s.name)}<small> ×${esc(s.coefficient)}</small></th>`).join('')}<th>Moyenne générale</th></tr></thead><tbody>${pg.items.map((st) => `<tr><td>${rank.get(st.enrollment_id) || '—'}</td><td><strong>${esc(st.first_name)} ${esc(st.last_name)}</strong><small class="ui-block">${esc(st.matricule)}</small></td>${st.subjects.map((s) => `<td>${s.average === null ? '—' : Number(s.average).toFixed(2)}</td>`).join('')}<td>${st.general_average === null ? badge('Incomplet', 'orange') : badge(Number(st.general_average).toFixed(2), tone(Number(st.general_average)))}</td></tr>`).join('')}</tbody></table></div>${pager(pg, 'results')}</div>` : empty('graduation-cap', 'Aucun élève dans cette classe')}`;
}
async function runResults() {
  const f = S.ui.results; const form = document.querySelector('[data-results-form]'); if (form) { f.cls = form.cls.value; f.term = form.term.value; }
  f.page = 1; f.data = { loading: true }; refreshList();
  try { f.data = await api(`/api/admin/results?class_id=${encodeURIComponent(f.cls)}&term_id=${encodeURIComponent(f.term)}`); }
  catch (e) { f.data = { error: e.message }; }
  refreshList();
}

/* ============================== VUE : Administrateurs ============================== */
function vAdmins() {
  return pageHead('Administrateurs', 'Comptes d’administration et rôles') + need(() => {
    const us = D.users || [];
    return `<div class="ui-cards">${us.map((u, i) => `<article class="ui-card" style="--d:${i * 40}ms"><div class="ui-card-top"><div class="ui-person"><span class="ui-avatar ui-avatar--lg">${esc(initials(u.full_name))}</span><span><strong>${esc(u.full_name)}</strong><small>${esc(u.email)}</small></span></div></div><div class="ui-tags">${badge(u.role_name === 'principal' ? 'Principal' : 'Pédagogique', u.role_name === 'principal' ? 'navy' : 'blue')}${u.is_active ? badge('Actif', 'green') : badge('Désactivé', 'neutral')}${u.must_change_password ? badge('Mot de passe à changer', 'orange') : ''}</div><p class="ui-line">${icon('activity')}Dernière connexion : ${esc(u.last_login ? fmtDateTime(u.last_login) : 'Jamais')}</p></article>`).join('')}</div>${us.length ? '' : empty('shield-check', 'Aucun administrateur')}
    <section class="ui-card ui-note">${icon('lock')}<div><h2>Gestion sécurisée des comptes</h2><p>La création, la désactivation et la gestion des permissions des comptes administrateurs ne sont volontairement pas exposées dans l’interface : elles s’effectuent via le script d’initialisation sécurisé du serveur. L’administrateur principal dispose de toutes les permissions ; l’administrateur pédagogique est limité à celles qui lui sont accordées.</p></div></section>`;
  });
}

/* ============================== VUE : Journal ============================== */
function vLogs() {
  return pageHead('Journal d’activité', 'Les 100 dernières actions (administrateurs et professeurs)') + need(() => `${filterBar('logs', [
    { key: 'actor', label: 'Utilisateur', all: 'Tous les utilisateurs', options: [{ value: 'administrateur', label: 'Administrateurs' }, { value: 'professeur', label: 'Professeurs' }] },
    { key: 'type', label: 'Type', all: 'Tous les types', options: [{ value: 'connexion', label: 'Connexions' }, { value: 'creation', label: 'Créations' }, { value: 'modification', label: 'Modifications' }, { value: 'securite', label: 'Sécurité' }, { value: 'autre', label: 'Autres' }] }])}<div id="list">${lLogs()}</div>`);
}
function lLogs() {
  if (!S.loaded) return '';
  const f = S.ui.logs; const q = norm(f.q);
  let rows = (D.logs || []).map((l) => ({ l, d: describe(l) }));
  if (f.actor) rows = rows.filter((x) => x.l.actor_type === f.actor);
  if (f.type) rows = rows.filter((x) => x.d.cat === f.type);
  if (q) rows = rows.filter((x) => norm(`${x.l.admin_name || ''} ${x.d.label} ${x.l.resource || ''}`).includes(q));
  const pg = paginate(rows, f.page, 20); f.page = pg.page;
  if (!rows.length) return empty('scroll-text', 'Aucun événement', 'Aucune activité ne correspond à ces critères.');
  let day = '';
  return `<div class="ui-timeline">${pg.items.map(({ l, d }) => { const dd = fmtDate(l.created_at); const sep = dd !== day ? `<h3 class="ui-day">${esc(dd)}</h3>` : ''; day = dd;
    return `${sep}<div class="ui-event ${d.important ? 'is-important' : ''}"><span class="ui-event-ic">${icon(d.icon)}</span><div class="ui-event-body"><strong>${esc(d.label)}</strong>${d.important ? badge('Important', 'orange') : ''}<small>${esc(l.admin_name || 'Compte supprimé')} · ${esc(l.actor_type || 'administrateur')} · ${esc(l.resource || '')}${l.ip_address ? ` · ${esc(l.ip_address)}` : ''}</small></div><time>${esc(new Date(l.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))}</time></div>`; }).join('')}</div>${pager(pg, 'logs')}`;
}

/* ============================== VUE : Emplois du temps ============================== */
function vTimetables() {
  if (!S.loaded) return skeleton(5);
  const rows = D.timetables || [];
  const actions = can('timetable.create') ? btn('Nouvel emploi du temps', 'timetable-new', 'plus') : '';
  const body = rows.length ? `<div class="ui-table-wrap"><table class="ui-table"><thead><tr><th>Classe</th><th>Année</th><th>Séances</th><th>État</th><th></th></tr></thead><tbody>${rows.map((t) => `<tr><td><strong>${esc(t.class_name)}</strong><br><small>${esc(t.title || '')}</small></td><td>${esc(t.school_year)}</td><td>${Number(t.session_count || 0)}</td><td>${badge(t.status === 'PUBLISHED' ? 'Publié' : 'Brouillon', t.status === 'PUBLISHED' ? 'green' : 'gray')}</td><td>${menu([
    can('timetable.publish') ? { act: `timetable-${t.status === 'PUBLISHED' ? 'unpublish' : 'publish'}`, id: t.id, label: t.status === 'PUBLISHED' ? 'Dépublier' : 'Publier' } : null,
    can('timetable.delete') ? { act: 'timetable-delete', id: t.id, label: 'Supprimer', danger: true } : null
  ])}</td></tr>`).join('')}</tbody></table></div>` : empty('calendar-range', 'Aucun emploi du temps', 'Créez un premier emploi du temps pour une classe.');
  return pageHead('Emplois du temps', 'Organisation et publication des horaires scolaires', actions) + `<section class="ui-card">${body}</section>`;
}
async function timetableNew() {
  const years = D.years || []; const classes = D.classes || [];
  if (!years.length || !classes.length) throw new Error('Une année scolaire et une classe sont nécessaires.');
  formModal({ title: 'Nouvel emploi du temps', submitLabel: 'Créer', fields: `${field('Titre', input('title', { maxlength: 160, placeholder: 'Emploi du temps' }))}${field('Année scolaire', select('school_year_id', years.map((y) => ({ value: y.id, label: y.label })), years.find((y) => y.is_current)?.id || years[0].id))}${field('Classe', select('class_id', classes.map((c) => ({ value: c.id, label: `${c.name}${c.school_year ? ` — ${c.school_year}` : ''}` }))))}`, onSubmit: async (fd, modal) => {
    await timetableCreate({ title: fd.get('title'), school_year_id: Number(fd.get('school_year_id')), class_id: Number(fd.get('class_id')) }); modal.close(); await mutate(async () => {}, 'Emploi du temps créé.');
  } });
}
function timetableCreate(payload) {
  return api('/api/admin/timetables', { method: 'POST', body: JSON.stringify({ ...payload, sessions: [] }) });
}
async function timetableToggle(id, publish) {
  await api(`/api/admin/timetables/${id}/${publish ? 'publish' : 'unpublish'}`, { method: 'POST', body: '{}' });
  await mutate(async () => {}, 'Statut de l’emploi du temps mis à jour.');
}
async function timetableDelete(id) {
  if (!(await confirmDialog({ title: 'Supprimer l’emploi du temps ?', message: 'Cette action supprimera également ses séances.', confirmText: 'Supprimer' }))) return;
  await api(`/api/admin/timetables/${id}`, { method: 'DELETE' }); await mutate(async () => {}, 'Emploi du temps supprimé.');
}

/* ============================== VUE : Sauvegardes ============================== */
function vBackups() {
  return pageHead('Sauvegardes', 'Export complet des données de la plateforme') + `<section class="ui-card ui-backup"><span class="ui-stat-ic ui-stat-ic--lg">${icon('database')}</span><div><h2>Télécharger une sauvegarde complète</h2><p>Génère un fichier JSON signé (somme de contrôle SHA-256) contenant l’ensemble des données scolaires et des comptes.</p>${S.lastBackup ? `<p class="ui-hint">Dernière sauvegarde téléchargée dans cette session : ${esc(fmtDateTime(S.lastBackup))}</p>` : ''}</div>${btn('Télécharger la sauvegarde', 'backup', 'download')}</section>
    <div class="ui-grid ui-grid--2"><section class="ui-card"><h2>Contenu de la sauvegarde</h2><ul class="ui-checklist"><li>${icon('circle-check')}Années, classes, élèves, inscriptions</li><li>${icon('circle-check')}Professeurs, matières, affectations, notes</li><li>${icon('circle-check')}Comptes administrateurs et permissions (hashs de mots de passe)</li><li>${icon('circle-check')}Journaux d’activité</li><li class="is-no">${icon('circle-x')}Sessions actives (exclues)</li></ul></section>
    <section class="ui-card"><h2>Précautions</h2><ul class="ui-checklist is-warn"><li>${icon('triangle-alert')}Le fichier contient des données personnelles et des hashs de mots de passe : conservez-le dans un emplacement chiffré et privé.</li><li>${icon('triangle-alert')}Ne l’envoyez jamais par messagerie ni ne le déposez dans Git.</li><li>${icon('info')}La restauration n’est pas proposée dans l’interface : elle doit être réalisée manuellement, d’abord sur une base de test, jamais automatiquement en production.</li></ul></section></div>`;
}
async function downloadBackup() {
  const ok = await confirmDialog({ title: 'Télécharger la sauvegarde ?', message: 'Ce fichier contient <strong>toutes les données et les hashs de mots de passe</strong>. Conservez-le dans un emplacement sécurisé et privé.', confirmText: 'Télécharger' });
  if (!ok) return;
  try {
    const response = await fetch('/api/admin/backup', { credentials: 'same-origin' });
    if (!response.ok) { const d = await response.json().catch(() => ({})); throw new Error(d.error || `Erreur ${response.status}`); }
    const blob = await response.blob(); const url = URL.createObjectURL(blob); const link = document.createElement('a');
    link.href = url; link.download = `sunu-moyenne-backup-${new Date().toISOString().slice(0, 10)}.json`; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    S.lastBackup = new Date().toISOString(); toast('Sauvegarde téléchargée. Conservez-la dans un emplacement sécurisé.'); renderRoute(false);
  } catch (e) { toast(e.message, 'error'); }
}

/* ============================== VUE : Mon compte ============================== */
function vAccount() {
  const u = S.user; const groups = {};
  (u.permissions || []).forEach((p) => { const [a, b] = p.split('.'); (groups[a] = groups[a] || []).push(b); });
  const GL = { students: 'Élèves', teachers: 'Professeurs', classes: 'Classes', subjects: 'Matières', grades: 'Notes', reports: 'Rapports', settings: 'Paramètres', admins: 'Administrateurs', roles: 'Rôles', sessions: 'Sessions', audit_logs: 'Journal' };
  return pageHead('Mon compte', 'Profil et sécurité') + `<div class="ui-grid ui-grid--2"><section class="ui-card"><div class="ui-profile"><span class="ui-avatar ui-avatar--xl">${esc(initials(u.full_name))}</span><div><h2>${esc(u.full_name)}</h2><p class="ui-card-sub">${esc(u.email)}</p>${badge(roleLabel(u.role_name), u.role_name === 'principal' ? 'navy' : 'blue')}</div></div>
    <div class="ui-card-foot">${btn('Changer mon mot de passe', 'pw', 'key-round')}${btn('Se déconnecter', 'logout', 'log-out', 'ghost')}</div></section>
    <section class="ui-card"><h2>Sécurité</h2><ul class="ui-checklist"><li>${icon('circle-check')}Session protégée par cookie sécurisé (inaccessible au JavaScript)</li><li>${icon('circle-check')}Mot de passe d’au moins 12 caractères exigé</li><li>${icon('circle-check')}Toutes vos actions sensibles sont journalisées</li></ul></section></div>
    <section class="ui-card"><h2>Mes permissions <span class="ui-count">${(u.permissions || []).length}</span></h2><div class="ui-perms">${Object.entries(groups).map(([k, v]) => `<div><strong>${esc(GL[k] || k)}</strong><div class="ui-tags">${v.map((x) => badge(x, 'neutral')).join('')}</div></div>`).join('') || empty('lock', 'Aucune permission')}</div></section>`;
}

/* ============================== Recherche globale ============================== */
function runSearch(value) {
  const q = norm(value.trim()); const box = $('search-results');
  if (q.length < 2) { box.classList.add('hidden'); return; }
  const hits = [];
  (D.students || []).filter((s) => norm(`${s.first_name} ${s.last_name} ${s.matricule}`).includes(q)).slice(0, 4).forEach((s) => hits.push({ ic: 'graduation-cap', t: `${s.first_name} ${s.last_name}`, s: `Élève · ${s.matricule}`, route: 'eleves', key: 'students', q: s.matricule }));
  (D.teachers || []).filter((t) => norm(`${t.full_name} ${t.email}`).includes(q)).slice(0, 3).forEach((t) => hits.push({ ic: 'presentation', t: t.full_name, s: `Professeur · ${t.email}`, route: 'professeurs', key: 'teachers', q: t.full_name }));
  (D.classes || []).filter((c) => norm(c.name).includes(q)).slice(0, 3).forEach((c) => hits.push({ ic: 'school', t: c.name, s: `Classe · ${c.school_year}`, route: 'classes', key: 'classes', q: c.name }));
  (D.subjects || []).filter((s) => norm(`${s.name} ${s.code || ''}`).includes(q)).slice(0, 3).forEach((s) => hits.push({ ic: 'book-open', t: s.name, s: 'Matière', route: 'matieres', key: 'subjects', q: s.name }));
  box.innerHTML = hits.length ? hits.map((h) => `<button type="button" class="ui-hit" data-act="search-go" data-route-name="${h.route}" data-key="${h.key}" data-q="${esc(h.q)}">${icon(h.ic)}<span><strong>${esc(h.t)}</strong><small>${esc(h.s)}</small></span></button>`).join('') : `<p class="ui-pop-empty">Aucun résultat pour « ${esc(value)} »</p>`;
  box.classList.remove('hidden');
}

/* ============================== Actions (délégation) ============================== */
const ACT = {
  menu: (d, el) => { const m = el.closest('.ui-menu'); const open = !m.classList.contains('is-open'); closeMenus(); m.classList.toggle('is-open', open); },
  goto: (d) => go(d.routeName),
  logout: async () => { try { await api('/api/admin/logout', { method: 'POST', body: '{}' }); } finally { S.user = null; show('login'); setPasswordVisible(false); } },
  pw: () => { $('change-cancel').classList.remove('hidden'); show('change'); },
  toggle: (d) => toggleEntity(d),
  'year-new': yearNew, 'year-view': (d) => yearView(d.id),
  'student-new': studentNew, 'student-view': (d) => studentView(d.id), 'student-edit': (d) => studentEdit(d.id),
  'teacher-new': teacherNew, 'teacher-view': (d) => teacherView(d.id), 'teacher-edit': (d) => teacherEdit(d.id),
  'class-new': classNew, 'class-edit': (d) => classEdit(d.id),
  'class-students': (d) => { S.ui.students = { q: '', cls: d.id, year: '', status: '', page: 1 }; go('eleves'); },
  'subject-new': subjectNew, 'subject-edit': (d) => subjectEdit(d.id),
  'assign-new': () => assignForm(null), 'assign-edit': (d) => assignForm((D.assignments || []).find((a) => String(a.id) === String(d.id))),
  backup: downloadBackup,
  'timetable-new': timetableNew,
  'timetable-publish': (d) => timetableToggle(d.id, true),
  'timetable-unpublish': (d) => timetableToggle(d.id, false),
  'timetable-delete': (d) => timetableDelete(d.id),
  'search-go': (d) => { S.ui[d.key].q = d.q; S.ui[d.key].page = 1; $('search-results').classList.add('hidden'); $('global-search').value = ''; go(d.routeName); },
  'sb-collapse': () => { const c = document.body.classList.toggle('sb-collapsed'); try { localStorage.setItem('sm-sb', c ? '1' : '0'); } catch {} },
  'sb-open': () => document.body.classList.add('sb-open'), 'sb-close': () => document.body.classList.remove('sb-open'),
  pop: (d, el) => { const t = $(d.target); const open = t.classList.contains('hidden'); closePops(); t.classList.toggle('hidden', !open); el.setAttribute('aria-expanded', String(open)); }
};
const closeMenus = () => document.querySelectorAll('.ui-menu.is-open').forEach((m) => m.classList.remove('is-open'));
const closePops = () => { ['bell-pop', 'profile-pop'].forEach((id) => $(id)?.classList.add('hidden')); };

document.addEventListener('click', async (e) => {
  const copy = e.target.closest('[data-copy]');
  if (copy) { try { await navigator.clipboard.writeText(copy.dataset.copy); toast('Copié dans le presse-papiers.', 'info'); } catch { toast('Copie impossible : sélectionnez le texte manuellement.', 'error'); } return; }
  const pageBtn = e.target.closest('[data-page]');
  if (pageBtn) { const [k, n] = pageBtn.dataset.page.split(':'); S.ui[k === 'results' ? 'results' : k].page = Number(n); refreshList(); return; }
  const el = e.target.closest('[data-act]');
  if (!el || !S.user && el.dataset.act !== 'logout') { if (!e.target.closest('.ui-menu')) closeMenus(); if (!e.target.closest('.ui-pop-wrap')) closePops(); return; }
  if (el.dataset.act !== 'menu') closeMenus(); if (el.dataset.act !== 'pop') closePops();
  try { await ACT[el.dataset.act]?.(el.dataset, el, e); } catch (err) { toast(err.message || 'Action impossible.', 'error'); }
});
document.addEventListener('input', (e) => {
  const el = e.target.closest('[data-filter]'); if (!el) return;
  const [view, key] = el.dataset.filter.split('.'); S.ui[view][key] = el.value; S.ui[view].page = 1;
  if (view === 'results') return; refreshList();
});
document.addEventListener('change', (e) => {
  if (e.target.closest('[data-results-form]') && e.target.name === 'cls') { S.ui.results.cls = e.target.value; S.ui.results.term = ''; S.ui.results.data = null; renderRoute(false); }
});
document.addEventListener('submit', (e) => { if (e.target.matches('[data-results-form]')) { e.preventDefault(); runResults(); } });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeMenus(); closePops(); $('search-results')?.classList.add('hidden'); document.body.classList.remove('sb-open'); } });
$('global-search').addEventListener('input', debounce((e) => runSearch(e.target.value), 120));
$('global-search').addEventListener('focus', (e) => runSearch(e.target.value));
document.addEventListener('click', (e) => { if (!e.target.closest('.ui-searchbox')) $('search-results').classList.add('hidden'); });
window.addEventListener('hashchange', () => { if (S.user && !$('dashboard').classList.contains('hidden')) renderRoute(); });

/* ============================== Authentification (logique inchangée) ============================== */
function setLoginLoading(on) { const b = $('login-submit'); b.disabled = on; b.classList.toggle('is-loading', on); b.setAttribute('aria-busy', String(on)); $('login-submit-label').textContent = on ? 'Connexion en cours…' : 'Se connecter'; }
function setPasswordVisible(visible) { const t = $('toggle-password'); $('password').type = visible ? 'text' : 'password'; t.setAttribute('aria-pressed', String(visible)); t.setAttribute('aria-label', visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'); }
$('toggle-password').addEventListener('click', () => setPasswordVisible($('password').type === 'password'));

async function boot() {
  buildNav(); const u = S.user;
  $('profile-name').textContent = u.full_name || ''; $('profile-role').textContent = roleLabel(u.role_name); $('profile-initials').textContent = initials(u.full_name);
  try { document.body.classList.toggle('sb-collapsed', localStorage.getItem('sm-sb') === '1'); } catch {}
  S.loaded = false; renderRoute();
  await loadAll(); renderRoute(false);
}
async function load() {
  try {
    const d = await api('/api/admin/me'); S.user = d.user;
    if (S.user.must_change_password) { $('change-cancel').classList.add('hidden'); show('change'); return; }
    show('dashboard'); await boot();
  } catch (error) { if (error.code === 'changement_mot_de_passe_requis') { $('change-cancel').classList.add('hidden'); show('change'); } else show('login'); }
}
$('login-form').addEventListener('submit', async (event) => {
  event.preventDefault(); $('login-error').textContent = '';
  setLoginLoading(true);
  try { const d = await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ email: $('email').value, password: $('password').value }) }); S.user = d.user; if (d.must_change_password) { $('change-cancel').classList.add('hidden'); show('change'); } else await load(); }
  catch (error) { $('login-error').textContent = error.message; }
  finally { setLoginLoading(false); setPasswordVisible(false); }
});
$('change-form').addEventListener('submit', async (event) => {
  event.preventDefault(); $('change-error').textContent = '';
  if ($('new-password').value !== $('confirm-password').value) { $('change-error').textContent = 'Les mots de passe ne correspondent pas.'; return; }
  const b = $('change-submit'); b.disabled = true; b.classList.add('is-loading');
  try { await api('/api/admin/change-password', { method: 'POST', body: JSON.stringify({ oldPassword: $('old-password').value, newPassword: $('new-password').value }) }); $('change-form').reset(); await load(); toast('Mot de passe modifié avec succès.'); }
  catch (error) { $('change-error').textContent = error.message; }
  finally { b.disabled = false; b.classList.remove('is-loading'); }
});
$('change-cancel').addEventListener('click', () => { $('change-form').reset(); $('change-error').textContent = ''; show('dashboard'); });
/* Icônes des éléments statiques */
document.querySelectorAll('[data-icon]').forEach((el) => { el.insertAdjacentHTML('afterbegin', icon(el.dataset.icon)); });
load();
