/* =========================================================
   MODE PROFESSEUR — SUNU MOYENNE / LYNAQE Sédhiou
   Accès réservé : mot de passe (LYNAQE2026), vérification locale.
   Gestion complète par classe :
   - "Mes classes" : créer, renommer, supprimer une classe.
   - Élèves de la classe (liste réutilisée pour toutes les matières) :
     ajouter, modifier, supprimer, voir le bulletin.
   - Matières du semestre : ajouter, saisir les notes, supprimer.
   - Édition d'une matière : modifications "staged" jusqu'à
     [Enregistrer] ; [Annuler] restaure la valeur précédente
     (Ancienne valeur → Nouvelle valeur).
   - Relevé de notes (photo/PDF), OCR, export PDF/CSV.
   ========================================================= */
(function () {
  'use strict';

  // Le mot de passe n'est jamais stocké en clair dans le code source : on ne
  // garde que son empreinte SHA-256, comparée à l'empreinte de la saisie.
  // ATTENTION : ceci reste une simple barrière visuelle côté client, PAS une
  // vraie authentification — le site étant hébergé en statique (GitHub Pages),
  // aucune vérification serveur n'est possible tant qu'un backend n'est pas en place.
  const PROF_PASSWORD_HASH = '28a0e7d27e35ae88ecdcfb46972a5d5979db3d3ab53b8e12a2bcd01b57bbe696';

  async function hashPassword(value) {
    try {
      const data = new TextEncoder().encode(value);
      const digest = await crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    } catch {
      return null;
    }
  }
  const PROF_AUTH_KEY = 'lynaqe_prof_token';
  const PROF_STORE_KEY = 'lynaqe_prof_classes';
  const PROF_ROWS_PREFIX = 'lynaqe_prof_rows';
  const NOTE_FIELDS = ['d1', 'd2', 'compo'];
  const SEMESTER_NAMES = ['Semestre1', 'Semestre2'];

  const $ = (id) => document.getElementById(id);

  const els = {
    screen: $('prof-screen'),
    loginCard: $('prof-login-card'),
    loginForm: $('prof-login-form'),
    password: $('prof-password'),
    togglePassword: $('prof-toggle-password'),
    loginBtn: $('prof-login-btn'),
    loginError: $('prof-login-error'),
    console: $('prof-console'),
    logoutBtn: $('prof-logout-btn'),

    backBtn: $('prof-back-btn'),
    backLabel: $('prof-back-label'),
    breadcrumbText: $('prof-breadcrumb-text'),

    viewHome: $('prof-view-home'),
    viewClass: $('prof-view-class'),
    viewSubject: $('prof-view-subject'),

    classesGrid: $('prof-classes-grid'),
    newClass: $('prof-new-class'),
    addClassBtn: $('prof-add-class-btn'),
    addClassCard: $('prof-add-class-card'),
    addClassPromo: $('prof-add-card-promo'),
    addClassForm: $('prof-add-class-form'),
    addClassOpen: $('prof-add-card-open'),
    addClassCancel: $('prof-add-card-cancel'),
    headStats: $('prof-classes-head-stats'),

    classTitle: $('prof-class-name'),
    classMeta: $('prof-class-meta'),
    semesterTabs: $('prof-semester-tabs'),

    studentAdd: $('prof-student-add'),
    studentForm: $('prof-student-form'),
    studentNom: $('prof-student-nom'),
    studentPrenom: $('prof-student-prenom'),
    studentFormOk: $('prof-student-form-ok'),
    studentFormCancel: $('prof-student-form-cancel'),
    studentsTbody: $('prof-students-tbody'),
    studentsEmpty: $('prof-students-empty'),

    subjectAdd: $('prof-subject-add'),
    subjectForm: $('prof-subject-form'),
    subjectSelect: $('prof-subject-select'),
    subjectCoef: $('prof-subject-coef'),
    subjectFormOk: $('prof-subject-form-ok'),
    subjectFormCancel: $('prof-subject-form-cancel'),
    subjectsList: $('prof-subjects-list'),
    subjectsEmpty: $('prof-subjects-empty'),

    context: $('prof-subject-context'),
    classe: $('prof-classe'),
    semestre: $('prof-semestre'),
    matiere: $('prof-matiere'),
    coefficient: $('prof-coefficient'),
    customGroup: $('prof-matiere-custom-group'),
    customInput: $('prof-matiere-custom'),
    dropzone: $('prof-dropzone'),
    fileInput: $('prof-file-input'),
    previewLabel: $('prof-preview-label'),
    filePreview: $('prof-file-preview'),
    fileImg: $('prof-file-img'),
    filePdf: $('prof-file-pdf'),
    fileName: $('prof-file-name'),
    fileRemove: $('prof-file-remove'),
    tbody: $('prof-tbody'),
    empty: $('prof-empty'),
    addStudent: $('prof-add-student'),
    thComposition: $('prof-th-composition'),
    summary: $('prof-summary'),
    summaryStats: $('prof-summary-stats'),
    exportPdf: $('prof-export-pdf'),
    exportCsv: $('prof-export-csv'),
    saveBtn: $('prof-save-btn'),

    editBanner: $('prof-edit-banner'),
    editTitle: $('prof-edit-title'),
    editValues: $('prof-edit-values'),
    editCancel: $('prof-edit-cancel'),
    editSave: $('prof-edit-save')
  };

  /* ------------------ État global ------------------ */

  let store = null; /* { [classe]: { eleves: [], semestres: { Semestre1: {}, Semestre2: {} } } } */
  let activeClass = null;
  let activeSem = SEMESTER_NAMES[0];
  let activeSubject = null;
  let currentRows = []; /* lignes de travail de l'éditeur : {id, nom, prenom, d1, d2, compo} */
  let snapshot = null; /* { coefficient, composition, notes } = état sauvegardé de la matière */
  let fileObjectUrl = null;
  let editingStudentId = null; /* élève en cours de modification (formulaire) */

  /* ------------------ Authentification ------------------ */

  const PROF_AUTH_VALUE = 'ok';

  function isAuthenticated() {
    try {
      return sessionStorage.getItem(PROF_AUTH_KEY) === PROF_AUTH_VALUE;
    } catch {
      return false;
    }
  }

  function setAuthenticated(val) {
    try {
      if (val) sessionStorage.setItem(PROF_AUTH_KEY, val);
      else sessionStorage.removeItem(PROF_AUTH_KEY);
    } catch {}
  }

  function showLoginError(el, message) {
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
  }

  function showLogin() {
    if (!els.loginCard || !els.console) return;
    els.loginCard.hidden = false;
    els.console.hidden = true;
    els.password.value = '';
    els.loginError.hidden = true;
    window.setTimeout(() => els.password.focus(), prefersReducedMotion ? 0 : 200);
  }

  function showConsole() {
    if (!els.loginCard || !els.console) return;
    els.loginCard.hidden = true;
    els.console.hidden = false;
    renderHome();
  }

  /* -------------------- Stockage -------------------- */

  function defaultClass() {
    return { eleves: [], semestres: { Semestre1: {}, Semestre2: {} } };
  }

  function loadStore() {
    try {
      const raw = localStorage.getItem(PROF_STORE_KEY);
      store = raw ? JSON.parse(raw) : null;
    } catch {
      store = null;
    }
    if (!store || typeof store !== 'object') store = {};

    const migrated = migrateLegacyRows();
    const normalized = normalizeStore();
    if (migrated || normalized) saveStore();
  }

  /* Répare une entrée du store qui ne respecte pas le schéma attendu
     { eleves: [], semestres: { Semestre1: {}, Semestre2: {} } }.
     Prend en charge les anciens formats (liste plate de lignes, ou
     entrée sans semestres) pour que l'écran d'accueil ne plante plus
     et que l'ajout de classe fonctionne toujours. */
  function normalizeStore() {
    let changed = false;
    Object.keys(store).forEach((name) => {
      const entry = store[name];

      if (Array.isArray(entry)) {
        const fresh = defaultClass();
        entry.forEach((r) => {
          const nom = String((r && r.nom) || '').trim();
          const prenom = String((r && r.prenom) || '').trim();
          if (!nom && !prenom) return;
          fresh.eleves.push({ id: newId(), nom, prenom });
        });
        store[name] = fresh;
        changed = true;
        return;
      }

      if (!entry || typeof entry !== 'object') {
        store[name] = defaultClass();
        changed = true;
        return;
      }

      if (!Array.isArray(entry.eleves)) {
        entry.eleves = [];
        changed = true;
      } else {
        entry.eleves = entry.eleves.filter(
          (e) => e && typeof e === 'object' && (e.nom || e.prenom)
        );
      }

      if (!entry.semestres || typeof entry.semestres !== 'object') {
        entry.semestres = { Semestre1: {}, Semestre2: {} };
        changed = true;
      } else {
        SEMESTER_NAMES.forEach((sem) => {
          if (!entry.semestres[sem] || typeof entry.semestres[sem] !== 'object') {
            entry.semestres[sem] = {};
            changed = true;
          }
        });
      }
    });
    return changed;
  }

  function saveStore() {
    try {
      localStorage.setItem(PROF_STORE_KEY, JSON.stringify(store));
    } catch {}
  }

  /* Migration des anciennes clés plates (lynaqe_prof_rows_*) vers le
     nouveau modèle par classe + élèves + notes par identifiant. */
  function migrateLegacyRows() {
    let any = false;
    try {
      Object.keys(localStorage).forEach((key) => {
        if (!key.startsWith(PROF_ROWS_PREFIX + '_')) return;
        const rest = key.slice(PROF_ROWS_PREFIX.length + 1);
        const m = rest.match(/^(.+)_(Semestre[12])_(.+)$/);
        if (!m) return;
        const classe = m[1];
        const sem = m[2];
        const matiere = m[3].replace(/_/g, ' ');
        let rows = [];
        try { rows = JSON.parse(localStorage.getItem(key) || '[]'); } catch {}
        if (!Array.isArray(rows) || !rows.length) {
          localStorage.removeItem(key);
          return;
        }
        if (!store[classe]) store[classe] = defaultClass();
        if (!store[classe].semestres[sem]) store[classe].semestres[sem] = {};
        const record = { coefficient: 1, composition: true, notes: {} };
        rows.forEach((r) => {
          const nom = String(r.nom || '').trim();
          const prenom = String(r.prenom || '').trim();
          if (!nom && !prenom) return;
          const found = store[classe].eleves.find(
            (e) => e.nom === nom && e.prenom === prenom
          );
          let id;
          if (found) id = found.id;
          else {
            id = newId();
            store[classe].eleves.push({ id, nom, prenom });
          }
          const note = {};
          NOTE_FIELDS.forEach((f) => {
            note[f] = typeof r[f] === 'string' ? r[f] : '';
          });
          record.notes[id] = note;
        });
        store[classe].semestres[sem][matiere] = record;
        localStorage.removeItem(key);
        any = true;
      });
    } catch {}
    return any;
  }

  function newId() {
    return (
      's_' +
      Date.now().toString(36) +
      '_' +
      Math.random().toString(36).slice(2, 7)
    );
  }

  function getSubjectRecord(classe, sem, matiere) {
    return store[classe]?.semestres?.[sem]?.[matiere] || null;
  }

  function setSubjectRecord(classe, sem, matiere, record) {
    if (!store[classe]) store[classe] = defaultClass();
    if (!store[classe].semestres[sem]) store[classe].semestres[sem] = {};
    store[classe].semestres[sem][matiere] = record;
    saveStore();
  }

  function deleteSubjectRecord(classe, sem, matiere) {
    const semObj = store[classe]?.semestres?.[sem];
    if (semObj && Object.prototype.hasOwnProperty.call(semObj, matiere)) {
      delete semObj[matiere];
      saveStore();
    }
  }

  /* ------------------ Utilitaires ------------------ */

  function semLabel(sem) {
    return sem === 'Semestre1' ? t('table_semestre1_full') : t('table_semestre2_full');
  }

  function inferLevel(classe) {
    const c = String(classe || '').toLowerCase();
    if (c.includes('2nde') || /(^|\s)2\b/.test(c)) return '2nde';
    if (c.includes('1ere') || c.includes('1ère') || /(^|\s)1\b/.test(c)) return '1er';
    if (c.includes('terminale') || c.includes('tle') || /(^|\s)t\b/.test(c)) return 'Tle';
    if (c.includes('5e') || c.includes('5ᵉ') || /(^|\s)5\b/.test(c)) return '5e';
    if (c.includes('4e') || c.includes('4ᵉ') || /(^|\s)4\b/.test(c)) return '4e';
    if (c.includes('3e') || c.includes('3ᵉ') || /(^|\s)3\b/.test(c)) return '3e';
    if (c.includes('6e') || c.includes('6ᵉ') || /(^|\s)6\b/.test(c)) return '6e';
    return null;
  }

  /* Icône associée à chaque niveau scolaire (remplace les initiales dans le
     badge de la carte classe) : 6e = pousse, 5e = feuille, 4e = livre,
     3e = cerveau, 2nde = toque de diplômé, 1ère = courbe de progression,
     Tle = trophée. */
  const LEVEL_ICON_PATHS = {
    '6e': '<path d="M12 20V10"/><path d="M12 10C7 10 5 7 5 4c4 0 7 2 7 6Z"/><path d="M12 10c5 0 7-3 7-6-4 0-7 2-7 6Z"/>',
    '5e': '<path d="M11 20A7 7 0 0 1 4 13c0-5 4-9 9-9h6a1 1 0 0 1 1 1c0 6-4 10-9 10Z"/><path d="M4 20c3-4 6-6 10-8"/>',
    '4e': '<path d="M2 5.5A2.5 2.5 0 0 1 4.5 3H10a2 2 0 0 1 2 2v15a1.5 1.5 0 0 0-1.5-1.5H2Z"/><path d="M22 5.5A2.5 2.5 0 0 0 19.5 3H14a2 2 0 0 0-2 2v15a1.5 1.5 0 0 1 1.5-1.5H22Z"/>',
    '3e': '<path d="M12 4c-2 0-3.4 1.4-3.4 3.1 0 .6.2 1.2.5 1.7-1.3.4-2.4 1.6-2.4 3.1 0 1 .5 1.9 1.3 2.5-.3.5-.4 1-.4 1.6 0 1.7 1.4 3 3.1 3 .4 0 .8 0 1.1-.2"/><path d="M12 4c2 0 3.4 1.4 3.4 3.1 0 .6-.2 1.2-.5 1.7 1.3.4 2.4 1.6 2.4 3.1 0 1-.5 1.9-1.3 2.5.3.5.4 1 .4 1.6 0 1.7-1.4 3-3.1 3-.4 0-.8 0-1.1-.2"/><line x1="12" y1="4" x2="12" y2="19"/>',
    '2nde': '<path d="m22 10-10-5L2 10l10 5 10-5Z"/><path d="M6 12.5V17c0 1.4 2.7 3 6 3s6-1.6 6-3v-4.5"/><path d="M22 10v6"/>',
    '1er': '<polyline points="3 17 9 11 13 15 21 7"/><polyline points="15 7 21 7 21 13"/>',
    'Tle': '<path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v4a5 5 0 0 1-10 0Z"/><path d="M17 5h2a2 2 0 0 1 2 2c0 2.2-2 4-4 4"/><path d="M7 5H5a2 2 0 0 0-2 2c0 2.2 2 4 4 4"/>'
  };

  function classIcon(classe) {
    const level = inferLevel(classe);
    if (!level || !LEVEL_ICON_PATHS[level]) return null;
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="22" height="22" aria-hidden="true">${LEVEL_ICON_PATHS[level]}</svg>`;
  }

  function isSameString(a, b) {
    return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
  }

  function parseNote(raw) {
    const value = String(raw ?? '').trim();
    if (value === '') return { empty: true, valid: true, value: null };
    const ok =
      typeof isValidDecimalNote === 'function'
        ? isValidDecimalNote(value)
        : /^(?:\d|1\d|20)(?:[.,](?:25|50|75))?$/.test(value);
    if (!ok) return { empty: false, valid: false, value: null };
    return { empty: false, valid: true, value: Number(value.replace(',', '.')) };
  }

  function moyenneFromNotes(notes, composition) {
    const d1 = parseNote(notes?.d1);
    const d2 = parseNote(notes?.d2);
    if (!d1.valid || !d2.valid || d1.empty || d2.empty) return null;
    const moyDevoirs = (d1.value + d2.value) / 2;
    if (!composition) return moyDevoirs;
    const compo = parseNote(notes?.compo);
    if (!compo.valid || compo.empty) return null;
    return (moyDevoirs + compo.value) / 2;
  }

  function hasComposition() {
    return document.querySelector('input[name="prof-composition"]:checked')?.value === 'oui';
  }

  function validCoefficient() {
    const value = Number(els.coefficient.value);
    return Number.isInteger(value) && value >= 1 && value <= 8;
  }

  function getAvailableMatieres(classe) {
    const level = inferLevel(classe);
    const list = [];
    if (level && typeof getMatieresPourClasse === 'function') {
      list.push(...getMatieresPourClasse(level));
    } else if (typeof matieresCommunesBase !== 'undefined') {
      list.push(...matieresCommunesBase);
    }
    const semObj = store[classe]?.semestres?.[activeSem] || {};
    Object.keys(semObj).forEach((m) => list.push(m));
    const seen = new Set();
    return list.filter((m) => !seen.has(m) && seen.add(m));
  }

  function showMatiere(matiere) {
    return typeof translateMatiere === 'function' ? translateMatiere(matiere) : matiere;
  }

  function getStudentName(row) {
    return [row.prenom, row.nom].filter(Boolean).join(' ').trim() || '—';
  }

  /* --------------- Moyennes & rangs par élève --------------- */

  function studentSemesterAverage(eleveId) {
    const semObj = store[activeClass]?.semestres?.[activeSem] || {};
    let sum = 0;
    let coef = 0;
    Object.values(semObj).forEach((record) => {
      if (!record || !record.coefficient) return;
      const moy = moyenneFromNotes(record.notes ? record.notes[eleveId] : null, record.composition);
      if (moy === null) return;
      sum += moy * record.coefficient;
      coef += record.coefficient;
    });
    if (!coef) return null;
    return sum / coef;
  }

  function rankClass() {
    const students = (store[activeClass]?.eleves || []).slice();
    const decorated = students
      .map((s) => ({ id: s.id, avg: studentSemesterAverage(s.id) }))
      .filter((s) => s.avg !== null)
      .sort((a, b) => b.avg - a.avg);
    const rankById = {};
    decorated.forEach((s, i) => {
      rankById[s.id] = i + 1;
    });
    return rankById;
  }

  function classeAverageForSubject(record) {
    if (!record) return null;
    const avg = (store[activeClass]?.eleves || [])
      .map((e) => moyenneFromNotes(record.notes ? record.notes[e.id] : null, record.composition))
      .filter((v) => v !== null);
    if (!avg.length) return null;
    return avg.reduce((s, v) => s + v, 0) / avg.length;
  }

  /* ================= Navigation (3 vues) ================= */

  function setBackLabel(key) {
    els.backLabel.textContent = t(key);
    els.backLabel.setAttribute('data-i18n', key);
  }

  function showHome() {
    els.backBtn.hidden = true;
    if (els.breadcrumbText) els.breadcrumbText.textContent = '';
    els.viewHome.hidden = false;
    els.viewClass.hidden = true;
    els.viewSubject.hidden = true;
    renderHome();
  }

  function showClassView() {
    els.backBtn.hidden = false;
    setBackLabel('prof_back_classes');
    if (els.breadcrumbText) els.breadcrumbText.textContent = activeClass;
    els.viewHome.hidden = true;
    els.viewClass.hidden = false;
    els.viewSubject.hidden = true;
    renderClassView();
  }

  function showSubjectView() {
    els.backBtn.hidden = false;
    setBackLabel('prof_back_class');
    if (els.breadcrumbText) els.breadcrumbText.textContent = `${activeClass} › ${semLabel(activeSem)} › ${showMatiere(activeSubject)}`;
    els.viewHome.hidden = true;
    els.viewClass.hidden = true;
    els.viewSubject.hidden = false;
  }

  /* ================= Vue 1 : Mes classes ================= */

  const LEVEL_LABEL_KEYS = {
    '6e': 'prof_level_6e',
    '5e': 'prof_level_5e',
    '4e': 'prof_level_4e',
    '3e': 'prof_level_3e',
    '2nde': 'prof_level_2nde',
    '1er': 'prof_level_1er',
    'Tle': 'prof_level_tle'
  };

  const ICON_STUDENTS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>';
  const ICON_SUBJECTS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18" aria-hidden="true"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>';
  const ICON_DOTS = '<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg>';
  const ICON_OPEN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';
  const ICON_RENAME = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15" aria-hidden="true"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>';
  const ICON_DELETE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>';

  function classSerie(classe) {
    const m = String(classe || '').match(/(?:^|\s)(S\d{1,2})\b/i);
    return m ? m[1].toUpperCase() : null;
  }

  function levelLabel(classe) {
    const level = inferLevel(classe);
    return level && LEVEL_LABEL_KEYS[level] ? t(LEVEL_LABEL_KEYS[level]) : null;
  }

  /* Indicateur discret de l'état d'avancement de la classe : élèves
     renseignés (45 %) + matières configurées (55 %). */
  function classProgress(entry, classe) {
    const nbStudents = Array.isArray(entry.eleves) ? entry.eleves.length : 0;
    const nbSubjects =
      Object.keys(entry.semestres?.Semestre1 || {}).length +
      Object.keys(entry.semestres?.Semestre2 || {}).length;
    let expected = 6;
    const level = inferLevel(classe);
    if (level && typeof getMatieresPourClasse === 'function') {
      const list = getMatieresPourClasse(level);
      if (Array.isArray(list) && list.length) expected = list.length;
    }
    const subjectPct = Math.min(1, nbSubjects / expected);
    const studentPct = Math.min(1, nbStudents / 32);
    return Math.round(studentPct * 45 + subjectPct * 55);
  }

  function closeAllClassPopovers() {
    document.querySelectorAll('.prof-class-popover').forEach((popover) => {
      popover.hidden = true;
      const trigger = popover.closest('.prof-class-menu')?.querySelector('.prof-class-menu-trigger');
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
    });
  }

  function renderHome() {
    if (!els.classesGrid) return;
    els.classesGrid.querySelectorAll('.prof-class-card').forEach((node) => node.remove());
    els.classesGrid.classList.remove('has-none');

    if (els.headStats) {
      let totalStudents = 0;
      Object.keys(store).forEach((classe) => {
        const entry = store[classe] || defaultClass();
        if (Array.isArray(entry.eleves)) totalStudents += entry.eleves.length;
      });
      const nb = Object.keys(store).length;
      els.headStats.textContent = `${nb} ${t(nb === 1 ? 'prof_stat_class' : 'prof_stat_classes')} • ${totalStudents} ${t('prof_stat_eleves')}`;
    }

    Object.keys(store).forEach((classe) => {
      const entry = store[classe] || defaultClass();
      const nbStudents = Array.isArray(entry.eleves) ? entry.eleves.length : 0;
      const nbSubjects =
        Object.keys(entry.semestres?.Semestre1 || {}).length +
        Object.keys(entry.semestres?.Semestre2 || {}).length;
      const level = levelLabel(classe);
      const progress = classProgress(entry, classe);
      const badgeContent = classIcon(classe) || escHtml(classSerie(classe) || inferLevel(classe) || '—');

      const card = document.createElement('article');
      card.className = 'prof-class-card';

      const top = document.createElement('div');
      top.className = 'prof-class-card-top';
      top.innerHTML = `
        <span class="prof-class-card-badge tone-default" aria-hidden="true">${badgeContent}</span>
        <div class="prof-class-menu">
          <button type="button" class="prof-class-menu-trigger" aria-label="${t('prof_class_actions_label')}" aria-haspopup="true" aria-expanded="false">
            ${ICON_DOTS}
          </button>
          <div class="prof-class-popover" role="menu" hidden>
            <button type="button" role="menuitem" data-act="rename">${ICON_RENAME}<span>${t('prof_rename_class')}</span></button>
            <button type="button" role="menuitem" data-act="delete" class="prof-class-popover-delete">${ICON_DELETE}<span>${t('prof_delete_class')}</span></button>
          </div>
        </div>
      `;

      const center = document.createElement('div');
      center.className = 'prof-class-card-center';
      center.innerHTML = `
        <h4 class="prof-class-card-name" data-name>${escHtml(classe)}</h4>
        ${level ? `<p class="prof-class-card-level">${level}</p>` : ''}
      `;

      const stats = document.createElement('div');
      stats.className = 'prof-class-stats';
      stats.innerHTML = `
        <div class="prof-class-stat">
          <span class="prof-class-stat-icon" aria-hidden="true">${ICON_STUDENTS}</span>
          <span class="prof-class-stat-value">${nbStudents}</span>
          <span class="prof-class-stat-label">${t('prof_stat_eleves_label')}</span>
        </div>
        <div class="prof-class-stat">
          <span class="prof-class-stat-icon" aria-hidden="true">${ICON_SUBJECTS}</span>
          <span class="prof-class-stat-value">${nbSubjects}</span>
          <span class="prof-class-stat-label">${t('prof_stat_matieres_label')}</span>
        </div>
      `;

      const progressEl = document.createElement('div');
      progressEl.className = 'prof-class-card-progress';
      progressEl.innerHTML = `
        <div class="prof-class-card-progress-head">
          <span>${t('prof_class_progress_label')}</span>
          <b>${progress}%</b>
        </div>
        <div class="prof-class-card-progress-track" role="progressbar" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100" aria-label="${t('prof_class_progress_label')}">
          <div class="prof-class-card-progress-bar" style="width:${progress}%"></div>
        </div>
      `;

      const actions = document.createElement('div');
      actions.className = 'prof-class-card-actions';
      const openBtn = document.createElement('button');
      openBtn.type = 'button';
      openBtn.className = 'prof-class-card-btn';
      openBtn.setAttribute('aria-label', `${t('prof_class_open')} ${classe}`);
      openBtn.innerHTML = `<span>${t('prof_open_class_btn')}</span> ${ICON_OPEN}`;
      openBtn.addEventListener('click', () => openClass(classe));
      actions.appendChild(openBtn);

      const trigger = top.querySelector('.prof-class-menu-trigger');
      const popover = top.querySelector('.prof-class-popover');

      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const willOpen = popover.hidden;
        closeAllClassPopovers();
        if (willOpen) {
          popover.hidden = false;
          trigger.setAttribute('aria-expanded', 'true');
        }
      });
      popover.querySelector('[data-act="rename"]').addEventListener('click', () => {
        closeAllClassPopovers();
        startRenameClass(card, classe);
      });
      popover.querySelector('[data-act="delete"]').addEventListener('click', () => {
        closeAllClassPopovers();
        deleteClass(classe);
      });

      card.append(top, center, stats, progressEl, actions);
      els.classesGrid.appendChild(card);
    });

    if (els.addClassCard && els.classesGrid.lastElementChild !== els.addClassCard) {
      els.classesGrid.appendChild(els.addClassCard);
    }
  }

  function escHtml(value) {
    const div = document.createElement('div');
    div.textContent = String(value);
    return div.innerHTML;
  }

  function startRenameClass(card, classe) {
    const nameEl = card.querySelector('[data-name]');
    const labelEl = card.querySelector('.prof-class-card-meta');
    const actionsEl = card.querySelector('.prof-class-card-actions');
    if (!nameEl) return;

    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 30;
    input.value = classe;
    input.className = 'prof-class-rename-input';
    nameEl.replaceWith(input);
    input.focus();
    input.select();

    if (labelEl) labelEl.hidden = true;
    actionsEl.classList.add('is-renaming');
    actionsEl.innerHTML = `
      <button type="button" class="primary-button prof-inline-ok" data-act="ok">${t('prof_student_form_ok')}</button>
      <button type="button" class="ghost-button prof-inline-cancel" data-act="cancel">${t('prof_ocr_cancel')}</button>
    `;

    const finish = (ok) => {
      if (ok) {
        const newName = input.value.trim();
        if (newName && newName !== classe) {
          if (store[newName]) {
            if (typeof showInfoDialog === 'function') showInfoDialog(t('prof_msg_class_exists'));
            startRenameClass(card, classe);
            return;
          }
          store[newName] = store[classe];
          delete store[classe];
          saveStore();
          renderHome();
          return;
        }
      }
      renderHome();
    };

    actionsEl.querySelector('[data-act="ok"]').addEventListener('click', () => finish(true));
    actionsEl.querySelector('[data-act="cancel"]').addEventListener('click', () => finish(false));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') finish(true);
      if (e.key === 'Escape') finish(false);
    });
  }

  function addClass() {
    const name = els.newClass.value.trim();
    if (!name) {
      if (typeof showInfoDialog === 'function') showInfoDialog(t('prof_msg_class_name_empty'));
      return;
    }
    if (store[name]) {
      if (typeof showInfoDialog === 'function') showInfoDialog(t('prof_msg_class_exists'));
      return;
    }
    store[name] = defaultClass();
    saveStore();
    els.newClass.value = '';
    showAddClassPromo();
    renderHome();
  }

  function showAddClassForm() {
    if (!els.addClassPromo || !els.addClassForm) return;
    els.addClassPromo.hidden = true;
    els.addClassForm.hidden = false;
    requestAnimationFrame(() => {
      if (els.newClass) els.newClass.focus();
    });
  }

  function showAddClassPromo() {
    if (!els.addClassPromo || !els.addClassForm) return;
    els.addClassForm.hidden = true;
    els.addClassPromo.hidden = false;
  }

  function deleteClass(classe) {
    if (typeof confirmModal !== 'undefined' && confirmModal.el) {
      confirmModal.show({
        message: t('prof_confirm_delete_class', { classe }),
        onConfirm: () => {
          delete store[classe];
          saveStore();
          if (activeClass === classe) {
            activeClass = null;
            showHome();
          } else {
            renderHome();
          }
        }
      });
    } else if (window.confirm(t('prof_confirm_delete_class', { classe }))) {
      delete store[classe];
      saveStore();
      renderHome();
    }
  }

  function openClass(classe) {
    activeClass = classe;
    activeSubject = null;
    if (els.editBanner) els.editBanner.hidden = true;
    showClassView();
  }

  /* ================= Vue 2 : Détail de la classe ================= */

  function renderSemesterTabs() {
    els.semesterTabs.innerHTML = '';
    SEMESTER_NAMES.forEach((sem) => {
      const count = Object.keys(store[activeClass]?.semestres?.[sem] || {}).length;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'prof-semester-tab' + (sem === activeSem ? ' is-active' : '');
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', String(sem === activeSem));
      btn.innerHTML = `${semLabel(sem)} <span class="prof-semester-tab-count">${count}</span>`;
      btn.addEventListener('click', () => {
        activeSem = sem;
        renderClassView();
      });
      els.semesterTabs.appendChild(btn);
    });
  }

  function renderClassView() {
    const classeData = store[activeClass] || defaultClass();
    els.classTitle.textContent = activeClass;
    els.classMeta.textContent = `${t('prof_stat_effectifs')} : ${classeData.eleves.length}`;

    els.studentForm.hidden = true;
    els.studentNom.value = '';
    els.studentPrenom.value = '';
    editingStudentId = null;
    els.studentFormOk.textContent = t('prof_student_form_ok');

    renderSemesterTabs();
    renderStudentsTable(classeData);
    renderSubjectsList(classeData);
  }

  function renderStudentsTable(classeData) {
    const students = classeData.eleves;
    els.studentsEmpty.hidden = students.length > 0;
    els.studentsEmpty.textContent = t('prof_students_empty');
    els.studentsTbody.innerHTML = '';
    const ranks = rankClass();

    students.forEach((student, index) => {
      const tr = document.createElement('tr');
      const avg = studentSemesterAverage(student.id);

      const rankCell = document.createElement('td');
      rankCell.className = 'prof-col-rank';
      rankCell.textContent = String(index + 1);

      const nomCell = document.createElement('td');
      nomCell.textContent = student.nom;

      const prenomCell = document.createElement('td');
      prenomCell.textContent = student.prenom;

      const avgCell = document.createElement('td');
      avgCell.className = 'prof-moyenne-cell';
      avgCell.textContent = avg === null ? '—' : avg.toFixed(2);
      if (avg !== null && typeof gradeClass === 'function') avgCell.classList.add(gradeClass(avg));

      const rangCell = document.createElement('td');
      rangCell.className = 'prof-moyenne-cell';
      rangCell.textContent = ranks[student.id] ? String(ranks[student.id]) : '—';

      const actionsCell = document.createElement('td');
      actionsCell.className = 'prof-col-actions';
      actionsCell.innerHTML = `
        <button type="button" class="ghost-button prof-row-action" data-act="bulletin">${t('prof_student_bulletin')}</button>
        <button type="button" class="ghost-button prof-row-action" data-act="edit">${t('prof_student_edit')}</button>
        <button type="button" class="ghost-button prof-row-action prof-danger-text" data-act="delete">${t('prof_student_delete')}</button>
      `;
      actionsCell.querySelector('[data-act="bulletin"]').addEventListener('click', () => showBulletin(student));
      actionsCell.querySelector('[data-act="edit"]').addEventListener('click', () => startEditStudent(student));
      actionsCell.querySelector('[data-act="delete"]').addEventListener('click', () => deleteStudent(student));

      tr.append(rankCell, nomCell, prenomCell, avgCell, rangCell, actionsCell);
      els.studentsTbody.appendChild(tr);
    });
  }

  function showStudentForm() {
    els.studentForm.hidden = false;
    els.studentForm.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    window.setTimeout(() => els.studentNom.focus({ preventScroll: true }), prefersReducedMotion ? 0 : 220);
  }

  function submitStudentForm() {
    const nom = els.studentNom.value.trim();
    const prenom = els.studentPrenom.value.trim();
    if (!nom && !prenom) return;
    const classeData = store[activeClass] || defaultClass();

    if (editingStudentId) {
      const student = classeData.eleves.find((s) => s.id === editingStudentId);
      if (student) {
        student.nom = nom;
        student.prenom = prenom;
      }
    } else {
      classeData.eleves.push({ id: newId(), nom, prenom });
    }
    saveStore();
    els.studentForm.hidden = true;
    els.studentNom.value = '';
    els.studentPrenom.value = '';
    editingStudentId = null;
    renderClassView();
  }

  function startEditStudent(student) {
    editingStudentId = student.id;
    els.studentNom.value = student.nom;
    els.studentPrenom.value = student.prenom;
    els.studentFormOk.textContent = t('prof_student_form_ok');
    showStudentForm();
  }

  function deleteStudent(student) {
    if (typeof confirmModal !== 'undefined' && confirmModal.el) {
      confirmModal.show({
        message: t('prof_confirm_delete_student'),
        onConfirm: () => {
          const classeData = store[activeClass] || defaultClass();
          classeData.eleves = classeData.eleves.filter((s) => s.id !== student.id);
          ['Semestre1', 'Semestre2'].forEach((sem) => {
            const semObj = store[activeClass]?.semestres?.[sem] || {};
            Object.values(semObj).forEach((record) => {
              if (record.notes && record.notes[student.id]) delete record.notes[student.id];
            });
          });
          saveStore();
          renderClassView();
        }
      });
    }
  }

  /* ---------- Bulletin d'un élève (modale) ---------- */

  function showBulletin(student) {
    const modal = document.createElement('div');
    modal.className = 'prof-ocr-modal prof-bulletin-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    const semObj = store[activeClass]?.semestres?.[activeSem] || {};
    const rows = Object.keys(semObj).map((matiere) => {
      const record = semObj[matiere];
      const moy = moyenneFromNotes(record.notes ? record.notes[student.id] : null, record.composition);
      return {
        matiere,
        coef: record.coefficient || 1,
        moy
      };
    });
    const withMoy = rows.filter((r) => r.moy !== null);
    const semesterAvg =
      withMoy.length && withMoy.reduce((s, r) => s + r.moy * r.coef, 0) / withMoy.reduce((s, r) => s + r.coef, 0);

    const body = rows.length
      ? `<div class="prof-bulletin-table-wrap"><table class="prof-bulletin-table">
           <thead><tr><th>${t('prof_pdf_eleve_col')}</th><th>${t('label_coefficient')}</th><th>${t('th_moyenne')}</th></tr></thead>
           <tbody>${rows
             .map(
               (r) =>
                 `<tr><td>${escHtml(showMatiere(r.matiere))}</td><td class="prof-ocr-col-rank">${r.coef}</td><td class="prof-moyenne-cell">${
                   r.moy === null ? '—' : r.moy.toFixed(2)
                 }</td></tr>`
             )
             .join('')}
           </tbody>
         </table></div>
         <div class="prof-bulletin-avg">
           <span>${t('prof_bulletin_semester_avg')}</span>
           <strong>${semesterAvg === null || semesterAvg === undefined ? '—' : semesterAvg.toFixed(2)}</strong>
           ${semesterAvg !== null && semesterAvg !== undefined && typeof getMention === 'function'
             ? `<span class="prof-bulletin-mention">${escHtml(getMention(semesterAvg).label)}</span>`
             : ''}
         </div>`
      : `<p class="prof-empty">${t('prof_subjects_empty')}</p>`;

    modal.innerHTML = `
      <div class="prof-ocr-overlay"></div>
      <div class="prof-ocr-modal-card">
        <div class="prof-ocr-header">
          <h3>${escHtml(t('prof_bulletin_title', { eleve: getStudentName(student) }))}</h3>
          <p class="prof-ocr-subtitle">${escHtml(activeClass)} • ${escHtml(semLabel(activeSem))}</p>
        </div>
        <div class="prof-ocr-table-wrap">${body}</div>
        <div class="prof-ocr-actions">
          <div class="prof-ocr-actions-right">
            <button type="button" class="primary-button" data-close>${t('prof_bulletin_close')}</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    const close = () => {
      modal.remove();
      document.body.style.overflow = '';
    };
    modal.querySelector('[data-close]').addEventListener('click', close);
    modal.querySelector('.prof-ocr-overlay').addEventListener('click', close);
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });
    document.body.style.overflow = 'hidden';
  }

  /* ---------- Matières du semestre ---------- */

  function fillSubjectSelect() {
    els.subjectSelect.innerHTML = '';
    getAvailableMatieres(activeClass).forEach((matiere) => {
      const opt = document.createElement('option');
      opt.value = matiere;
      opt.textContent = showMatiere(matiere);
      els.subjectSelect.appendChild(opt);
    });
    if (!els.subjectSelect.options.length) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = t('option_matiere_default');
      els.subjectSelect.appendChild(opt);
    }
  }

  function renderSubjectsList(classeData) {
    const semObj = classeData.semestres[activeSem] || {};
    const names = Object.keys(semObj);
    els.subjectsEmpty.hidden = names.length > 0;
    els.subjectsEmpty.textContent = t('prof_subjects_empty');
    els.subjectsList.innerHTML = '';

    names.forEach((matiere) => {
      const record = semObj[matiere];
      const avg = classeAverageForSubject(record);
      const item = document.createElement('div');
      item.className = 'prof-subject-item';
      item.innerHTML = `
        <div class="prof-subject-item-main">
          <span class="prof-subject-item-name">${escHtml(showMatiere(matiere))}</span>
          <span class="prof-subject-item-meta">${t('label_coefficient')} : ${record.coefficient || 1} • ${
        record.composition ? t('radio_oui') : t('radio_non')
      } ${t('legend_composition')}</span>
          <span class="prof-subject-item-avg"><span>${t('th_moyenne')} :</span> ${
        avg === null ? '—' : avg.toFixed(2)
      }</span>
        </div>
        <div class="prof-subject-item-actions">
          <button type="button" class="secondary-button prof-add-btn" data-act="open">${t('prof_subject_open')}</button>
          <button type="button" class="ghost-button prof-danger-text" data-act="delete">${t('prof_subject_delete')}</button>
        </div>
      `;
      item.querySelector('[data-act="open"]').addEventListener('click', () => openSubject(matiere));
      item.querySelector('[data-act="delete"]').addEventListener('click', () => deleteSubject(matiere));
      els.subjectsList.appendChild(item);
    });
  }

  function deleteSubject(matiere) {
    if (typeof confirmModal !== 'undefined' && confirmModal.el) {
      confirmModal.show({
        message: t('prof_confirm_delete_subject', { matiere: showMatiere(matiere) }),
        onConfirm: () => {
          deleteSubjectRecord(activeClass, activeSem, matiere);
          renderClassView();
        }
      });
    }
  }

  function createSubject() {
    const matiere = els.subjectSelect.value;
    if (!matiere) {
      if (typeof showInfoDialog === 'function') showInfoDialog(t('prof_msg_subject_select'));
      return;
    }
    if (getSubjectRecord(activeClass, activeSem, matiere)) {
      if (typeof showInfoDialog === 'function') showInfoDialog(t('prof_msg_subject_exists'));
      return;
    }
    const coef = Number(els.subjectCoef.value);
    const composition = true;
    setSubjectRecord(activeClass, activeSem, matiere, {
      coefficient: Number.isInteger(coef) && coef >= 1 && coef <= 8 ? coef : 1,
      composition,
      notes: {}
    });
    els.subjectForm.hidden = true;
    openSubject(matiere);
  }

  /* ================= Vue 3 : Éditeur de matière ================= */

  function refreshMatiereSelect() {
    const previous = els.matiere.value;
    els.matiere.innerHTML = '';

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = t('option_matiere_default');
    els.matiere.appendChild(defaultOption);

    getAvailableMatieres(activeClass).forEach((matiere) => {
      const option = document.createElement('option');
      option.value = matiere;
      option.textContent = typeof translateMatiere === 'function' ? translateMatiere(matiere) : matiere;
      els.matiere.appendChild(option);
    });

    const autre = document.createElement('option');
    autre.value = '__autre__';
    autre.textContent = t('prof_matiere_custom_option');
    els.matiere.appendChild(autre);

    if (previous === '__autre__' || [...els.matiere.options].some((option) => option.value === previous)) {
      els.matiere.value = previous;
    }
    updateCustomGroupVisibility();
  }

  function updateCustomGroupVisibility() {
    const isCustom = els.matiere.value === '__autre__';
    if (!els.customGroup) return;
    els.customGroup.hidden = !isCustom;
    if (isCustom && activeSubject) {
      els.customInput.value = activeSubject;
    }
  }

  function buildSnapshot(record) {
    const snap = {
      coefficient: record ? record.coefficient : 1,
      composition: record ? record.composition : true,
      notes: {}
    };
    if (record && record.notes) {
      Object.keys(record.notes).forEach((id) => {
        snap.notes[id] = Object.assign({}, record.notes[id]);
      });
    }
    return snap;
  }

  function openSubject(matiere) {
    activeSubject = matiere;
    refreshMatiereSelect();
    syncHiddenSelects();
    const record = getSubjectRecord(activeClass, activeSem, activeSubject);
    els.coefficient.value = record ? record.coefficient : 1;
    const radio = document.querySelector(
      record && record.composition === false
        ? 'input[name="prof-composition"][value="non"]'
        : 'input[name="prof-composition"][value="oui"]'
    );
    if (radio) radio.checked = true;
    snapshot = buildSnapshot(record);

    if (els.context) updateContextLine();
    loadEditorRows();
    clearFilePreview();
    renderRows();
    updateSummary();
    updateEditBanner();
    showSubjectView();
  }

  function syncHiddenSelects() {
    if (els.classe) {
      if (![...els.classe.options].some((o) => o.value === activeClass)) {
        const opt = document.createElement('option');
        opt.value = activeClass;
        opt.textContent = activeClass;
        els.classe.appendChild(opt);
      }
      els.classe.value = activeClass;
    }
    if (els.semestre) els.semestre.value = activeSem;
    if (els.matiere) {
      if (![...els.matiere.options].some((o) => o.value === activeSubject)) {
        const opt = document.createElement('option');
        opt.value = activeSubject;
        opt.textContent = activeSubject;
        els.matiere.appendChild(opt);
      }
      els.matiere.value = activeSubject;
    }
  }

  function loadEditorRows() {
    const record = getSubjectRecord(activeClass, activeSem, activeSubject);
    const notes = record && record.notes ? record.notes : {};
    currentRows = (store[activeClass]?.eleves || []).map((eleve) => {
      const n = notes[eleve.id] || {};
      return {
        id: eleve.id,
        nom: eleve.nom,
        prenom: eleve.prenom,
        d1: typeof n.d1 === 'string' ? n.d1 : '',
        d2: typeof n.d2 === 'string' ? n.d2 : '',
        compo: typeof n.compo === 'string' ? n.compo : ''
      };
    });
  }

  function updateContextLine() {
    els.context.textContent = `${activeClass} • ${semLabel(activeSem)} • ${showMatiere(activeSubject)}`;
  }

  /* ---------- Rendu du tableau de notes ---------- */

  function createTextInput(row, field, placeholder) {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'prof-text';
    input.value = row[field] || '';
    input.placeholder = placeholder || '';
    input.setAttribute('aria-label', placeholder || field);
    input.dataset.field = field;
    input.addEventListener('input', onCellInput);
    return input;
  }

  function createNoteInput(row, field) {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'note-input prof-note';
    input.inputMode = 'decimal';
    input.maxLength = 5;
    input.value = row[field] || '';
    input.dataset.field = field;
    input.addEventListener('input', onCellInput);
    noteFeedback(input);
    return input;
  }

  function noteFeedback(input) {
    const raw = input.value.trim();
    input.classList.remove('is-valid', 'is-invalid');
    if (!raw) return;
    input.classList.toggle('is-valid', parseNote(raw).valid);
    input.classList.toggle('is-invalid', !parseNote(raw).valid);
  }

  function refreshAverageCell(cell, row) {
    const avg = createAverage(row);
    if (avg === null) {
      cell.textContent = '—';
      cell.className = 'prof-moyenne-cell';
      return;
    }
    cell.textContent = avg.toFixed(2);
    cell.className = 'prof-moyenne-cell ' + (typeof gradeClass === 'function' ? gradeClass(avg) : '');
  }

  function createAverage(row) {
    return moyenneFromNotes(row, hasComposition());
  }

  function onCellInput(event) {
    const input = event.currentTarget;
    const tr = input.closest('tr');
    const index = tr ? Array.prototype.indexOf.call(els.tbody.children, tr) : -1;
    if (index < 0 || index >= currentRows.length) return;
    const field = input.dataset.field;
    if (!field) return;
    currentRows[index][field] = input.value;
    if (NOTE_FIELDS.includes(field)) noteFeedback(input);
    const avgCell = tr.querySelector('.prof-moyenne-cell');
    if (avgCell) refreshAverageCell(avgCell, currentRows[index]);
    updateSummary();
    updateEditBanner();
  }

  function renderRows() {
    if (!els.tbody) return;
    els.tbody.innerHTML = '';
    const showCompo = hasComposition();
    els.thComposition.hidden = !showCompo;
    els.empty.hidden = currentRows.length > 0;

    currentRows.forEach((row, index) => {
      const tr = document.createElement('tr');
      tr.className = 'prof-row';

      const rankCell = document.createElement('td');
      rankCell.className = 'prof-col-rank';
      rankCell.textContent = String(index + 1);

      const nameCell = document.createElement('td');
      nameCell.className = 'prof-col-name prof-name-cells';
      nameCell.textContent = getStudentName(row);

      const d1Cell = document.createElement('td');
      d1Cell.appendChild(createNoteInput(row, 'd1'));

      const d2Cell = document.createElement('td');
      d2Cell.appendChild(createNoteInput(row, 'd2'));

      const compoCell = document.createElement('td');
      compoCell.appendChild(createNoteInput(row, 'compo'));

      const avgCell = document.createElement('td');
      avgCell.className = 'prof-moyenne-cell';
      refreshAverageCell(avgCell, row);

      tr.append(rankCell, nameCell, d1Cell, d2Cell, compoCell, avgCell);
      els.tbody.appendChild(tr);
    });

    updateSummary();
  }

  function addStudent() {
    const eleves = store[activeClass].eleves;
    const id = newId();
    eleves.push({ id, nom: '', prenom: '' });
    saveStore();
    currentRows.push({ id, nom: '', prenom: '', d1: '', d2: '', compo: '' });
    renderRows();
    updateEditBanner();
    const lastRow = els.tbody.lastElementChild;
    const noteInput = lastRow ? lastRow.querySelector('.prof-note') : null;
    if (noteInput) {
      lastRow.scrollIntoView({ block: 'nearest', inline: 'end', behavior: 'smooth' });
      window.setTimeout(() => noteInput.focus({ preventScroll: true }), 60);
    }
  }

  /* ---------- Résumé & exports ---------- */

  function updateSummary() {
    const hasRows = currentRows.length > 0 && Boolean(activeSubject);
    const ready = Boolean(activeSubject) && validCoefficient();
    const averages = currentRows.map(createAverage).filter((value) => value !== null);

    els.exportPdf.disabled = !ready || !hasRows || !averages.length;
    els.exportCsv.disabled = !ready || !hasRows || !averages.length;
    els.summary.hidden = false;

    if (!els.summaryStats) return;
    const hasData = averages.length > 0;
    const stats = [
      { label: 'prof_stat_effectifs', value: currentRows.length },
      { label: 'prof_stat_classe_avg', value: hasData ? (averages.reduce((sum, v) => sum + v, 0) / averages.length).toFixed(2) : '—' },
      { label: 'prof_stat_best', value: hasData ? Math.max(...averages).toFixed(2) : '—' },
      { label: 'prof_stat_worst', value: hasData ? Math.min(...averages).toFixed(2) : '—' }
    ];
    els.summaryStats.innerHTML = '';
    stats.forEach((stat) => {
      const div = document.createElement('div');
      div.className = 'prof-stat';
      const strong = document.createElement('strong');
      strong.textContent = stat.value;
      const span = document.createElement('span');
      span.textContent = t(stat.label);
      div.append(strong, span);
      els.summaryStats.appendChild(div);
    });
  }

  function getWorkingNotesMap() {
    const notes = {};
    currentRows.forEach((row) => {
      notes[row.id] = {
        d1: row.d1 || '',
        d2: row.d2 || '',
        compo: row.compo || ''
      };
    });
    return notes;
  }

  function notesEqual(a, b) {
    const keysA = Object.keys(a).sort();
    const keysB = Object.keys(b).sort();
    if (keysA.length !== keysB.length) return false;
    return keysA.every((k, i) => {
      if (k !== keysB[i]) return false;
      const na = a[k];
      const nb = b[k];
      return NOTE_FIELDS.every((f) => String(na ? na[f] || '' : '') === String(nb ? nb[f] || '' : ''));
    });
  }

  /* ---------- Bannière "Ancienne / Nouvelle valeur" ---------- */

  function computeAverage(notes, composition) {
    const avg = (store[activeClass]?.eleves || [])
      .map((e) => moyenneFromNotes(notes[e.id], composition))
      .filter((v) => v !== null);
    if (!avg.length) return null;
    return avg.reduce((s, v) => s + v, 0) / avg.length;
  }

  function updateEditBanner() {
    if (!els.editBanner) return;
    const hasChanges =
      !snapshot ||
      Number(els.coefficient.value) !== snapshot.coefficient ||
      hasComposition() !== snapshot.composition ||
      !notesEqual(getWorkingNotesMap(), snapshot.notes || {});

    const oldAvg = snapshot ? computeAverage(snapshot.notes || {}, snapshot.composition) : null;
    const newAvg = hasChanges && activeSubject ? computeAverage(getWorkingNotesMap(), hasComposition()) : null;
    const show = Boolean(activeSubject) && hasChanges;

    els.editBanner.hidden = !show;
    if (!show) {
      els.editBanner.classList.remove('is-visible');
      return;
    }
    els.editTitle.textContent = t('prof_edit_banner_title', { matiere: showMatiere(activeSubject) });
    els.editValues.innerHTML =
      `<span>${t('prof_edit_old_value', { v: oldAvg === null ? '—' : oldAvg.toFixed(2) })}</span>` +
      `<span class="prof-edit-arrow">→</span>` +
      `<span>${t('prof_edit_new_value', { v: newAvg === null ? '—' : newAvg.toFixed(2) })}</span>`;
    void els.editBanner.offsetWidth;
    els.editBanner.classList.add('is-visible');
  }

  function commitSubject() {
    if (!activeSubject) return;
    setSubjectRecord(activeClass, activeSem, activeSubject, {
      coefficient: validCoefficient() ? Number(els.coefficient.value) : 1,
      composition: hasComposition(),
      notes: getWorkingNotesMap()
    });
    snapshot = {
      coefficient: Number(els.coefficient.value),
      composition: hasComposition(),
      notes: getWorkingNotesMap()
    };
    updateEditBanner();
    if (typeof showInfoDialog === 'function') showInfoDialog(t('prof_save_success'));
  }

  function cancelSubjectChanges() {
    if (!snapshot) return;
    els.coefficient.value = snapshot.coefficient;
    const radio = document.querySelector(
      snapshot.composition === false
        ? 'input[name="prof-composition"][value="non"]'
        : 'input[name="prof-composition"][value="oui"]'
    );
    if (radio) radio.checked = true;
    loadEditorRows();
    renderRows();
    updateSummary();
    updateEditBanner();
  }

  window.populateProfRows = function (ocrVerifiedRows) {
    if (!Array.isArray(ocrVerifiedRows) || !ocrVerifiedRows.length) return;
    const classeData = store[activeClass] || defaultClass();
    let added = false;
    const conflicts = []; // { row, field, oldValue, newValue }
    const safeOps = []; // { type: 'new-row' | 'field', ... } applied immediately

    ocrVerifiedRows.forEach((r) => {
      const nom = String(r.nom || '').trim();
      const prenom = String(r.prenom || '').trim();
      if (!nom && !prenom) return;
      let eleve = classeData.eleves.find((e) => isSameString(e.nom, nom) && isSameString(e.prenom, prenom));
      if (!eleve) {
        eleve = { id: newId(), nom, prenom };
        classeData.eleves.push(eleve);
        added = true;
      }
      let row = currentRows.find((x) => x.id === eleve.id);
      if (!row) {
        row = { id: eleve.id, nom: eleve.nom, prenom: eleve.prenom, d1: '', d2: '', compo: '' };
        currentRows.push(row);
      }

      ['d1', 'd2', 'compo'].forEach((field) => {
        const incoming = r[field] === undefined || r[field] === null ? '' : String(r[field]).trim();
        const existing = row[field] === undefined || row[field] === null ? '' : String(row[field]).trim();

        if (!incoming) {
          // Rien lu par l'OCR pour ce champ : on ne touche jamais à une valeur déjà saisie.
          return;
        }
        if (!existing || existing === incoming) {
          // Pas de perte de données possible : on applique tout de suite.
          row[field] = r[field];
          return;
        }
        // Une valeur différente existe déjà : on demandera confirmation avant d'écraser.
        conflicts.push({ row, field, oldValue: existing, newValue: r[field] });
      });
    });

    const finish = () => {
      if (added) saveStore();
      renderRows();
      updateEditBanner();
    };

    if (!conflicts.length) {
      finish();
      return;
    }

    if (typeof confirmModal !== 'undefined' && confirmModal.el) {
      confirmModal.show({
        message: t('prof_ocr_overwrite_confirm', { count: conflicts.length }),
        okLabel: t('prof_ocr_overwrite_confirm_ok'),
        onConfirm: () => {
          conflicts.forEach(({ row, field, newValue }) => {
            row[field] = newValue;
          });
          finish();
        },
        onDismiss: () => {
          // L'utilisateur refuse l'écrasement : on garde les valeurs existantes
          // mais on applique quand même les nouveaux élèves / champs non conflictuels.
          finish();
        }
      });
    } else {
      // Pas de modale disponible : par sécurité, on ne prend jamais le risque
      // d'écraser une note déjà saisie sans confirmation explicite.
      finish();
    }
  };

  window.getProfContext = function () {
    return {
      classe: activeClass || '',
      semestre: activeSem,
      matiere: activeSubject || '',
      coefficient: validCoefficient() ? Number(els.coefficient.value) : 0
    };
  };

  /* ---------------------- Exports --------------------- */

  function slugify(text) {
    return (
      String(text)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Za-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'releve'
    );
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function exportCheck() {
    if (!activeClass) {
      if (typeof showInfoDialog === 'function') showInfoDialog(t('prof_msg_classe_requise'));
      return false;
    }
    if (!activeSubject) {
      if (typeof showInfoDialog === 'function') showInfoDialog(t('prof_msg_matiere_requise'));
      return false;
    }
    if (!validCoefficient()) {
      if (typeof showInfoDialog === 'function') showInfoDialog(t('prof_msg_coefficient_requis'));
      return false;
    }
    const hasData = currentRows.some((r) => r.d1 || r.d2 || r.compo);
    if (!hasData) {
      if (typeof showInfoDialog === 'function') showInfoDialog(t('prof_msg_aucun_eleve'));
      return false;
    }
    return true;
  }

  function exportCsv() {
    if (!exportCheck()) return;
    const headers = ['N°', t('prof_th_eleve'), t('label_devoir1'), t('label_devoir2')];
    if (hasComposition()) headers.push(t('label_composition'));
    headers.push(t('th_moyenne'), t('prof_pdf_mention_col'));

    const csvRow = (arr) => arr.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';');

    const lines = currentRows.map((row, index) => {
      const avg = createAverage(row);
      const cells = [index + 1, getStudentName(row), row.d1 || '', row.d2 || ''];
      if (hasComposition()) cells.push(row.compo || '');
      cells.push(avg === null ? '' : avg.toFixed(2));
      cells.push(avg === null ? '' : typeof getMention === 'function' ? getMention(avg).label : '');
      return csvRow(cells);
    });

    const content = '\uFEFF' + [csvRow(headers), ...lines].join('\r\n');
    downloadBlob(new Blob([content], { type: 'text/csv;charset=utf-8;' }), `releve_${slugify(activeSubject)}_${activeClass}.csv`);
  }

  function exportPdf() {
    if (!exportCheck()) return;
    if (!window.jspdf) {
      if (typeof showInfoDialog === 'function') showInfoDialog(t('msg_jspdf_manquant'));
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40;
    const contentRight = pageWidth - margin;

    const matiere = activeSubject;
    const classe = activeClass;
    const semestreLabel = semLabel(activeSem);
    const coefficient = Number(els.coefficient.value);
    const showCompo = hasComposition();

    const cols = [
      { label: '#', x: margin, width: 24, align: 'left' },
      { label: t('prof_th_eleve'), x: margin + 24, width: 192, align: 'left' },
      { label: t('pdf_th_devoir1'), x: margin + 216, width: 62, align: 'center' },
      { label: t('pdf_th_devoir2'), x: margin + 278, width: 62, align: 'center' }
    ];
    if (showCompo) cols.push({ label: t('pdf_th_compo'), x: margin + 340, width: 62, align: 'center' });
    const moyXBase = showCompo ? margin + 402 : margin + 340;
    cols.push({ label: t('pdf_th_moyenne'), x: moyXBase, width: 78, align: 'right' });
    const mentionX = moyXBase + 78;
    cols.push({ label: t('prof_pdf_mention_col'), x: mentionX, width: contentRight - mentionX, align: 'left' });

    const tableWidth = contentRight - margin;
    const BAND_HEIGHT = 76;

    const drawBrandBand = () => {
      doc.setFillColor(23, 43, 75);
      doc.rect(0, 0, pageWidth, BAND_HEIGHT, 'F');
      doc.setTextColor(255, 250, 240);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.text(t('pdf_etablissement'), margin, 32);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(t('pdf_app_name'), margin, 52);
      doc.setFont('helvetica', 'bold');
      doc.text(t('prof_pdf_title', { matiere }), contentRight, 32, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.text(
        `${t('pdf_classe', { classe })} • ${semestreLabel} • ${t('label_coefficient')} : ${coefficient}`,
        contentRight,
        52,
        { align: 'right' }
      );
      return BAND_HEIGHT;
    };

    const drawTableHeader = (y) => {
      doc.setFontSize(8.5);
      doc.setFillColor(231, 234, 239);
      doc.rect(margin, y, tableWidth, 20, 'F');
      doc.setTextColor(16, 23, 35);
      doc.setFont('helvetica', 'bold');
      cols.forEach((col) => {
        doc.text(col.label, col.align === 'right' ? col.x + col.width - 4 : col.x + 4, y + 13, { align: col.align });
      });
      return y + 20;
    };

    const rowHeight = 20;
    let y = drawBrandBand();
    y = drawTableHeader(y + 12);

    doc.setFontSize(9);
    currentRows.forEach((row, index) => {
      if (y > pageHeight - 64) {
        doc.addPage();
        y = drawBrandBand();
        y = drawTableHeader(y + 12);
      }
      doc.setDrawColor(214, 220, 228);
      doc.rect(margin, y, tableWidth, rowHeight, 'S');
      doc.setTextColor(51, 58, 68);
      doc.setFont('helvetica', 'normal');

      doc.text(String(index + 1), cols[0].x + 4, y + 13);
      doc.text(getStudentName(row).substring(0, 34), cols[1].x + 4, y + 13);
      const d1 = row.d1.trim() || '—';
      const d2 = row.d2.trim() || '—';
      const compo = row.compo.trim() || '—';
      doc.text(d1, cols[2].x + cols[2].width / 2, y + 13, { align: 'center' });
      doc.text(d2, cols[3].x + cols[3].width / 2, y + 13, { align: 'center' });
      let nextTextIndex = 4;
      if (showCompo) {
        doc.text(compo, cols[4].x + cols[4].width / 2, y + 13, { align: 'center' });
        nextTextIndex = 5;
      }
      const avg = createAverage(row);
      const avgCol = cols[nextTextIndex];
      doc.setFont('helvetica', 'bold');
      doc.text(avg === null ? '—' : avg.toFixed(2), avgCol.x + avgCol.width - 4, y + 13, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      if (avg !== null && typeof getMention === 'function') {
        doc.text(getMention(avg).label, cols[nextTextIndex + 1].x + 4, y + 13);
      }
      y += rowHeight;
    });

    doc.setFontSize(8);
    doc.setTextColor(113, 128, 120);
    doc.setFont('helvetica', 'normal');
    doc.text(t('pdf_footer_doc'), margin, pageHeight - 28);
    doc.text(`${t('pdf_app_name')} — ${t('pdf_etablissement')}`, contentRight, pageHeight - 28, { align: 'right' });

    doc.save(`releve_${slugify(matiere)}_${classe}.pdf`);
  }

  /* ------------------- Preview fichier ------------------- */

  function handleFile(file) {
    if (!file) return;
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    const isImage = /^image\//.test(file.type) || /\.(png|jpe?g|webp|gif|bmp)$/i.test(file.name);
    if (!isPdf && !isImage) {
      if (typeof showInfoDialog === 'function') showInfoDialog(t('prof_file_type_error'));
      return;
    }
    clearFilePreview();
    fileObjectUrl = URL.createObjectURL(file);
    els.fileName.textContent = file.name;
    if (isImage) {
      els.fileImg.src = fileObjectUrl;
      els.fileImg.hidden = false;
      els.filePdf.hidden = true;
      els.filePdf.removeAttribute('src');
    } else {
      els.filePdf.src = fileObjectUrl;
      els.filePdf.hidden = false;
      els.fileImg.hidden = true;
      els.fileImg.removeAttribute('src');
    }
    els.filePreview.hidden = false;
    if (els.previewLabel) els.previewLabel.hidden = false;
    if (typeof els.filePreview.scrollIntoView === 'function') {
      els.filePreview.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'nearest' });
    }
    if (typeof window.onProfFileSelected === 'function') {
      window.onProfFileSelected(file, isImage);
    }
  }

  function clearFilePreview() {
    if (fileObjectUrl) {
      URL.revokeObjectURL(fileObjectUrl);
      fileObjectUrl = null;
    }
    els.fileImg.hidden = true;
    els.fileImg.removeAttribute('src');
    els.filePdf.hidden = true;
    els.filePdf.removeAttribute('src');
    els.filePreview.hidden = true;
    if (els.previewLabel) els.previewLabel.hidden = true;
    if (typeof window.onProfFileCleared === 'function') window.onProfFileCleared();
  }

  /* ===================== Events ===================== */

  if (els.togglePassword && els.password) {
    els.togglePassword.addEventListener('click', () => {
      const show = els.password.type === 'password';
      els.password.type = show ? 'text' : 'password';
      els.togglePassword.setAttribute('aria-pressed', String(show));
      els.togglePassword.setAttribute('aria-label', show ? 'Masquer le mot de passe' : 'Afficher le mot de passe');
      els.password.focus();
    });
  }

  if (els.loginForm) {
    els.loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const password = els.password.value;
      if (!password) {
        showLoginError(els.loginError, t('prof_login_error'));
        return;
      }
      els.loginError.hidden = true;
      const hash = await hashPassword(password);
      if (hash && hash === PROF_PASSWORD_HASH) {
        setAuthenticated(PROF_AUTH_VALUE);
        showConsole();
        return;
      }
      showLoginError(els.loginError, t('prof_login_error'));
      els.password.value = '';
      els.password.focus();
    });
  }

  if (els.logoutBtn) {
    els.logoutBtn.addEventListener('click', () => {
      setAuthenticated(null);
      showLogin();
    });
  }

  if (els.backBtn) {
    els.backBtn.addEventListener('click', () => {
      if (!els.viewSubject.hidden && activeSubject) {
        const pending = !els.editBanner.hidden;
        if (pending && typeof confirmModal !== 'undefined' && confirmModal.el) {
          confirmModal.show({
            message: t('prof_edit_banner_title', { matiere: showMatiere(activeSubject) }),
            okLabel: t('prof_edit_annuler'),
            danger: true,
            onConfirm: () => showClassView()
          });
        } else {
          showClassView();
        }
      } else if (!els.viewClass.hidden) {
        showHome();
      } else {
        showHome();
      }
    });
  }

  if (els.addClassBtn) {
    els.addClassBtn.addEventListener('click', addClass);
    els.newClass.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addClass();
    });
  }

  if (els.addClassOpen) {
    els.addClassOpen.addEventListener('click', showAddClassForm);
  }
  if (els.addClassCancel) {
    els.addClassCancel.addEventListener('click', showAddClassPromo);
  }
  if (els.addClassForm) {
    els.addClassForm.addEventListener('submit', (e) => {
      e.preventDefault();
      addClass();
    });
  }

  document.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof Element) || !target.closest('.prof-class-menu')) {
      closeAllClassPopovers();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllClassPopovers();
  });

  if (els.studentAdd) {
    els.studentAdd.addEventListener('click', () => {
      if (editingStudentId) {
        startEditStudent(store[activeClass].eleves.find((s) => s.id === editingStudentId));
      } else {
        editingStudentId = null;
        els.studentNom.value = '';
        els.studentPrenom.value = '';
        els.studentFormOk.textContent = t('prof_student_form_ok');
        showStudentForm();
      }
    });
  }

  if (els.studentForm) {
    els.studentForm.addEventListener('submit', (e) => {
      e.preventDefault();
      submitStudentForm();
    });
    els.studentFormCancel.addEventListener('click', () => {
      els.studentForm.hidden = true;
      els.studentNom.value = '';
      els.studentPrenom.value = '';
      editingStudentId = null;
    });
  }

  if (els.subjectAdd) {
    els.subjectAdd.addEventListener('click', () => {
      fillSubjectSelect();
      els.subjectCoef.value = '';
      els.subjectForm.hidden = !els.subjectForm.hidden;
      if (!els.subjectForm.hidden) {
        window.setTimeout(() => els.subjectSelect.focus(), prefersReducedMotion ? 0 : 200);
      }
    });
  }

  if (els.subjectFormOk) {
    els.subjectFormOk.addEventListener('click', createSubject);
    els.subjectFormCancel.addEventListener('click', () => {
      els.subjectForm.hidden = true;
    });
  }

  if (els.editCancel) {
    els.editCancel.addEventListener('click', cancelSubjectChanges);
    els.editSave.addEventListener('click', commitSubject);
  }

  els.coefficient.addEventListener('input', () => {
    updateSummary();
    updateEditBanner();
  });

  document.querySelectorAll('input[name="prof-composition"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      renderRows();
      updateEditBanner();
    });
  });

  if (els.matiere) {
    els.matiere.addEventListener('change', () => {
      const value = els.matiere.value;
      if (value === '' || value === '__autre__') {
        updateCustomGroupVisibility();
        return;
      }
      if (value !== activeSubject && value) {
        activeSubject = value;
        updateCustomGroupVisibility();
        const record = getSubjectRecord(activeClass, activeSem, activeSubject);
        els.coefficient.value = record ? record.coefficient : 1;
        const radio = document.querySelector(
          record && record.composition === false
            ? 'input[name="prof-composition"][value="non"]'
            : 'input[name="prof-composition"][value="oui"]'
        );
        if (radio) radio.checked = true;
        snapshot = buildSnapshot(record);
        if (els.context) updateContextLine();
        loadEditorRows();
        renderRows();
        updateSummary();
        updateEditBanner();
      }
    });
  }

  if (els.customInput) {
    els.customInput.addEventListener('input', updateSummary);
  }

  els.dropzone.addEventListener('click', () => els.fileInput.click());
  els.dropzone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      els.fileInput.click();
    }
  });
  els.fileInput.addEventListener('change', (event) => {
    handleFile(event.target.files && event.target.files[0]);
  });
  els.dropzone.addEventListener('dragover', (event) => {
    event.preventDefault();
    els.dropzone.classList.add('is-dragging');
  });
  els.dropzone.addEventListener('dragleave', () => els.dropzone.classList.remove('is-dragging'));
  els.dropzone.addEventListener('drop', (event) => {
    event.preventDefault();
    els.dropzone.classList.remove('is-dragging');
    handleFile(event.dataTransfer.files && event.dataTransfer.files[0]);
  });
  els.fileRemove.addEventListener('click', () => {
    clearFilePreview();
    els.fileInput.value = '';
  });

  if (els.addStudent) {
    els.addStudent.addEventListener('click', addStudent);
  }

  if (els.exportPdf) els.exportPdf.addEventListener('click', exportPdf);
  if (els.exportCsv) els.exportCsv.addEventListener('click', exportCsv);

  if (els.saveBtn) {
    els.saveBtn.addEventListener('click', commitSubject);
  }

  /* ------- OCR / i18n : hooks ------- */

  window.refreshProfesseurTexts = function () {
    if (!isAuthenticated()) return;
    if (!els.screen.classList.contains('is-active')) return;
    if (activeSubject) {
      refreshMatiereSelect();
      renderRows();
      updateSummary();
      updateEditBanner();
    } else if (activeClass) {
      renderClassView();
    } else {
      renderHome();
    }
  };

  function init() {
    if (!els.screen || !els.loginCard || !els.console) return;
    loadStore();
    const isActiveScreen = els.screen.classList.contains('is-active');
    if (isAuthenticated()) {
      els.loginCard.hidden = true;
      els.console.hidden = false;
      if (isActiveScreen) renderHome();
    } else {
      els.loginCard.hidden = false;
      els.console.hidden = true;
    }

    if ('MutationObserver' in window) {
      const observer = new MutationObserver(() => {
        if (els.screen.classList.contains('is-active')) {
          if (isAuthenticated()) showConsole();
          else showLogin();
        }
      });
      observer.observe(els.screen, { attributes: true, attributeFilter: ['class'] });
    }
  }

  init();
})();