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
  const PROF_ACTIVITY_KEY = 'lynaqe_prof_activity';
  const PROF_TRASH_KEY = 'lynaqe_prof_trash';
  const PROF_OWNER_KEY = 'lynaqe_prof_owner';
  const PROF_TRASH_LIMIT = 30;
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
    resetDataBtn: $('prof-reset-data-btn'),

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
    trashBtn: $('prof-trash-btn'),
    trashCount: $('prof-trash-count'),

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
    editSave: $('prof-edit-save'),

    viewDash: $('prof-view-dash'),
    viewStudents: $('prof-view-students'),
    viewRanking: $('prof-view-ranking'),
    viewStats: $('prof-view-stats'),
    tabDash: $('prof-tab-dash'),
    tabClasses: $('prof-tab-classes'),
    tabStudents: $('prof-tab-students'),
    tabRanking: $('prof-tab-ranking'),
    tabStats: $('prof-tab-stats'),
    sidebar: $('prof-sidebar'),
    mobileNavBtn: $('prof-mobile-nav-btn'),
    dashHeadStats: $('prof-dash-head-stats'),
    dashQuick: $('prof-dash-quick'),
    dashActivity: $('prof-dash-activity'),
    dashRankPanel: $('prof-dash-rank-panel'),
    dashStatsPanel: $('prof-dash-stats-panel'),
    dashStudentsPanel: $('prof-dash-students-panel'),
    dashRankClassSel: $('prof-dash-rank-class'),
    dashRankSubjectSel: $('prof-dash-rank-subject'),
    dashRankBody: $('prof-dash-rank-body'),
    dashStatsClassSel: $('prof-dash-stats-class'),
    dashStatsBody: $('prof-dash-stats-body'),
    dashSearch: $('prof-dash-search'),
    dashFilterClass: $('prof-dash-filter-class'),
    dashFilterPerf: $('prof-dash-filter-perf'),
    dashFilterRank: $('prof-dash-filter-rank'),
    dashStudentsTbody: $('prof-dash-students-tbody'),
    dashStudentsEmpty: $('prof-dash-students-empty'),
    dashProfile: $('prof-dash-profile')
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
  let dashRankClass = null; /* classe sélectionnée dans le classement */
  let dashRankSubject = null; /* matière sélectionnée dans le classement (null = moyenne générale) */
  let dashStatsClass = null; /* classe sélectionnée dans les statistiques */
  let dashSelectedStudent = null; /* { classe, id } profil élève affiché */

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
    showDash();
    /* Corbeille : rapatrie la version serveur (Supabase) si configuré,
       sinon tout reste en localStorage. Non bloquant. */
    pullTrashFromServer();
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

  /* ================= Corbeille =================
     Supprimer une classe, un élève ou une matière ne l'efface plus
     définitivement : un instantané est conservé dans la corbeille et
     peut être restauré tant qu'il n'est pas purgé explicitement.
     La corbeille vit en localStorage (hors-ligne). Si Supabase est
     configuré (supabase.config.js), elle est synchronisée sur la
     table « lynaqe_prof_trash » (30 éléments max, purge automatique
     après 30 jours). Sans configuration, tout reste local. */

  function supabaseCfg() {
    return window.SUPABASE_CONFIG && typeof window.SUPABASE_CONFIG === 'object'
      ? window.SUPABASE_CONFIG
      : {};
  }

  function supabaseEnabled() {
    const cfg = supabaseCfg();
    return Boolean(cfg.url && cfg.anonKey && /^https?:\/\//.test(String(cfg.url)));
  }

  function supabaseBase() {
    return String(supabaseCfg().url || '').replace(/\/+$/, '');
  }

  function getOwnerId() {
    try {
      let id = localStorage.getItem(PROF_OWNER_KEY);
      if (!id) {
        id = 'd_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 12);
        localStorage.setItem(PROF_OWNER_KEY, id);
      }
      return id;
    } catch {
      return 'local';
    }
  }

  function supabaseFetch(path, options) {
    const cfg = supabaseCfg();
    const headers = Object.assign(
      {
        apikey: cfg.anonKey,
        Authorization: 'Bearer ' + cfg.anonKey,
        'Content-Type': 'application/json',
        'X-Owner-Id': getOwnerId()
      },
      (options && options.headers) || {}
    );
    return fetch(supabaseBase() + path, Object.assign({}, options, { headers }));
  }

  /* Synchronise la corbeille locale vers Supabase (remplacement complet
     des lignes de cet appareil : suppression puis réinsertion). */
  async function syncTrashToServer(items) {
    if (!supabaseEnabled()) return;
    try {
      const owner = getOwnerId();
      await supabaseFetch('/rest/v1/lynaqe_prof_trash?owner_id=eq.' + encodeURIComponent(owner), {
        method: 'DELETE',
        headers: { Prefer: 'return=minimal' }
      });
      if (items && items.length) {
        const rows = items.map((item) => ({
          owner_id: owner,
          payload: item,
          deleted_at: new Date(Number(item.deletedAt) || Date.now()).toISOString()
        }));
        await supabaseFetch('/rest/v1/lynaqe_prof_trash', {
          method: 'POST',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify(rows)
        });
      }
    } catch (err) {
      console.error('Synchronisation corbeille Supabase impossible :', err);
    }
  }

  /* Récupère la corbeille du serveur au démarrage de session.
     En cas d'erreur (ou Supabase non configuré), le local reste
     la source de vérité. Si le serveur est vide et que du local
     existe, on y remonte la corbeille locale. */
  async function pullTrashFromServer() {
    if (!supabaseEnabled()) return;
    try {
      const owner = getOwnerId();
      const res = await supabaseFetch(
        '/rest/v1/lynaqe_prof_trash?owner_id=eq.' +
          encodeURIComponent(owner) +
          '&select=payload&order=deleted_at.desc'
      );
      if (!res.ok) return;
      const rows = await res.json();
      const serverItems = (Array.isArray(rows) ? rows : [])
        .map((r) => r && r.payload)
        .filter((p) => p && typeof p === 'object' && p.id && p.type);
      if (serverItems.length > 0) {
        persistTrashLocal(serverItems.slice(0, PROF_TRASH_LIMIT));
        updateTrashBadge();
      } else {
        syncTrashToServer(readTrash());
      }
    } catch (err) {
      console.error('Lecture corbeille Supabase impossible :', err);
    }
  }

  function trashRetentionMs() {
    const days = Number(supabaseCfg().trashRetentionDays) || 30;
    return days * 24 * 60 * 60 * 1000;
  }

  function trashNotExpired(item) {
    const ts = Number(item && item.deletedAt) || 0;
    return Date.now() - ts < trashRetentionMs();
  }

  function persistTrashLocal(items) {
    try {
      localStorage.setItem(PROF_TRASH_KEY, JSON.stringify(items));
    } catch {}
  }

  function readTrash() {
    let items = [];
    try {
      const raw = localStorage.getItem(PROF_TRASH_KEY);
      items = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(items)) items = [];
    } catch {
      items = [];
    }
    /* Purge automatique : les éléments au-delà de la durée de rétention
       disparaissent définitivement à la première lecture. */
    const kept = items.filter(trashNotExpired);
    if (kept.length !== items.length) persistTrashLocal(kept);
    return kept;
  }

  function saveTrash(items) {
    const limited = items.slice(0, PROF_TRASH_LIMIT);
    persistTrashLocal(limited);
    syncTrashToServer(limited);
  }

  function addToTrash(item) {
    const list = readTrash();
    list.unshift(item);
    saveTrash(list);
  }

  function removeFromTrash(id) {
    saveTrash(readTrash().filter((it) => it.id !== id));
    updateTrashBadge();
  }

  function trashId() {
    return 't_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
  }

  function updateTrashBadge() {
    if (els.trashCount) {
      const n = readTrash().length;
      els.trashCount.textContent = String(n);
      els.trashCount.hidden = n === 0;
    }
  }

  function trashSnapshotClass(classe) {
    return {
      id: trashId(),
      type: 'class',
      label: classe,
      classe,
      data: store[classe] || defaultClass(),
      deletedAt: Date.now()
    };
  }

  function trashSnapshotStudent(classe, student) {
    const notesBySem = {};
    SEMESTER_NAMES.forEach((sem) => {
      const semObj = store[classe]?.semestres?.[sem] || {};
      Object.keys(semObj).forEach((matiere) => {
        const record = semObj[matiere];
        if (record && record.notes && record.notes[student.id]) {
          if (!notesBySem[sem]) notesBySem[sem] = {};
          notesBySem[sem][matiere] = record.notes[student.id];
        }
      });
    });
    return {
      id: trashId(),
      type: 'student',
      label: getStudentName(student),
      classe,
      eleve: { id: student.id, nom: student.nom || '', prenom: student.prenom || '' },
      notes: notesBySem,
      deletedAt: Date.now()
    };
  }

  function trashSnapshotSubject(classe, sem, matiere) {
    const record = getSubjectRecord(classe, sem, matiere);
    if (!record) return null;
    return {
      id: trashId(),
      type: 'subject',
      label: showMatiere(matiere),
      classe,
      semestre: sem,
      matiere,
      record,
      deletedAt: Date.now()
    };
  }

  function trashUnit(n, keyS, keyP) {
    return t(n === 1 ? keyS : keyP);
  }

  function trashRelative(ts) {
    const diff = Date.now() - (Number(ts) || 0);
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return t('prof_trash_just_now');
    if (minutes < 60) return t('prof_trash_ago', { n: minutes, unit: trashUnit(minutes, 'prof_trash_unit_minute_s', 'prof_trash_unit_minute_p') });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('prof_trash_ago', { n: hours, unit: trashUnit(hours, 'prof_trash_unit_hour_s', 'prof_trash_unit_hour_p') });
    const days = Math.floor(hours / 24);
    if (days < 7) return t('prof_trash_ago', { n: days, unit: trashUnit(days, 'prof_trash_unit_day_s', 'prof_trash_unit_day_p') });
    const weeks = Math.floor(days / 7);
    if (weeks < 5) return t('prof_trash_ago', { n: weeks, unit: trashUnit(weeks, 'prof_trash_unit_week_s', 'prof_trash_unit_week_p') });
    const months = Math.floor(days / 30);
    if (months < 12) return t('prof_trash_ago', { n: months, unit: t('prof_trash_unit_month') });
    const years = Math.floor(months / 12);
    return t('prof_trash_ago', { n: years, unit: trashUnit(years, 'prof_trash_unit_year_s', 'prof_trash_unit_year_p') });
  }

  function trashRemainingDays(ts) {
    if (!ts) return null;
    const remain = trashRetentionMs() - (Date.now() - Number(ts));
    if (remain <= 0) return 0;
    return Math.ceil(remain / (24 * 60 * 60 * 1000));
  }

  /* Suffixe « · suppression définitive dans X jours » de chaque élément. */
  function trashPurgeInfo(item) {
    const remaining = trashRemainingDays(item && item.deletedAt);
    if (remaining === null || remaining < 0) return '';
    const text =
      remaining === 0
        ? t('prof_trash_purge_today')
        : t('prof_trash_purge_in', {
            n: remaining,
            unit: t(remaining === 1 ? 'prof_trash_unit_day_s' : 'prof_trash_unit_day_p')
          });
    return ' • <span class="prof-trash-purge-hint">' + escHtml(text) + '</span>';
  }

  function trashTypeLabel(type) {
    const labels = {
      class: t('prof_trash_type_class'),
      student: t('prof_trash_type_student'),
      subject: t('prof_trash_type_subject')
    };
    return labels[type] || '';
  }

  function restoreTrashItem(item) {
    if (!item) return;
    const doRestore = () => {
      if (item.type === 'class') {
        store[item.classe] = item.data ? Object.assign(defaultClass(), item.data) : defaultClass();
        saveStore();
      } else if (item.type === 'student') {
        if (!store[item.classe]) store[item.classe] = defaultClass();
        const classeData = store[item.classe];
        classeData.eleves = (classeData.eleves || []).filter((s) => s.id !== item.eleve?.id);
        if (item.eleve) {
          classeData.eleves.push({ id: item.eleve.id, nom: item.eleve.nom || '', prenom: item.eleve.prenom || '' });
        }
        if (item.notes) {
          Object.keys(item.notes).forEach((sem) => {
            const semObj = (classeData.semestres[sem] = classeData.semestres[sem] || {});
            Object.keys(item.notes[sem]).forEach((matiere) => {
              const record = semObj[matiere];
              if (record && record.notes && item.notes[sem][matiere]) {
                record.notes[item.eleve.id] = item.notes[sem][matiere];
              }
            });
          });
        }
        saveStore();
      } else if (item.type === 'subject') {
        if (!store[item.classe]) store[item.classe] = defaultClass();
        if (!store[item.classe].semestres[item.semestre]) store[item.classe].semestres[item.semestre] = {};
        store[item.classe].semestres[item.semestre][item.matiere] = item.record;
        saveStore();
      }
      removeFromTrash(item.id);
      recordActivity('trash', item.label);
      openTrashModal();
      if (typeof showInfoDialog === 'function') showInfoDialog(t('prof_trash_restored', { label: item.label }));
    };

    const conflict =
      (item.type === 'class' && store[item.classe]) ||
      (item.type === 'subject' && !!getSubjectRecord(item.classe, item.semestre, item.matiere));

    if (conflict) {
      if (typeof confirmModal !== 'undefined' && confirmModal.el) {
        confirmModal.show({ message: t('prof_trash_overwrite', { label: item.label }), danger: true, onConfirm: doRestore });
      } else if (window.confirm(t('prof_trash_overwrite', { label: item.label }))) {
        doRestore();
      }
    } else {
      doRestore();
    }
  }

  function purgeTrashItem(item) {
    if (!item) return;
    const doPurge = () => {
      removeFromTrash(item.id);
      recordActivity('trash', item.label);
      openTrashModal();
      if (typeof showInfoDialog === 'function') showInfoDialog(t('prof_trash_deleted', { label: item.label }));
    };
    if (typeof confirmModal !== 'undefined' && confirmModal.el) {
      confirmModal.show({
        message: t('prof_trash_confirm_delete', { label: item.label }),
        danger: true,
        onConfirm: doPurge
      });
    } else if (window.confirm(t('prof_trash_confirm_delete', { label: item.label }))) {
      doPurge();
    }
  }

  function openTrashModal() {
    document.querySelectorAll('.prof-trash-modal').forEach((node) => node.remove());
    const items = readTrash();
    const iconMap = {
      class: ICON_SUBJECTS,
      student: ICON_STUDENTS,
      subject: ICON_BARS
    };

    const rows = items
      .map(
        (item) => `
        <div class="prof-trash-item" data-id="${escHtml(item.id)}">
          <span class="prof-trash-item-icon" aria-hidden="true">${iconMap[item.type] || ICON_DOTS}</span>
          <div class="prof-trash-item-main">
            <strong class="prof-trash-item-label">${escHtml(item.label)}</strong>
            <small class="prof-trash-item-meta">${escHtml(trashTypeLabel(item.type))} • ${escHtml(trashRelative(item.deletedAt))}${trashPurgeInfo(item)}</small>
          </div>
          <div class="prof-trash-item-actions">
            <button type="button" class="secondary-button prof-trash-restore">${t('prof_trash_restore')}</button>
            <button type="button" class="ghost-button prof-danger-text prof-trash-purge">${t('prof_trash_delete_forever')}</button>
          </div>
        </div>`
      )
      .join('');

    const modal = document.createElement('div');
    modal.className = 'prof-ocr-modal prof-trash-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = `
      <div class="prof-ocr-overlay"></div>
      <div class="prof-ocr-modal-card">
        <div class="prof-ocr-header">
          <h3>${escHtml(t('prof_trash_title'))}</h3>
          <p class="prof-ocr-subtitle">${escHtml(t('prof_trash_subtitle'))}</p>
        </div>
        <div class="prof-trash-body">
          ${items.length ? rows : `<p class="prof-empty">${escHtml(t('prof_trash_empty'))}</p>`}
        </div>
        <div class="prof-ocr-actions">
          <div class="prof-ocr-actions-right">
            <button type="button" class="primary-button" data-trash-close>${escHtml(t('prof_bulletin_close'))}</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    const close = () => {
      modal.remove();
      document.body.style.overflow = '';
      renderHome();
    };
    modal.querySelector('[data-trash-close]').addEventListener('click', close);
    modal.querySelector('.prof-ocr-overlay').addEventListener('click', close);
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });

    modal.querySelectorAll('.prof-trash-restore').forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = items.find((it) => it.id === btn.closest('.prof-trash-item')?.dataset.id);
        restoreTrashItem(item);
      });
    });
    modal.querySelectorAll('.prof-trash-purge').forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = items.find((it) => it.id === btn.closest('.prof-trash-item')?.dataset.id);
        purgeTrashItem(item);
      });
    });
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

  /* ---------- Détection de doublons ---------- */

  /* Normalise un nom pour la comparaison : minuscules, sans accents,
     apostrophes et tirets ignorés. */
  function normName(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[''’\-.]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /* Cherche un élève pouvant correspondre au nom/prénom saisi.
     - mode 'all'    : formulaire & import — signale aussi les cas
       partiels (même nom, prénom différent ; nom seul ; prénom seul).
     - mode 'strict' : OCR — seulement les cas réellement ambigus
       (ordre inversé ou champ unique), pour ne pas harceler l'utilisateur
       en pleine saisie de notes.
     Retourne { student, strong } (strong = correspondance exacte après
     normalisation) ou null. */
  function duplicateInfo(students, nom, prenom, mode) {
    if (!Array.isArray(students) || !students.length) return null;
    const n = normName(nom);
    const p = normName(prenom);
    if (!n && !p) return null;
    const full = (p + ' ' + n).replace(/\s+/g, ' ').trim();

    for (const e of students) {
      const en = normName(e.nom);
      const ep = normName(e.prenom);
      if ((en === n || !n) && (ep === p || !p) && n && p) {
        return { student: e, strong: true };
      }
    }

    for (const e of students) {
      const en = normName(e.nom);
      const ep = normName(e.prenom);
      let soft = false;
      if (n && p) {
        if (en === n && mode !== 'strict' && ep !== p) soft = true;
        /* Même élève dont nom/prénom sont inversés entre le stockage
           (nom, prénom) et la source (prénom, nom). */
        if ((en + ' ' + ep).replace(/\s+/g, ' ').trim() === full) soft = true;
      } else if (n && !p && en === n) {
        soft = true;
      } else if (!n && p && ep === p) {
        soft = true;
      }
      if (soft) return { student: e, strong: false };
    }
    return null;
  }

  /* Toute correspondance (pour l'ajout manuel : on signale même si
     l'élève rentré est identique à un existant). */
  function findDuplicateStudent(students, nom, prenom) {
    const info = duplicateInfo(students, nom, prenom, 'all');
    return info ? info.student : null;
  }

  /* Modale « Doublon détecté » : Fusionner / Conserver les deux / Annuler.
     Résout une Promise avec 'merge' | 'keepBoth' | 'cancel' | 'none'. */
  function askDuplicateResolution(labels) {
    return new Promise((resolve) => {
      if (!labels || !labels.length) return resolve('none');
      document.querySelectorAll('.prof-dup-modal').forEach((node) => node.remove());

      const single = labels.length === 1;
      const modal = document.createElement('div');
      modal.className = 'prof-ocr-modal prof-trash-modal prof-dup-modal';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      const items = labels.map((l) => `<li>${escHtml(l)}</li>`).join('');
      modal.innerHTML = `
        <div class="prof-ocr-overlay"></div>
        <div class="prof-ocr-modal-card">
          <div class="prof-ocr-header">
            <h3>${escHtml(t('prof_dup_title'))}</h3>
            <p class="prof-ocr-subtitle">${single ? escHtml(t('prof_dup_message', { label: labels[0] })) : escHtml(t('prof_dup_list_title'))}</p>
          </div>
          ${single ? '' : `<ul class="prof-dup-list">${items}</ul>`}
          <div class="prof-ocr-actions prof-dup-actions">
            <button type="button" class="secondary-button prof-dup-primary" data-dup="merge">${escHtml(t('prof_dup_merge'))}</button>
            <button type="button" class="ghost-button" data-dup="keep">${escHtml(t('prof_dup_keep'))}</button>
            <button type="button" class="ghost-button prof-danger-text" data-dup="cancel">${escHtml(t('prof_dup_cancel'))}</button>
          </div>
        </div>
      `;
      const done = (value) => {
        modal.remove();
        document.body.style.overflow = '';
        resolve(value);
      };
      modal.querySelector('[data-dup="merge"]').addEventListener('click', () => done('merge'));
      modal.querySelector('[data-dup="keep"]').addEventListener('click', () => done('keepBoth'));
      modal.querySelector('[data-dup="cancel"]').addEventListener('click', () => done('cancel'));
      modal.querySelector('.prof-ocr-overlay').addEventListener('click', () => done('cancel'));
      modal.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') done('cancel');
      });
      document.body.appendChild(modal);
      document.body.style.overflow = 'hidden';
    });
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
    return [row.nom, row.prenom].filter(Boolean).join(' ').trim() || '—';
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

  /* ================= Navigation (7 vues) ================= */

  function setBackLabel(key) {
    els.backLabel.textContent = t(key);
    els.backLabel.setAttribute('data-i18n', key);
  }

  function profViewsList() {
    return [els.viewDash, els.viewStudents, els.viewRanking, els.viewStats, els.viewHome, els.viewClass, els.viewSubject];
  }

  function showView(target, opts) {
    profViewsList().forEach((v) => {
      if (v) v.hidden = true;
    });
    opts = opts || {};
    if (target) target.hidden = false;
    if (opts.tab) setProfTab(opts.tab);
    if (els.backBtn) els.backBtn.hidden = opts.back !== true;
    if (opts.backLabel) setBackLabel(opts.backLabel);
    if (els.breadcrumbText) els.breadcrumbText.textContent = opts.breadcrumb || '';
    if (typeof opts.afterShow === 'function') opts.afterShow();
    closeSidebarMobile();
  }

  function showDash() {
    showView(els.viewDash, { tab: 'dash', afterShow: renderDash });
  }

  function showStudentsView(presetPerf) {
    showView(els.viewStudents, {
      tab: 'students',
      afterShow: () => {
        fillStudentsFilters();
        if (presetPerf && els.dashFilterPerf) {
          els.dashFilterPerf.value = presetPerf;
          if (els.dashSearch) els.dashSearch.value = '';
          if (els.dashFilterClass) els.dashFilterClass.value = '';
          if (els.dashFilterRank) els.dashFilterRank.value = '';
        }
        renderDashStudents();
      }
    });
  }

  function showRankingView() {
    showView(els.viewRanking, {
      tab: 'ranking',
      afterShow: () => {
        fillRankSelectors();
        renderRanking();
      }
    });
  }

  function showStatsView() {
    showView(els.viewStats, {
      tab: 'stats',
      afterShow: () => {
        fillStatsSelectors();
        renderStats();
      }
    });
  }

  function showHome() {
    showView(els.viewHome, { tab: 'classes', afterShow: renderHome });
  }

  function showClassView() {
    showView(els.viewClass, {
      tab: 'classes',
      back: true,
      backLabel: 'prof_back_classes',
      breadcrumb: activeClass,
      afterShow: renderClassView
    });
  }

  function showSubjectView() {
    showView(els.viewSubject, {
      tab: 'classes',
      back: true,
      backLabel: 'prof_back_class',
      breadcrumb: `${activeClass} › ${semLabel(activeSem)} › ${showMatiere(activeSubject)}`
    });
  }

  /* ================= Vue 0 : Tableau de bord ================= */

  const ICON_CLASSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>';
  const ICON_AVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true"><path d="M12 2l2.9 6.1 6.6.8-4.9 4.5 1.3 6.6L12 17l-5.9 3 1.3-6.6L2.5 8.9l6.6-.8L12 2Z"/></svg>';
  const ICON_BARS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true"><line x1="6" y1="20" x2="6" y2="14"/><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/></svg>';
  const ICON_ORDER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="14" y2="18"/></svg>';
  const ICON_ALERT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true"><path d="M10.3 3.8 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
  const ICON_TROPHY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true"><path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v4a5 5 0 0 1-10 0Z"/><path d="M17 5h2a2 2 0 0 1 2 2c0 2.2-2 4-4 4"/><path d="M7 5H5a2 2 0 0 0-2 2c0 2.2 2 4 4 4"/></svg>';

  function dashClassNames() {
    return Object.keys(store).filter((name) => store[name] && Array.isArray(store[name].eleves));
  }

  function dashSemAvg(classeData, sem, eleveId) {
    const semObj = (classeData && classeData.semestres && classeData.semestres[sem]) || {};
    let sum = 0;
    let coef = 0;
    Object.values(semObj).forEach((record) => {
      if (!record || !record.coefficient) return;
      const moy = moyenneFromNotes(record.notes ? record.notes[eleveId] : null, record.composition);
      if (moy === null) return;
      sum += moy * record.coefficient;
      coef += record.coefficient;
    });
    return coef ? sum / coef : null;
  }

  function dashAnnualAvg(classeData, eleveId) {
    const s1 = dashSemAvg(classeData, 'Semestre1', eleveId);
    const s2 = dashSemAvg(classeData, 'Semestre2', eleveId);
    if (s1 === null && s2 === null) return null;
    if (s1 === null) return s2;
    if (s2 === null) return s1;
    return (s1 + s2) / 2;
  }

  function dashSubjectUnion(classeData) {
    const set = new Set();
    SEMESTER_NAMES.forEach((sem) => {
      const semObj = (classeData && classeData.semestres && classeData.semestres[sem]) || {};
      Object.keys(semObj).forEach((m) => set.add(m));
    });
    return Array.from(set);
  }

  function dashSubjectRecordAvg(classeData, sem, matiere, eleveId) {
    const record =
      classeData && classeData.semestres && classeData.semestres[sem]
        ? classeData.semestres[sem][matiere]
        : null;
    return record
      ? moyenneFromNotes(record.notes ? record.notes[eleveId] : null, record.composition)
      : null;
  }

  function dashSubjectStudentAvg(classeData, matiere, eleveId) {
    const vals = SEMESTER_NAMES.map((sem) => dashSubjectRecordAvg(classeData, sem, matiere, eleveId)).filter(
      (v) => v !== null
    );
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
  }

  function dashSubjectClassAvg(classeData, matiere) {
    const vals = (Array.isArray(classeData.eleves) ? classeData.eleves : [])
      .map((e) => dashSubjectStudentAvg(classeData, matiere, e.id))
      .filter((v) => v !== null);
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
  }

  function classSemSubjectAvg(classeData, sem, matiere) {
    const record =
      classeData && classeData.semestres && classeData.semestres[sem]
        ? classeData.semestres[sem][matiere]
        : null;
    if (!record) return null;
    const vals = (Array.isArray(classeData.eleves) ? classeData.eleves : [])
      .map((e) => moyenneFromNotes(record.notes ? record.notes[e.id] : null, record.composition))
      .filter((v) => v !== null);
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
  }

  function dashMedian(values) {
    if (!values.length) return null;
    const sorted = values.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  function dashEvoDelta(after, before) {
    if (after === null || before === null) return null;
    if (Math.abs(after - before) < 0.05) return 0;
    return after > before ? 1 : -1;
  }

  function dashMentionKey(avg) {
    if (avg === null) return null;
    if (avg < 10) return 'prof_dash_mention_insuffisant';
    if (avg < 12) return 'prof_dash_mention_passable';
    if (avg < 14) return 'prof_dash_mention_ab';
    if (avg < 16) return 'prof_dash_mention_bien';
    if (avg < 18) return 'prof_dash_mention_tb';
    return 'prof_dash_mention_excellent';
  }

  function dashMentionCls(key) {
    const map = {
      prof_dash_mention_excellent: 'm-excellent',
      prof_dash_mention_tb: 'm-tb',
      prof_dash_mention_bien: 'm-bien',
      prof_dash_mention_ab: 'm-ab',
      prof_dash_mention_passable: 'm-passable',
      prof_dash_mention_insuffisant: 'm-insuffisant'
    };
    return map[key] || '';
  }

  function dashEvoHtml(delta) {
    if (delta === null) return '<span class="prof-dash-evo flat">—</span>';
    if (delta > 0) return '<span class="prof-dash-evo up">↑</span>';
    if (delta < 0) return '<span class="prof-dash-evo down">↓</span>';
    return '<span class="prof-dash-evo flat">→</span>';
  }

  function dashBarHtml(label, value, max, opts) {
    const pct = max > 0 ? Math.max(0, Math.min(100, Math.round((value / max) * 100))) : 0;
    const valueTxt = opts && opts.raw ? opts.raw : value === null ? '—' : value.toFixed(2);
    const cls = opts && opts.cls ? ` is-${opts.cls}` : '';
    return `
      <div class="prof-dash-bar-row">
        <span class="prof-dash-bar-label">${label}</span>
        <span class="prof-dash-bar-value">${valueTxt}</span>
        <span class="prof-dash-bar-track"><span class="prof-dash-bar-fill${cls}" style="width:${pct}%"></span></span>
      </div>`;
  }

  function dashBarCls(value) {
    if (value === null) return '';
    if (value < 10) return 'low';
    if (value >= 14) return 'gold';
    return '';
  }

  function setProfTab(which) {
    const tabMap = {
      dash: els.tabDash,
      classes: els.tabClasses,
      students: els.tabStudents,
      ranking: els.tabRanking,
      stats: els.tabStats
    };
    const activeBtn = tabMap[which];
    Object.values(tabMap).forEach((btn) => {
      if (btn) btn.classList.toggle('is-active', btn === activeBtn);
    });
  }

  function closeSidebarMobile() {
    if (els.sidebar) els.sidebar.classList.remove('is-open');
    if (els.mobileNavBtn) els.mobileNavBtn.setAttribute('aria-expanded', 'false');
  }

  function renderDashHeadStats() {
    if (!els.dashHeadStats) return;
    const classes = dashClassNames();
    let totalStudents = 0;
    const subjects = new Set();
    const avgs = [];
    classes.forEach((name) => {
      const cd = store[name];
      if (!cd) return;
      totalStudents += Array.isArray(cd.eleves) ? cd.eleves.length : 0;
      dashSubjectUnion(cd).forEach((m) => subjects.add(m));
      (Array.isArray(cd.eleves) ? cd.eleves : []).forEach((e) => {
        const avg = dashAnnualAvg(cd, e.id);
        if (avg !== null) avgs.push(avg);
      });
    });
    const globalAvg = avgs.length ? avgs.reduce((s, v) => s + v, 0) / avgs.length : null;

    const cards = [
      { icon: ICON_CLASSE, val: String(classes.length), label: t('prof_dash_stat_classes'), sub: classes.length ? t('prof_kpi_classes_sub') : t('prof_kpi_empty_sub') },
      { icon: ICON_STUDENTS, val: String(totalStudents), label: t('prof_dash_stat_students'), sub: totalStudents ? t('prof_kpi_students_sub') : t('prof_kpi_empty_sub') },
      { icon: ICON_SUBJECTS, val: String(subjects.size), label: t('prof_dash_stat_subjects'), sub: subjects.size ? t('prof_kpi_subjects_sub') : t('prof_kpi_empty_sub') },
      { icon: ICON_AVG, val: globalAvg === null ? '—' : globalAvg.toFixed(2), label: t('prof_dash_stat_average'), sub: globalAvg === null ? t('prof_kpi_empty_sub') : t('prof_kpi_avg_sub') }
    ];
    els.dashHeadStats.innerHTML = cards
      .map(
        (c) => `<article class="prof-kpi-card">
          <span class="prof-kpi-icon" aria-hidden="true">${c.icon}</span>
          <span class="prof-kpi-body">
            <strong>${c.val}</strong>
            <small>${escHtml(c.label)}</small>
            <em>${escHtml(c.sub)}</em>
          </span>
        </article>`
      )
      .join('');
  }

  /* ---------- Activité récente ---------- */

  function readActivity() {
    try {
      const raw = localStorage.getItem(PROF_ACTIVITY_KEY);
      return Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function recordActivity(action, detail) {
    try {
      const list = readActivity();
      list.unshift({ action, detail: String(detail || '') || null, ts: Date.now() });
      localStorage.setItem(PROF_ACTIVITY_KEY, JSON.stringify(list.slice(0, 12)));
    } catch {}
  }

  function activityLabel(item) {
    const labels = {
      class: t('prof_activity_class'),
      student: t('prof_activity_student'),
      notes: t('prof_activity_notes'),
      bulletin: t('prof_activity_bulletin'),
      import: t('prof_activity_import'),
      trash: t('prof_trash_btn')
    };
    return labels[item.action] || item.action;
  }

  function renderDashActivity() {
    if (!els.dashActivity) return;
    const list = readActivity();
    if (!list.length) {
      els.dashActivity.innerHTML = `<p class="prof-empty">${escHtml(t('prof_activity_empty'))}</p>`;
      return;
    }
    const iconMap = { class: ICON_CLASSE, student: ICON_STUDENTS, notes: ICON_BARS, bulletin: ICON_ORDER, import: ICON_ALERT, trash: ICON_DELETE };
    els.dashActivity.innerHTML = list
      .slice(0, 6)
      .map((item) => {
        const d = new Date(item.ts);
        const time = d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' }) + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
        return `
          <div class="prof-activity-item">
            <span class="prof-activity-icon" aria-hidden="true">${iconMap[item.action] || ICON_DOTS}</span>
            <span class="prof-activity-body">
              <strong>${escHtml(activityLabel(item))}</strong>
              ${item.detail ? `<small>${escHtml(item.detail)}</small>` : ''}
            </span>
            <time>${escHtml(time)}</time>
          </div>`;
      })
      .join('');
  }

  /* ---------- Cartes portail (aperçu) ---------- */

  function dashPortalData() {
    const classes = dashClassNames();
    let totalStudents = 0;
    const allAvgs = [];
    let best = null;
    const lowStudents = [];
    classes.forEach((name) => {
      const cd = store[name];
      if (!cd) return;
      totalStudents += Array.isArray(cd.eleves) ? cd.eleves.length : 0;
      (Array.isArray(cd.eleves) ? cd.eleves : []).forEach((e) => {
        const avg = dashAnnualAvg(cd, e.id);
        if (avg === null) return;
        allAvgs.push(avg);
        if (best === null || avg > best.avg) best = { name: getStudentName(e), classe: name, avg };
        if (avg < 10) lowStudents.push({ name: getStudentName(e), classe: name, avg });
      });
    });
    const globalAvg = allAvgs.length ? allAvgs.reduce((s, v) => s + v, 0) / allAvgs.length : null;
    return { totalStudents, globalAvg, best, lowStudents, classes: classes.length };
  }

  function dashMiniBars(value) {
    if (value === null) return '';
    const pct = Math.round((value / 20) * 100);
    const heights = [45, 60, 75, 90, 100];
    return `<span class="prof-portal-bars" aria-hidden="true">${heights.map((h, i) => {
      const on = pct >= ((i + 1) / heights.length) * 100;
      return `<i class="${on ? 'is-on' : ''}" style="height:${h}%"></i>`;
    }).join('')}</span>`;
  }

  function renderDashPortals() {
    if (!els.dashQuick) return;
    const d = dashPortalData();
    const bestName = d.best ? escHtml(d.best.name) : '—';
    const bestAvg = d.best ? d.best.avg.toFixed(2) : '';
    const cards = [
      { portal: 'students', icon: ICON_STUDENTS, title: t('prof_portal_students'), big: String(d.totalStudents), sub: d.totalStudents ? `${d.classes} ${t(d.classes > 1 ? 'prof_stat_classes' : 'prof_stat_class')}` : t('prof_portal_no_data'), cta: t('prof_portal_cta_students') },
      { portal: 'ranking', icon: ICON_TROPHY, title: t('prof_portal_ranking'), big: bestName, sub: d.best ? `${t('prof_portal_best_avg')} ${bestAvg}` : t('prof_portal_no_data'), cta: t('prof_portal_cta_ranking') },
      { portal: 'stats', icon: ICON_BARS, title: t('prof_portal_stats'), big: d.globalAvg === null ? '—' : d.globalAvg.toFixed(2), sub: d.globalAvg === null ? t('prof_portal_no_data') : t('prof_portal_global_avg'), cta: t('prof_portal_cta_stats'), bars: true, avgVal: d.globalAvg },
      { portal: 'watch', icon: ICON_ALERT, title: t('prof_portal_watch'), big: String(d.lowStudents.length), sub: d.lowStudents.length ? `${t('prof_portal_low_sub')} < 10/20` : t('prof_portal_none_low'), cta: t('prof_portal_cta_watch') }
    ];
    els.dashQuick.innerHTML = cards
      .map(
        (c) => `
          <article class="prof-portal-card" data-portal="${c.portal}" role="button" tabindex="0" aria-label="${escHtml(c.title)}">
            <div class="prof-portal-head">
              <span class="prof-portal-icon" aria-hidden="true">${c.icon}</span>
              <h4>${escHtml(c.title)}</h4>
            </div>
            <strong class="prof-portal-value">${c.big}</strong>
            <p class="prof-portal-sub">${escHtml(c.sub)}</p>
            ${c.bars ? dashMiniBars(c.avgVal) : ''}
            <span class="prof-portal-cta">${escHtml(c.cta)}&nbsp;<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></span>
          </article>`
      )
      .join('');

    els.dashQuick.querySelectorAll('[data-portal]').forEach((card) => {
      const open = () => handlePortalAction(card.dataset.portal);
      card.addEventListener('click', open);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      });
    });
  }

  function handlePortalAction(act) {
    if (act === 'classes' || act === 'home') return showHome();
    if (act === 'students') return showStudentsView();
    if (act === 'ranking') return showRankingView();
    if (act === 'stats') return showStatsView();
    if (act === 'watch') return showStudentsView('__low__');
    if (act === 'top') return showStudentsView('__high__');
    if (act === 'notes') {
      const names = dashClassNames();
      for (const name of names) {
        const cd = store[name];
        const union = cd ? dashSubjectUnion(cd) : [];
        if (union.length) {
          activeClass = name;
          activeSem = SEMESTER_NAMES[0];
          openSubject(union[0]);
          return;
        }
      }
      showHome();
      return;
    }
    if (act === 'create-class') {
      showHome();
      window.setTimeout(() => showAddClassForm(), prefersReducedMotion ? 0 : 120);
      return;
    }
  }

  /* ---------- Classement ---------- */

  function fillRankSelectors() {
    const names = dashClassNames();
    const cur = dashRankClass && store[dashRankClass] ? dashRankClass : null;
    dashRankClass = cur || (names.length ? names[0] : null);

    if (els.dashRankClassSel) {
      els.dashRankClassSel.innerHTML = names
        .map((n) => `<option value="${escHtml(n)}">${escHtml(n)}</option>`)
        .join('');
      els.dashRankClassSel.value = dashRankClass || '';
    }
    fillRankSubjectSelect();
  }

  function fillRankSubjectSelect() {
    if (!els.dashRankSubjectSel) return;
    const cd = dashRankClass && store[dashRankClass] ? store[dashRankClass] : null;
    const subjects = cd ? dashSubjectUnion(cd) : [];
    const cur = dashRankSubject;
    els.dashRankSubjectSel.innerHTML =
      `<option value="__all__">${escHtml(t('prof_dash_rank_all_subjects'))}</option>` +
      subjects.map((m) => `<option value="${escHtml(m)}">${escHtml(showMatiere(m))}</option>`).join('');
    if (cur && subjects.includes(cur)) els.dashRankSubjectSel.value = cur;
    else {
      dashRankSubject = null;
      els.dashRankSubjectSel.value = '__all__';
    }
  }

  function renderRanking() {
    if (!els.dashRankBody) return;
    if (!dashRankClass) {
      els.dashRankBody.innerHTML =
        `<div class="prof-dash-empty">${escHtml(t('prof_dash_empty_classes'))}<div class="prof-dash-empty-cta"><button type="button" class="secondary-button" data-act="create-class">${escHtml(t('prof_dash_empty_btn'))}</button></div></div>`;
      return;
    }
    const cd = store[dashRankClass];
    const isAll = !dashRankSubject;
    const rows = (Array.isArray(cd.eleves) ? cd.eleves : [])
      .map((e) => {
        let avg;
        let evo;
        if (isAll) {
          const s1 = dashSemAvg(cd, 'Semestre1', e.id);
          const s2 = dashSemAvg(cd, 'Semestre2', e.id);
          avg = dashAnnualAvg(cd, e.id);
          evo = dashEvoDelta(s2, s1);
        } else {
          const s1 = dashSubjectRecordAvg(cd, 'Semestre1', dashRankSubject, e.id);
          const s2 = dashSubjectRecordAvg(cd, 'Semestre2', dashRankSubject, e.id);
          avg = dashSubjectStudentAvg(cd, dashRankSubject, e.id);
          evo = dashEvoDelta(s2, s1);
        }
        return { id: e.id, nom: e.nom, prenom: e.prenom, avg, evo };
      })
      .sort((a, b) => {
        if (a.avg === null && b.avg === null) return 0;
        if (a.avg === null) return 1;
        if (b.avg === null) return -1;
        return b.avg - a.avg;
      });

    if (!rows.length) {
      els.dashRankBody.innerHTML = `<p class="prof-empty">${escHtml(t('prof_dash_empty_rank'))}</p>`;
      return;
    }

    const medals = ['🥇', '🥈', '🥉'];
    const tbody = rows
      .map((r, i) => {
        const mentionKey = dashMentionKey(r.avg);
        const med = r.avg !== null && i < 3 ? `<span class="prof-dash-medal" aria-hidden="true">${medals[i]}</span>&nbsp;` : '';
        return `
          <tr data-id="${escHtml(r.id)}" data-classe="${escHtml(dashRankClass)}">
            <td class="prof-col-rank">${med}${r.avg === null ? '—' : i + 1}</td>
            <td>${escHtml(getStudentName(r))}</td>
            <td class="prof-moyenne-cell${r.avg === null ? '' : ' ' + gradeClass(r.avg)}">${r.avg === null ? '—' : r.avg.toFixed(2)}</td>
            <td>${dashEvoHtml(r.evo)}</td>
            <td>${mentionKey ? `<span class="prof-dash-mention ${dashMentionCls(mentionKey)}">${escHtml(t(mentionKey))}</span>` : '—'}</td>
          </tr>`;
      })
      .join('');

    els.dashRankBody.innerHTML = `
      <div class="table-wrap prof-table-wrap prof-dash-clickable">
        <table class="prof-table prof-dash-rank-table">
          <thead>
            <tr>
              <th class="prof-col-rank">${t('prof_dash_rank_col_rank')}</th>
              <th>${t('prof_dash_rank_col_student')}</th>
              <th>${t('prof_dash_rank_col_avg')}</th>
              <th>${t('prof_dash_rank_col_evolution')}</th>
              <th>${t('prof_dash_rank_col_mention')}</th>
            </tr>
          </thead>
          <tbody>${tbody}</tbody>
        </table>
      </div>`;

    els.dashRankBody.querySelectorAll('tbody tr[data-id]').forEach((tr) => {
      tr.addEventListener('click', () => {
        const student = (store[tr.dataset.classe]?.eleves || []).find((s) => s.id === tr.dataset.id);
        if (student) showDashProfile(tr.dataset.classe, student);
      });
    });
  }

  /* ---------- Statistiques ---------- */

  function fillStatsSelectors() {
    const names = dashClassNames();
    const cur = dashStatsClass && store[dashStatsClass] ? dashStatsClass : null;
    dashStatsClass = cur || (names.length ? names[0] : null);
    if (els.dashStatsClassSel) {
      els.dashStatsClassSel.innerHTML = names
        .map((n) => `<option value="${escHtml(n)}">${escHtml(n)}</option>`)
        .join('');
      els.dashStatsClassSel.value = dashStatsClass || '';
    }
  }

  function renderStats() {
    if (!els.dashStatsBody) return;
    if (!dashStatsClass) {
      els.dashStatsBody.innerHTML =
        `<div class="prof-dash-empty">${escHtml(t('prof_dash_empty_classes'))}<div class="prof-dash-empty-cta"><button type="button" class="secondary-button" data-act="create-class">${escHtml(t('prof_dash_empty_btn'))}</button></div></div>`;
      return;
    }
    const cd = store[dashStatsClass];
    const students = Array.isArray(cd.eleves) ? cd.eleves : [];
    const values = students.map((e) => dashAnnualAvg(cd, e.id)).filter((v) => v !== null);

    if (!values.length) {
      els.dashStatsBody.innerHTML = `<div class="prof-dash-empty">${escHtml(t('prof_dash_empty_stats'))}</div>`;
      return;
    }

    const nbEval = values.length;
    const mean = values.reduce((s, v) => s + v, 0) / nbEval;
    const best = values.reduce((m, v) => Math.max(m, v), -Infinity);
    const worst = values.reduce((m, v) => Math.min(m, v), Infinity);
    const median = dashMedian(values);
    const pass = values.filter((v) => v >= 10).length;
    const fail = nbEval - pass;
    const rate = Math.round((pass / nbEval) * 100);

    const summaryBoxes = [
      { label: t('prof_dash_summary_avg'), value: mean.toFixed(2), cls: mean >= 10 ? 'is-good' : 'is-bad' },
      { label: t('prof_dash_summary_best'), value: best.toFixed(2), cls: 'is-good' },
      { label: t('prof_dash_summary_worst'), value: worst.toFixed(2) },
      { label: t('prof_dash_summary_median'), value: median === null ? '—' : median.toFixed(2) },
      { label: t('prof_dash_summary_count'), value: String(students.length) },
      { label: t('prof_dash_summary_pass'), value: String(pass), cls: 'is-good' },
      { label: t('prof_dash_summary_fail'), value: String(fail), cls: fail ? 'is-bad' : '' },
      { label: t('prof_dash_summary_success'), value: rate + ' %', cls: rate >= 50 ? 'is-good' : 'is-bad' }
    ];

    const summaryHtml = `
      <div class="prof-dash-subsection">
        <h5>${escHtml(t('prof_dash_summary_title'))}</h5>
        <div class="prof-dash-stats-summary">
          ${summaryBoxes
            .map(
              (b) =>
                `<div class="prof-dash-stat-box"><small>${escHtml(b.label)}</small><b${b.cls ? ` class="${b.cls}"` : ''}>${escHtml(b.value)}</b></div>`
            )
            .join('')}
        </div>
      </div>`;

    const buckets = [
      { label: '<8', min: 0, max: 8 },
      { label: '8–10', min: 8, max: 10 },
      { label: '10–12', min: 10, max: 12 },
      { label: '12–14', min: 12, max: 14 },
      { label: '14–16', min: 14, max: 16 },
      { label: '16–18', min: 16, max: 18 },
      { label: '18–20', min: 18, max: 20.01 }
    ];
    const counts = buckets.map((b) => values.filter((v) => v >= b.min && v < b.max).length);
    const distMax = counts.reduce((m, v) => Math.max(m, v), 1);

    const distHtml = `
      <div class="prof-dash-subsection">
        <h5>${escHtml(t('prof_dash_distribution'))}</h5>
        <div class="prof-dash-bars">
          ${counts.map((c, i) => dashBarHtml(buckets[i].label, c, distMax, { raw: String(c) })).join('')}
        </div>
      </div>`;

    const subjects = dashSubjectUnion(cd);
    const subjRows = subjects.map((m) => ({ m, avg: dashSubjectClassAvg(cd, m) })).filter((r) => r.avg !== null);

    const avgHtml = `
      <div class="prof-dash-subsection">
        <h5>${escHtml(t('prof_dash_avg_by_subject'))}</h5>
        <div class="prof-dash-bars">
          ${subjRows.map((r) => dashBarHtml(escHtml(showMatiere(r.m)), r.avg, 20, { cls: dashBarCls(r.avg) })).join('')}
        </div>
      </div>`;

    const compRows = subjects.map((m) => ({
      m,
      s1: classSemSubjectAvg(cd, 'Semestre1', m),
      s2: classSemSubjectAvg(cd, 'Semestre2', m)
    }));

    const compHtml = `
      <div class="prof-dash-subsection">
        <h5>${escHtml(t('prof_dash_comparison'))}</h5>
        <div class="prof-dash-bars">
          ${compRows
            .map((r) => {
              const s1pct = r.s1 === null ? 0 : Math.round((r.s1 / 20) * 100);
              const s2pct = r.s2 === null ? 0 : Math.round((r.s2 / 20) * 100);
              const s1cls = r.s1 !== null && r.s1 < 10 ? ' is-low' : '';
              const s2cls = r.s2 !== null && r.s2 < 10 ? ' is-low' : '';
              return `
                <div class="prof-dash-compare-row">
                  <span class="prof-dash-bar-label">${escHtml(showMatiere(r.m))}</span>
                  <span class="prof-dash-bar-value">${r.s1 === null ? '—' : r.s1.toFixed(2)} / ${r.s2 === null ? '—' : r.s2.toFixed(2)}</span>
                  <span class="prof-dash-bar-track"><span class="prof-dash-bar-fill${s1cls}" style="width:${s1pct}%"></span></span>
                  <span class="prof-dash-bar-track"><span class="prof-dash-bar-fill is-gold${s2cls}" style="width:${s2pct}%"></span></span>
                  <span class="prof-dash-compare-legends">
                    <span><span class="prof-dash-legend-dot" style="background:var(--blue-700)"></span>${escHtml(t('prof_dash_profile_s1'))}</span>
                    <span><span class="prof-dash-legend-dot" style="background:var(--copper-500)"></span>${escHtml(t('prof_dash_profile_s2'))}</span>
                  </span>
                </div>`;
            })
            .join('')}
        </div>
      </div>`;

    const mentionDefs = [
      ['prof_dash_mention_excellent', 18],
      ['prof_dash_mention_tb', 16],
      ['prof_dash_mention_bien', 14],
      ['prof_dash_mention_ab', 12],
      ['prof_dash_mention_passable', 10],
      ['prof_dash_mention_insuffisant', 0]
    ];
    const mentionCounts = mentionDefs.map(([key, min]) => ({
      key,
      count: values.filter((v) => v >= min && v < (min === 18 ? 21 : min + 2)).length
    }));
    const mentionMax = mentionCounts.reduce((m, x) => Math.max(m, x.count), 1);

    const mentionHtml = `
      <div class="prof-dash-subsection">
        <h5>${escHtml(t('prof_dash_mentions'))}</h5>
        <div class="prof-dash-bars">
          ${mentionCounts
            .map((x) => {
              const cls =
                dashMentionCls(x.key) === 'm-insuffisant'
                  ? 'low'
                  : dashMentionCls(x.key) === 'm-excellent'
                    ? 'gold'
                    : '';
              return dashBarHtml(escHtml(t(x.key)), x.count, mentionMax, { raw: String(x.count), cls });
            })
            .join('')}
        </div>
      </div>`;

    els.dashStatsBody.innerHTML = summaryHtml + distHtml + avgHtml + compHtml + mentionHtml;
  }

  /* ---------- Élèves : recherche + filtres ---------- */

  function fillStudentsFilters() {
    const names = dashClassNames();
    if (els.dashFilterClass) {
      els.dashFilterClass.innerHTML =
        `<option value="">${escHtml(t('prof_dash_filter_all'))}</option>` +
        names.map((n) => `<option value="${escHtml(n)}">${escHtml(n)}</option>`).join('');
    }
    if (els.dashFilterPerf) {
      els.dashFilterPerf.innerHTML =
        `<option value="">${escHtml(t('prof_dash_filter_all'))}</option>` +
        `<option value="__high__">${escHtml(t('prof_dash_filter_high'))}</option>` +
        `<option value="__mid__">${escHtml(t('prof_dash_filter_mid'))}</option>` +
        `<option value="__low__">${escHtml(t('prof_dash_filter_low'))}</option>`;
    }
    if (els.dashFilterRank) {
      els.dashFilterRank.innerHTML =
        `<option value="">${escHtml(t('prof_dash_filter_all'))}</option>` +
        `<option value="top5">${escHtml(t('prof_dash_filter_top5'))}</option>` +
        `<option value="top10">${escHtml(t('prof_dash_filter_top10'))}</option>` +
        `<option value="improve">${escHtml(t('prof_dash_filter_improve'))}</option>`;
    }
  }

  function dashStudentScope() {
    const src = els.dashFilterClass && els.dashFilterClass.value ? els.dashFilterClass.value : null;
    const names = src ? [src].filter((n) => store[n]) : dashClassNames();
    const list = [];
    names.forEach((classe) => {
      const cd = store[classe];
      if (!cd || !Array.isArray(cd.eleves)) return;
      cd.eleves.forEach((e) => {
        list.push({
          id: e.id,
          nom: e.nom,
          prenom: e.prenom,
          classe,
          avg: dashAnnualAvg(cd, e.id),
          s1: dashSemAvg(cd, 'Semestre1', e.id),
          s2: dashSemAvg(cd, 'Semestre2', e.id)
        });
      });
    });
    list.sort((a, b) => {
      if (a.avg === null && b.avg === null) return 0;
      if (a.avg === null) return 1;
      if (b.avg === null) return -1;
      return b.avg - a.avg;
    });
    const withAvg = list.filter((x) => x.avg !== null);
    const rankById = {};
    withAvg.forEach((x, i) => {
      rankById[x.id] = i + 1;
    });
    return { list, rankById, totalWithAvg: withAvg.length };
  }

  function renderDashStudents() {
    if (!els.dashStudentsTbody) return;
    const { list, rankById, totalWithAvg } = dashStudentScope();
    const query = (els.dashSearch ? els.dashSearch.value : '').trim().toLowerCase();
    const perf = els.dashFilterPerf ? els.dashFilterPerf.value : '';
    const rankf = els.dashFilterRank ? els.dashFilterRank.value : '';

    const filtered = list.filter((x) => {
      if (query && !getStudentName(x).toLowerCase().includes(query)) return false;
      if (perf && x.avg === null) return false;
      if (perf === '__high__' && x.avg < 15) return false;
      if (perf === '__mid__' && !(x.avg >= 10 && x.avg < 15)) return false;
      if (perf === '__low__' && x.avg >= 10) return false;
      if (rankf === 'top5' && rankById[x.id] > 5) return false;
      if (rankf === 'top10' && rankById[x.id] > 10) return false;
      if (rankf === 'improve' && !(totalWithAvg > 0 && rankById[x.id] >= totalWithAvg - 4)) return false;
      return true;
    });

    const tbody = filtered.length
      ? filtered
          .map((x) => {
            const mentionKey = dashMentionKey(x.avg);
            return `
              <tr data-id="${escHtml(x.id)}" data-classe="${escHtml(x.classe)}">
                <td class="prof-col-rank">${x.avg === null ? '—' : rankById[x.id]}</td>
                <td>${escHtml(getStudentName(x))}</td>
                <td>${escHtml(x.classe)}</td>
                <td class="prof-moyenne-cell${x.avg === null ? '' : ' ' + gradeClass(x.avg)}">${x.avg === null ? '—' : x.avg.toFixed(2)}</td>
                <td>${mentionKey ? `<span class="prof-dash-mention ${dashMentionCls(mentionKey)}">${escHtml(t(mentionKey))}</span>` : '—'}</td>
              </tr>`;
          })
          .join('')
      : '';

    els.dashStudentsTbody.innerHTML = tbody;
    if (els.dashStudentsEmpty) {
      els.dashStudentsEmpty.hidden = filtered.length > 0;
      els.dashStudentsEmpty.textContent = t('prof_dash_empty_students');
    }

    els.dashStudentsTbody.querySelectorAll('tr[data-id]').forEach((tr) => {
      tr.addEventListener('click', () => {
        const student = (store[tr.dataset.classe]?.eleves || []).find((s) => s.id === tr.dataset.id);
        if (student) showDashProfile(tr.dataset.classe, student);
      });
    });
  }

  /* ---------- Profil élève ---------- */

  function showDashProfile(classe, student) {
    if (!els.dashProfile) return;
    const cd = store[classe];
    if (!cd) return;

    const s1 = dashSemAvg(cd, 'Semestre1', student.id);
    const s2 = dashSemAvg(cd, 'Semestre2', student.id);
    const avg = dashAnnualAvg(cd, student.id);

    const scored = (Array.isArray(cd.eleves) ? cd.eleves : [])
      .filter((e) => dashAnnualAvg(cd, e.id) !== null)
      .sort((a, b) => dashAnnualAvg(cd, b.id) - dashAnnualAvg(cd, a.id));
    const rankPos = avg === null ? 0 : 1 + scored.findIndex((e) => e.id === student.id);
    const rankTxt = rankPos > 0 ? t('prof_dash_profile_rank_of', { rang: rankPos, total: scored.length }) : '—';

    const subjects = dashSubjectUnion(cd);
    const rows = subjects
      .map((m) => {
        const s1v = dashSubjectRecordAvg(cd, 'Semestre1', m, student.id);
        const s2v = dashSubjectRecordAvg(cd, 'Semestre2', m, student.id);
        const vals = [s1v, s2v].filter((v) => v !== null);
        return { m, s1: s1v, s2: s2v, moy: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null, evo: dashEvoDelta(s2v, s1v) };
      })
      .sort((a, b) => (b.moy === null ? 1 : a.moy === null ? -1 : b.moy - a.moy));

    els.dashProfile.innerHTML = `
      <div class="prof-dash-profile-head">
        <div class="prof-dash-profile-name">
          <h3>${escHtml(getStudentName(student))}</h3>
          <p>${escHtml(t('prof_dash_quick_classes'))} : ${escHtml(classe)} • ${escHtml(rankTxt)}</p>
        </div>
        <button type="button" class="ghost-button prof-dash-profile-close" data-close>${escHtml(t('prof_dash_profile_close'))}</button>
      </div>

      <div class="prof-dash-profile-grid">
        ${[
          ['prof_dash_profile_s1', s1],
          ['prof_dash_profile_s2', s2],
          ['prof_dash_profile_year', avg]
        ]
          .map(
            ([k, v]) =>
              `<div class="prof-dash-profile-cell"><small>${escHtml(t(k))}</small><b>${v === null ? '—' : v.toFixed(2)}</b></div>`
          )
          .join('')}
        <div class="prof-dash-profile-cell"><small>${escHtml(t('prof_dash_rank_col_rank'))}</small><b>${escHtml(rankTxt)}</b></div>
      </div>

      <div class="prof-dash-subsection">
        <h5>${escHtml(t('prof_dash_profile_subjects'))}</h5>
        ${
          rows.length
            ? `<div class="table-wrap prof-table-wrap prof-dash-profile-subjects">
                <table class="prof-table">
                  <thead><tr>
                    <th>${escHtml(t('prof_dash_profile_subject'))}</th>
                    <th>${escHtml(t('prof_dash_profile_s1'))}</th>
                    <th>${escHtml(t('prof_dash_profile_s2'))}</th>
                    <th>${escHtml(t('prof_dash_profile_subject_avg'))}</th>
                    <th>${escHtml(t('prof_dash_profile_subject_evolution'))}</th>
                  </tr></thead>
                  <tbody>
                    ${rows
                      .map(
                        (r) => `
                          <tr>
                            <td>${escHtml(showMatiere(r.m))}</td>
                            <td class="prof-moyenne-cell">${r.s1 === null ? '—' : r.s1.toFixed(2)}</td>
                            <td class="prof-moyenne-cell">${r.s2 === null ? '—' : r.s2.toFixed(2)}</td>
                            <td class="prof-moyenne-cell">${r.moy === null ? '—' : r.moy.toFixed(2)}</td>
                            <td>${dashEvoHtml(r.evo)}</td>
                          </tr>`
                      )
                      .join('')}
                  </tbody>
                </table>
              </div>`
            : `<p class="prof-empty">${escHtml(t('prof_dash_profile_no_subjects'))}</p>`
        }
      </div>

      <div class="prof-dash-subsection">
        <h5>${escHtml(t('prof_dash_profile_evolution_title'))}</h5>
        <div class="prof-dash-profile-chart">
          ${rows
            .map(
              (r) => `
                <div class="prof-dash-compare-row">
                  <span class="prof-dash-bar-label">${escHtml(showMatiere(r.m))}</span>
                  <span class="prof-dash-bar-value">${r.s1 === null ? '—' : r.s1.toFixed(2)} → ${r.s2 === null ? '—' : r.s2.toFixed(2)}</span>
                  <span class="prof-dash-bar-track"><span class="prof-dash-bar-fill" style="width:${r.s1 === null ? 0 : Math.round((r.s1 / 20) * 100)}%"></span></span>
                  <span class="prof-dash-bar-track"><span class="prof-dash-bar-fill is-gold" style="width:${r.s2 === null ? 0 : Math.round((r.s2 / 20) * 100)}%"></span></span>
                  <span class="prof-dash-compare-legends">
                    <span><span class="prof-dash-legend-dot" style="background:var(--blue-700)"></span>${escHtml(t('prof_dash_profile_s1'))}</span>
                    <span><span class="prof-dash-legend-dot" style="background:var(--copper-500)"></span>${escHtml(t('prof_dash_profile_s2'))}</span>
                  </span>
                </div>`
            )
            .join('')}
        </div>
      </div>`;

    els.dashProfile.hidden = false;
    els.dashProfile.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
    els.dashProfile.querySelector('[data-close]').addEventListener('click', () => {
      els.dashProfile.hidden = true;
      dashSelectedStudent = null;
    });
    dashSelectedStudent = { classe, id: student.id };
  }

  function renderDash() {
    renderDashHeadStats();
    renderDashPortals();
    renderDashActivity();
    if (dashSelectedStudent) {
      const cd = store[dashSelectedStudent.classe];
      const student = cd && Array.isArray(cd.eleves) ? cd.eleves.find((e) => e.id === dashSelectedStudent.id) : null;
      if (student) showDashProfile(dashSelectedStudent.classe, student);
      else dashSelectedStudent = null;
    }
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
    updateTrashBadge();

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
          recordActivity('class', newName);
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
    recordActivity('class', name);
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
    const doDelete = () => {
      addToTrash(trashSnapshotClass(classe));
      delete store[classe];
      saveStore();
      recordActivity('class', classe);
      if (activeClass === classe) {
        activeClass = null;
        showHome();
      } else {
        renderHome();
      }
    };
    if (typeof confirmModal !== 'undefined' && confirmModal.el) {
      confirmModal.show({
        message: t('prof_confirm_delete_class', { classe }),
        danger: true,
        onConfirm: doDelete
      });
    } else if (window.confirm(t('prof_confirm_delete_class', { classe }))) {
      doDelete();
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
    const ranks = rankClass();
    const students = classeData.eleves
      .slice()
      .sort((a, b) => (ranks[a.id] || Infinity) - (ranks[b.id] || Infinity));
    els.studentsEmpty.hidden = students.length > 0;
    els.studentsEmpty.textContent = t('prof_students_empty');
    els.studentsTbody.innerHTML = '';

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

  async function submitStudentForm() {
    const nom = els.studentNom.value.trim();
    const prenom = els.studentPrenom.value.trim();
    if (!nom && !prenom) return;
    const classeData = store[activeClass] || defaultClass();

    const resetForm = () => {
      els.studentForm.hidden = true;
      els.studentNom.value = '';
      els.studentPrenom.value = '';
      editingStudentId = null;
      renderClassView();
    };

    if (editingStudentId) {
      const student = classeData.eleves.find((s) => s.id === editingStudentId);
      if (student) {
        student.nom = nom;
        student.prenom = prenom;
      }
    } else {
      const dup = findDuplicateStudent(classeData.eleves, nom, prenom);
      if (dup) {
        const choice = await askDuplicateResolution([getStudentName(dup)]);
        if (choice === 'cancel' || choice === 'none') {
          resetForm();
          return;
        }
        if (choice === 'merge') {
          saveStore();
          recordActivity('student', `${nom} ${prenom}`.trim());
          resetForm();
          if (typeof showInfoDialog === 'function') {
            showInfoDialog(t('prof_dup_merged', { label: getStudentName(dup) }));
          }
          return;
        }
        /* choice === 'keepBoth' : on enregistre malgré tout le nouvel élève */
      }
      classeData.eleves.push({ id: newId(), nom, prenom });
    }
    saveStore();
    recordActivity('student', `${nom} ${prenom}`.trim());
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
    const doDelete = () => {
      addToTrash(trashSnapshotStudent(activeClass, student));
      const classeData = store[activeClass] || defaultClass();
      classeData.eleves = classeData.eleves.filter((s) => s.id !== student.id);
      ['Semestre1', 'Semestre2'].forEach((sem) => {
        const semObj = store[activeClass]?.semestres?.[sem] || {};
        Object.values(semObj).forEach((record) => {
          if (record.notes && record.notes[student.id]) delete record.notes[student.id];
        });
      });
      saveStore();
      recordActivity('student', `${student.nom} ${student.prenom}`.trim());
      renderClassView();
    };
    if (typeof confirmModal !== 'undefined' && confirmModal.el) {
      confirmModal.show({
        message: t('prof_confirm_delete_student'),
        danger: true,
        onConfirm: doDelete
      });
    } else if (window.confirm(t('prof_confirm_delete_student'))) {
      doDelete();
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
    recordActivity('bulletin', getStudentName(student));
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
      const avgClass = avg === null ? 'is-empty' : avg >= 10 ? 'is-good' : 'is-low';
      const avgLabel = avg === null ? '—' : `${avg.toFixed(2)}/20`;
      const item = document.createElement('div');
      item.className = 'prof-subject-item';
      item.innerHTML = `
        <div class="prof-subject-item-main">
          <div class="prof-subject-item-top">
            <span class="prof-subject-item-name">${escHtml(showMatiere(matiere))}</span>
            <span class="prof-subject-item-avg-pill ${avgClass}" title="${escHtml(t('th_moyenne'))}">${avgLabel}</span>
          </div>
          <span class="prof-subject-item-meta">${t('label_coefficient')} : ${record.coefficient || 1} • ${t(
        'stat_composition_label'
      )} : ${record.composition ? t('radio_oui') : t('radio_non')}</span>
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
    const doDelete = () => {
      const item = trashSnapshotSubject(activeClass, activeSem, matiere);
      if (item) addToTrash(item);
      deleteSubjectRecord(activeClass, activeSem, matiere);
      renderClassView();
    };
    if (typeof confirmModal !== 'undefined' && confirmModal.el) {
      confirmModal.show({
        message: t('prof_confirm_delete_subject', { matiere: showMatiere(matiere) }),
        danger: true,
        onConfirm: doDelete
      });
    } else if (window.confirm(t('prof_confirm_delete_subject', { matiere: showMatiere(matiere) }))) {
      doDelete();
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
      compoCell.hidden = !showCompo;
      compoCell.appendChild(createNoteInput(row, 'compo'));

      const avgCell = document.createElement('td');
      avgCell.className = 'prof-moyenne-cell';
      refreshAverageCell(avgCell, row);

      tr.append(rankCell, nameCell, d1Cell, d2Cell, compoCell, avgCell);
      els.tbody.appendChild(tr);
    });

    updateSummary();
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
    recordActivity('notes', `${activeClass} › ${showMatiere(activeSubject)}`);
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

  window.populateProfRows = async function (ocrVerifiedRows) {
    if (!Array.isArray(ocrVerifiedRows) || !ocrVerifiedRows.length) return;
    const classeData = store[activeClass] || defaultClass();

    /* Chaque ligne OCR est rattachée à un élève :
       - correspondance solide (même nom/prénom normalisés) → silencieuse ;
       - correspondance ambiguë (ordre inversé, champ unique) → on demande ;
       - aucun → nouvel élève créé à la volée. */
    const seen = new Set();
    const assignments = []; // { row, eleve|null }
    const softDups = []; // { row, existing, label, nom, prenom }

    ocrVerifiedRows.forEach((r) => {
      const nom = String(r.nom || '').trim();
      const prenom = String(r.prenom || '').trim();
      if (!nom && !prenom) return;
      const key = normName(nom) + '\u0000' + normName(prenom);
      if (seen.has(key)) return; /* doublon interne au relevé scanné */
      seen.add(key);

      const info = duplicateInfo(classeData.eleves, nom, prenom, 'strict');
      if (info && info.strong) {
        assignments.push({ row: r, eleve: info.student });
      } else if (info) {
        softDups.push({ row: r, existing: info.student, label: getStudentName(info.student) });
      } else {
        assignments.push({ row: r, eleve: null });
      }
    });

    if (softDups.length) {
      const choice = await askDuplicateResolution(softDups.map((d) => d.label));
      if (choice === 'cancel' || choice === 'none') return; /* on n'applique rien */
      softDups.forEach((d) => {
        assignments.push(
          choice === 'keepBoth'
            ? { row: d.row, eleve: null }
            : { row: d.row, eleve: d.existing }
        );
      });
    }

    let added = false;
    const conflicts = []; // { row, field, oldValue, newValue }

    assignments.forEach((item) => {
      const r = item.row;
      const nom = String(r.nom || '').trim();
      const prenom = String(r.prenom || '').trim();
      let eleve = item.eleve;

      if (!eleve) {
        eleve = { id: newId(), nom, prenom };
        classeData.eleves.push(eleve);
        added = true;
      } else {
        /* L'OCR peut fournir une meilleure casse que l'existant : on ne
           rempli jamais un champ déjà renseigné. */
        if (!String(eleve.nom || '').trim() && nom) eleve.nom = nom;
        if (!String(eleve.prenom || '').trim() && prenom) eleve.prenom = prenom;
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

  /* =========================================================
     IMPORT MASSIF — ÉLÈVES (CSV / XLSX / PDF) + NOTES (CSV / XLSX / PDF)
     Parsing 100 % côté client (PWA hors-ligne) : CSV lisible
     directement, XLSX décompressé via DecompressionStream, PDF
     via l'extraction de texte de ocr.js (pdf.js).
     ========================================================= */

  function parseDelimitedCSV(text) {
    text = String(text || '');
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

    const lines = text.split(/\r\n|\r|\n/);
    const sample = (lines.find((l) => l.trim()) || '').trim();
    let delim = ',';
    const candidates = [',', ';', '\t'].map((d) => {
      const escaped = d === '\t' ? '\\t' : '\\' + d;
      const count = (sample.match(new RegExp(escaped, 'g')) || []).length;
      return { d, count };
    });
    candidates.sort((a, b) => b.count - a.count);
    if (candidates[0].count > 0) delim = candidates[0].d;

    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          field += c;
        }
      } else if (c === '"') {
        inQuotes = true;
      } else if (c === delim) {
        row.push(field.trim());
        field = '';
      } else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field.trim());
        field = '';
        if (row.some((f) => f !== '')) rows.push(row);
        row = [];
      } else {
        field += c;
      }
    }
    row.push(field.trim());
    if (row.some((f) => f !== '')) rows.push(row);
    return rows;
  }

  /* Lecteur XLSX minimaliste : on ne lit que sharedStrings + sheet1. */
  function xlsxColIndex(ref) {
    const m = String(ref || '').match(/^[A-Z]+/);
    if (!m) return -1;
    let idx = 0;
    for (const ch of m[0]) idx = idx * 26 + (ch.charCodeAt(0) - 64);
    return idx - 1;
  }

  async function parseXlsxFile(file) {
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('XLSX non supporté sur ce navigateur');
    }
    const buf = new Uint8Array(await file.arrayBuffer());
    const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    const entries = {};
    let pos = 0;
    while (pos + 30 <= buf.length) {
      if (dv.getUint32(pos, true) !== 0x04034b50) break;
      const method = dv.getUint16(pos + 8, true);
      const compSize = dv.getUint32(pos + 18, true);
      const nameLen = dv.getUint16(pos + 26, true);
      const extraLen = dv.getUint16(pos + 28, true);
      const name = new TextDecoder().decode(buf.slice(pos + 30, pos + 30 + nameLen));
      const dataStart = pos + 30 + nameLen + extraLen;
      entries[name] = { method, compSize, dataStart };
      pos = dataStart + compSize;
    }

    const readEntry = async (name) => {
      const entry = entries[name];
      if (!entry) return null;
      let data = buf.slice(entry.dataStart, entry.dataStart + entry.compSize);
      if (entry.method === 8) {
        const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
        data = new Uint8Array(await new Response(stream).arrayBuffer());
      } else if (entry.method !== 0) {
        return null;
      }
      return new TextDecoder('utf-8').decode(data);
    };

    const [sharedXml, sheetXml] = await Promise.all([
      readEntry('xl/sharedStrings.xml'),
      readEntry('xl/worksheets/sheet1.xml')
    ]);
    if (!sheetXml) throw new Error('Feuille de calcul introuvable');

    const parser = new DOMParser();
    const shared = [];
    if (sharedXml) {
      const doc = parser.parseFromString(sharedXml, 'application/xml');
      doc.querySelectorAll('si').forEach((si) => {
        let text = '';
        si.querySelectorAll('t').forEach((n) => {
          text += n.textContent;
        });
        shared.push(text);
      });
    }

    const doc = parser.parseFromString(sheetXml, 'application/xml');
    const rows = [];
    doc.querySelectorAll('sheetData row').forEach((rowEl) => {
      const cells = [];
      rowEl.querySelectorAll('c').forEach((cEl) => {
        const ref = cEl.getAttribute('r');
        const type = cEl.getAttribute('t') || '';
        const vEl = cEl.querySelector('v');
        const isEl = cEl.querySelector('is');
        let value = '';
        if (type === 's' && vEl) value = shared[Number(vEl.textContent)] || '';
        else if (type === 'inlineStr' && isEl) value = isEl.textContent || '';
        else if (vEl) value = vEl.textContent || '';
        const idx = xlsxColIndex(ref);
        const target = idx >= 0 ? idx : cells.length;
        while (cells.length < target) cells.push('');
        cells[target] = String(value).trim();
      });
      if (cells.some((f) => f !== '')) rows.push(cells);
    });
    return rows;
  }

  /* Lecteur PDF minimal : on extrait le texte sélectionnable du fichier
     (via ocr.js) puis on le découpe en lignes de cellules exploitables. */
  async function parsePdfFile(file) {
    if (typeof window.extractPdfText !== 'function') {
      throw new Error('Extraction PDF indisponible');
    }
    const text = await window.extractPdfText(file);
    const lines = String(text || '').split(/\r\n|\r|\n/);
    const rows = [];
    lines.forEach((line) => {
      let trimmed = String(line || '').trim();
      if (!trimmed) return;
      /* Supprime un éventuel numéro de ligne en début de texte ("1. ", "1)"). */
      trimmed = trimmed.replace(/^\d+[.)]\s*/, '');
      if (!trimmed) return;
      const cells = trimmed.split(/\t|;|\|/);
      const cleaned = cells.map((c) => String(c || '').trim());
      if (cleaned.every((c) => c === '')) return;
      /* Si la ligne n'a qu'une seule colonne (nom vide), on tente malgré
         tout de la garder : buildStudentsList fera le découpage nom/prénom. */
      rows.push(cleaned);
    });
    return rows;
  }

  async function readTabularFile(file) {
    const isXlsx = /\.xlsx$/i.test(file.name) || file.type.includes('spreadsheetml');
    if (isXlsx) return parseXlsxFile(file);
    const isPdf = /\.pdf$/i.test(file.name) || file.type === 'application/pdf';
    if (isPdf) return parsePdfFile(file);
    const text = await file.text();
    return parseDelimitedCSV(text);
  }

  /* ---------- Import d'une liste d'élèves ---------- */

  function buildStudentsList(rows) {
    if (!rows.length) return [];
    const header = rows[0].map((c) => String(c || '').toLowerCase());
    const isHeader = header.some(
      (h) =>
        h.includes('nom') || h.includes('prénom') || h.includes('prenom') || h.includes('élève') || h === 'name'
    );
    const data = isHeader ? rows.slice(1) : rows;

    let nomIdx = 0;
    let prenomIdx = 1;
    if (isHeader) {
      let prenomFound = false;
      header.forEach((h, i) => {
        if (h.includes('prénom') || h.includes('prenom') || h.includes('first name') || h.includes('given name')) {
          if (prenomIdx !== i) {
            prenomIdx = i;
            prenomFound = true;
          }
        } else if (h.includes('nom') || h === 'name' || h.includes('last name')) {
          if (nomIdx === 0 || !prenomFound) nomIdx = i;
        }
      });
    }

    const list = [];
    data.forEach((cells) => {
      if (!cells.length) return;
      let nom = String(cells[nomIdx] || '').trim();
      let prenom = prenomIdx >= 0 && cells.length > prenomIdx ? String(cells[prenomIdx] || '').trim() : '';
      if (prenomIdx < 0 || prenomIdx >= cells.length) {
        const parts = nom.split(/\s+/);
        if (parts.length > 1) {
          nom = parts[0];
          prenom = parts.slice(1).join(' ');
        }
      }
      if (!nom && !prenom) return;
      list.push({ nom, prenom });
    });
    return list;
  }

  let importClassRows = [];

  function closeClassImportModal() {
    const modal = document.getElementById('prof-import-class-modal');
    if (modal) modal.remove();
    document.body.style.overflow = '';
    importClassRows = [];
  }

  function openClassImportModal() {
    const modal = document.createElement('div');
    modal.id = 'prof-import-class-modal';
    modal.className = 'prof-ocr-modal prof-import-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = `
      <div class="prof-ocr-overlay"></div>
      <div class="prof-ocr-modal-card">
        <div class="prof-ocr-header">
          <h3>${escHtml(t('prof_import_modal_title'))}</h3>
          <p class="prof-ocr-subtitle">${escHtml(t('prof_import_modal_subtitle'))}</p>
        </div>
        <div class="prof-import-file">
          <label for="prof-import-class-file" class="prof-import-dropzone">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="22" height="22" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span>${escHtml(t('prof_import_dropzone'))}</span>
            <small>${escHtml(t('prof_import_format_label'))}</small>
          </label>
          <input type="file" id="prof-import-class-file" accept=".csv,.xlsx,.pdf,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/pdf" hidden />
        </div>
        <div class="prof-import-preview" id="prof-import-class-preview" hidden>
          <p class="prof-import-preview-info" id="prof-import-class-info"></p>
          <div class="prof-import-table-wrap">
            <table class="prof-import-table">
              <thead>
                <tr><th>#</th><th>${escHtml(t('label_nom'))}</th><th>${escHtml(t('label_prenom'))}</th><th class="prof-import-col-check">&nbsp;</th></tr>
              </thead>
              <tbody id="prof-import-class-tbody"></tbody>
            </table>
          </div>
          <div class="prof-import-target">
            <label for="prof-import-class-target">${escHtml(t('prof_import_class_label'))}</label>
            <div class="prof-import-target-row">
              <div class="select-wrap">
                <select id="prof-import-class-target"></select>
              </div>
              <input type="text" id="prof-import-class-new" maxlength="30" placeholder="${escHtml(t('prof_import_new_class_placeholder'))}" hidden />
            </div>
          </div>
        </div>
        <div class="prof-ocr-actions">
          <div class="prof-ocr-actions-right">
            <button type="button" id="prof-import-class-cancel" class="ghost-button">${escHtml(t('prof_ocr_cancel'))}</button>
            <button type="button" id="prof-import-class-apply" class="primary-button">${escHtml(t('prof_import_apply', { count: 0 }))}</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    const close = () => {
      closeClassImportModal();
    };
    modal.querySelector('.prof-ocr-overlay').addEventListener('click', close);
    modal.querySelector('#prof-import-class-cancel').addEventListener('click', close);
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });

    const targetSel = modal.querySelector('#prof-import-class-target');
    const newInput = modal.querySelector('#prof-import-class-new');
    targetSel.innerHTML = `
      <option value="" disabled selected>${escHtml(t('prof_import_new_class'))}</option>
      ${Object.keys(store)
        .map((name) => `<option value="${escHtml(name)}">${escHtml(name)}</option>`)
        .join('')}
      <option value="__new__">${escHtml(t('prof_import_new_class'))}…</option>
    `;
    targetSel.addEventListener('change', () => {
      const isNew = targetSel.value === '__new__';
      newInput.hidden = !isNew;
      if (isNew) newInput.focus();
    });

    const fileInput = modal.querySelector('#prof-import-class-file');
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      try {
        const rows = await readTabularFile(file);
        importClassRows = buildStudentsList(rows);
        renderClassImportPreview(modal);
      } catch (err) {
        if (typeof showInfoDialog === 'function') showInfoDialog(t('prof_import_error'));
      }
    });

    modal.querySelector('#prof-import-class-apply').addEventListener('click', applyClassImport);
  }

  function renderClassImportPreview(modal) {
    const preview = modal.querySelector('#prof-import-class-preview');
    const tbody = modal.querySelector('#prof-import-class-tbody');
    const applyBtn = modal.querySelector('#prof-import-class-apply');
    const info = modal.querySelector('#prof-import-class-info');

    if (!importClassRows.length) {
      if (typeof showInfoDialog === 'function') showInfoDialog(t('prof_import_error'));
      return;
    }

    tbody.innerHTML = '';
    importClassRows.forEach((row, index) => {
      const tr = document.createElement('tr');
      tr.className = 'prof-import-check-row';
      const rankCell = document.createElement('td');
      rankCell.className = 'prof-ocr-col-rank';
      rankCell.textContent = String(index + 1);
      const nomCell = document.createElement('td');
      nomCell.textContent = row.nom;
      const prenomCell = document.createElement('td');
      prenomCell.textContent = row.prenom;
      const checkCell = document.createElement('td');
      checkCell.className = 'prof-import-col-check';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = true;
      cb.setAttribute('aria-label', `${row.nom} ${row.prenom}`);
      cb.addEventListener('change', () => {
        row._keep = cb.checked;
        updateClassImportApply();
      });
      checkCell.appendChild(cb);
      tr.append(rankCell, nomCell, prenomCell, checkCell);
      tbody.appendChild(tr);
    });

    info.textContent = t('prof_import_header_detected', { cols: t('label_nom') + ' / ' + t('label_prenom') });
    preview.hidden = false;
    updateClassImportApply();
  }

  function updateClassImportApply() {
    const modal = document.getElementById('prof-import-class-modal');
    if (!modal) return;
    const count = importClassRows.filter((r) => r._keep !== false).length;
    const btn = modal.querySelector('#prof-import-class-apply');
    if (btn) btn.textContent = t('prof_import_apply', { count });
  }

  async function applyClassImport() {
    const modal = document.getElementById('prof-import-class-modal');
    if (!modal) return;
    const targetSel = modal.querySelector('#prof-import-class-target');
    const newInput = modal.querySelector('#prof-import-class-new');
    let target = targetSel.value === '__new__' ? newInput.value.trim() : targetSel.value;
    if (!target) {
      if (typeof showInfoDialog === 'function') showInfoDialog(t('prof_import_no_class'));
      return;
    }
    if (!store[target]) store[target] = defaultClass();

    /* Correspondances exactes (même élève) : on saute silencieusement.
       Correspondances ambiguës (nom/prénom différents seulement par
       casse, accents ou ordre) : on demande à l'utilisateur. */
    const incoming = importClassRows.filter((row) => row._keep !== false);
    const dups = [];
    incoming.forEach((row) => {
      const nom = String(row.nom || '').trim();
      const prenom = String(row.prenom || '').trim();
      if (!nom && !prenom) return;
      const info = duplicateInfo(store[target].eleves, nom, prenom, 'all');
      if (info && !info.strong) dups.push({ row, label: getStudentName(row) });
    });

    let mergeAll = true;
    if (dups.length) {
      const choice = await askDuplicateResolution(dups.map((d) => d.label));
      if (choice === 'cancel' || choice === 'none') return;
      mergeAll = choice === 'merge';
    }

    let count = 0;
    let merged = 0;
    incoming.forEach((row) => {
      const nom = String(row.nom || '').trim();
      const prenom = String(row.prenom || '').trim();
      if (!nom && !prenom) return;
      const info = duplicateInfo(store[target].eleves, nom, prenom, 'all');
      if (info && info.strong) return; /* même élève déjà présent : on saute */
      if (info) {
        if (mergeAll) {
          merged++;
          return;
        }
        /* « Conserver les deux » : on ajoute le doublon */
      }
      store[target].eleves.push({ id: newId(), nom, prenom });
      count++;
    });
    saveStore();
    recordActivity('import', `${t('prof_import_done', { count, classe: target })}`);
    closeClassImportModal();
    if (typeof showInfoDialog === 'function') {
      showInfoDialog(
        merged > 0
          ? t('prof_import_done_merged', { count, classe: target, merged })
          : t('prof_import_done', { count, classe: target })
      );
    }
    renderHome();
  }

  /* ---------- Import des notes (Nom;Prénom;D1;D2;Compo) ---------- */

  function buildNotesList(rows) {
    if (!rows.length) return [];
    const header = rows[0].map((c) => String(c || '').toLowerCase());
    const isHeader = header.some(
      (h) =>
        h.includes('nom') ||
        h.includes('prenom') ||
        h.includes('prénom') ||
        /^d[12]$/.test(h) ||
        h.includes('devoir') ||
        h.includes('note') ||
        h.includes('compo')
    );

    let nomIdx = 0;
    let prenomIdx = -1;
    let d1Idx = -1;
    let d2Idx = -1;
    let compoIdx = -1;

    if (isHeader) {
      header.forEach((h, i) => {
        if (h.includes('prénom') || h.includes('prenom')) { if (prenomIdx < 0) prenomIdx = i; }
        else if (h.includes('nom')) { if (nomIdx === 0) nomIdx = i; }
        else if (/^(d1|dev[oô]ir[ _]?1|note1|n1)/.test(h)) { if (d1Idx < 0) d1Idx = i; }
        else if (/^(d2|dev[oô]ir[ _]?2|note2|n2)/.test(h)) { if (d2Idx < 0) d2Idx = i; }
        else if (h.includes('compo') || h.includes('composition')) { if (compoIdx < 0) compoIdx = i; }
      });
      if (prenomIdx < 0) prenomIdx = -1;
    }

    const data = isHeader ? rows.slice(1) : rows;
    const list = [];
    data.forEach((cells) => {
      if (!cells.length) return;
      const nom = String(cells[nomIdx] || '').trim();
      const prenom = prenomIdx >= 0 && cells.length > prenomIdx ? String(cells[prenomIdx] || '').trim() : '';
      const cell = (idx) => (idx >= 0 && cells.length > idx ? String(cells[idx] || '').trim() : '');
      const d1 = cell(d1Idx >= 0 ? d1Idx : 2);
      const d2 = cell(d2Idx >= 0 ? d2Idx : 3);
      const compo = cell(compoIdx >= 0 ? compoIdx : 4);
      if (!nom && !prenom) return;
      if (!d1 && !d2 && !compo) return;
      list.push({ nom, prenom, d1, d2, compo });
    });
    return list;
  }

  function openNotesImportModal() {
    const modal = document.createElement('div');
    modal.id = 'prof-import-notes-modal';
    modal.className = 'prof-ocr-modal prof-import-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = `
      <div class="prof-ocr-overlay"></div>
      <div class="prof-ocr-modal-card">
        <div class="prof-ocr-header">
          <h3>${escHtml(t('prof_import_notes_modal_title'))}</h3>
          <p class="prof-ocr-subtitle">${escHtml(t('prof_import_notes_modal_subtitle'))}</p>
        </div>
        <div class="prof-import-file">
          <label for="prof-import-notes-file" class="prof-import-dropzone">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="22" height="22" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span>${escHtml(t('prof_import_dropzone'))}</span>
            <small>${escHtml(t('prof_import_format_label'))}</small>
          </label>
          <input type="file" id="prof-import-notes-file" accept=".csv,.xlsx,.pdf,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/pdf" hidden />
        </div>
        <div class="prof-import-preview" id="prof-import-notes-preview" hidden>
          <p class="prof-import-preview-info" id="prof-import-notes-info"></p>
          <div class="prof-import-table-wrap">
            <table class="prof-import-table">
              <thead>
                <tr><th>#</th><th>${escHtml(t('label_nom'))}</th><th>${escHtml(t('label_prenom'))}</th><th>${escHtml(t('label_devoir1'))}</th><th>${escHtml(t('label_devoir2'))}</th><th>${escHtml(t('label_composition'))}</th></tr>
              </thead>
              <tbody id="prof-import-notes-tbody"></tbody>
            </table>
          </div>
          <p class="prof-import-note-hint">${escHtml(t('prof_import_notes_matching'))}</p>
        </div>
        <div class="prof-ocr-actions">
          <div class="prof-ocr-actions-right">
            <button type="button" id="prof-import-notes-cancel" class="ghost-button">${escHtml(t('prof_ocr_cancel'))}</button>
            <button type="button" id="prof-import-notes-apply" class="primary-button">${escHtml(t('prof_import_notes_apply'))}</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    const close = () => {
      modal.remove();
      document.body.style.overflow = '';
    };
    modal.querySelector('.prof-ocr-overlay').addEventListener('click', close);
    modal.querySelector('#prof-import-notes-cancel').addEventListener('click', close);
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });

    const fileInput = modal.querySelector('#prof-import-notes-file');
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      try {
        const rows = await readTabularFile(file);
        const list = buildNotesList(rows);
        renderNotesImportPreview(modal, list);
      } catch {
        if (typeof showInfoDialog === 'function') showInfoDialog(t('prof_import_notes_error'));
      }
    });

    modal.querySelector('#prof-import-notes-apply').addEventListener('click', () => {
      const list = modal.__notesList || [];
      const valid = list.filter((r) => (r.nom || r.prenom) && (r.d1 || r.d2));
      if (!valid.length) {
        if (typeof showInfoDialog === 'function') showInfoDialog(t('prof_import_notes_error'));
        return;
      }
      if (typeof window.populateProfRows === 'function') {
        window.populateProfRows(valid);
      }
      close();
      recordActivity('import', `${t('prof_import_notes_done', { count: valid.length })}`);
      if (typeof showInfoDialog === 'function') {
        showInfoDialog(t('prof_import_notes_done', { count: valid.length }));
      }
    });
  }

  function renderNotesImportPreview(modal, list) {
    const preview = modal.querySelector('#prof-import-notes-preview');
    const tbody = modal.querySelector('#prof-import-notes-tbody');
    const info = modal.querySelector('#prof-import-notes-info');
    if (!list.length) {
      if (typeof showInfoDialog === 'function') showInfoDialog(t('prof_import_notes_error'));
      return;
    }
    modal.__notesList = list;
    tbody.innerHTML = '';
    list.forEach((row, index) => {
      const tr = document.createElement('tr');
      const cells = [String(index + 1), row.nom || '', row.prenom || '', row.d1 || '', row.d2 || '', row.compo || ''];
      cells.forEach((value, idx) => {
        const td = document.createElement('td');
        td.textContent = value;
        if (idx === 0) td.className = 'prof-ocr-col-rank';
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    info.textContent = t('prof_import_header_detected', { cols: (t('label_nom') + ';' + t('label_prenom') + ';D1;D2') });
    preview.hidden = false;
  }

  const importClassBtn = $('prof-import-class-btn');
  const importNotesBtn = $('prof-import-notes-btn');
  if (importClassBtn) importClassBtn.addEventListener('click', openClassImportModal);
  if (importNotesBtn) importNotesBtn.addEventListener('click', openNotesImportModal);

  /* ===================== Events ===================== */

  if (els.togglePassword && els.password) {
    els.togglePassword.addEventListener('click', () => {
      const show = els.password.type === 'password';
      els.password.type = show ? 'text' : 'password';
      els.togglePassword.setAttribute('aria-pressed', String(show));
      els.togglePassword.setAttribute('aria-label', show ? t('prof_password_hide') : t('prof_password_show'));
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

  if (els.resetDataBtn) {
    els.resetDataBtn.addEventListener('click', () => {
      const resetAll = () => {
        try {
          localStorage.removeItem(PROF_STORE_KEY);
          localStorage.removeItem(PROF_AUTH_KEY);
          localStorage.removeItem(PROF_TRASH_KEY);
          Object.keys(localStorage)
            .filter((key) => key.startsWith(`${PROF_ROWS_PREFIX}_`))
            .forEach((key) => localStorage.removeItem(key));
        } catch {}
        if (typeof window.resetProfesseurData === 'function') window.resetProfesseurData();
        if (typeof showInfoDialog === 'function') showInfoDialog(t('prof_data_reset_done'));
      };
      if (typeof confirmModal !== 'undefined' && confirmModal.el) {
        confirmModal.show({
          message: t('prof_confirm_reset_data'),
          danger: true,
          onConfirm: resetAll
        });
      } else if (window.confirm(t('prof_confirm_reset_data'))) {
        resetAll();
      }
    });
  }

    if (els.trashBtn) {
    els.trashBtn.addEventListener('click', () => openTrashModal());
  }

    /* ---------- Sidebar navigation + sélecteurs ---------- */
    if (els.tabDash) els.tabDash.addEventListener('click', showDash);
    if (els.tabClasses) els.tabClasses.addEventListener('click', showHome);
    if (els.tabStudents) els.tabStudents.addEventListener('click', () => showStudentsView());
    if (els.tabRanking) els.tabRanking.addEventListener('click', showRankingView);
    if (els.tabStats) els.tabStats.addEventListener('click', showStatsView);

    /* ---------- Boutons de la bannière "Votre espace professeur" ---------- */
    document.querySelectorAll('.prof-hero-cta[data-act]').forEach((btn) => {
      btn.addEventListener('click', () => handlePortalAction(btn.dataset.act));
    });

    /* ---------- Mobile nav toggle ---------- */
    if (els.mobileNavBtn && els.sidebar) {
      els.mobileNavBtn.addEventListener('click', () => {
        const isOpen = els.sidebar.classList.contains('is-open');
        els.sidebar.classList.toggle('is-open', !isOpen);
        els.mobileNavBtn.setAttribute('aria-expanded', String(!isOpen));
      });
      document.addEventListener('click', (e) => {
        if (!els.sidebar.classList.contains('is-open')) return;
        if (e.target instanceof Element && !e.target.closest('.prof-sidebar') && !e.target.closest('#prof-mobile-nav-btn')) {
          closeSidebarMobile();
        }
      });
    }

    if (els.dashRankClassSel) {
      els.dashRankClassSel.addEventListener('change', () => {
        dashRankClass = els.dashRankClassSel.value || null;
        fillRankSubjectSelect();
        renderRanking();
      });
    }
    if (els.dashRankSubjectSel) {
      els.dashRankSubjectSel.addEventListener('change', () => {
        dashRankSubject = els.dashRankSubjectSel.value === '__all__' ? null : els.dashRankSubjectSel.value;
        renderRanking();
      });
    }
    if (els.dashStatsClassSel) {
      els.dashStatsClassSel.addEventListener('change', () => {
        dashStatsClass = els.dashStatsClassSel.value || null;
        renderStats();
      });
    }
    if (els.dashSearch) els.dashSearch.addEventListener('input', renderDashStudents);
    if (els.dashFilterClass) els.dashFilterClass.addEventListener('change', renderDashStudents);
    if (els.dashFilterPerf) els.dashFilterPerf.addEventListener('change', renderDashStudents);
    if (els.dashFilterRank) els.dashFilterRank.addEventListener('change', renderDashStudents);

    document.addEventListener('click', (e) => {
      if (e.target instanceof Element && e.target.closest('[data-act="create-class"]')) {
        showAddClassForm();
        showHome();
      }
    });

  if (els.backBtn) {
    els.backBtn.addEventListener('click', () => {
      if (!els.viewSubject.hidden && activeSubject) {
        const pending = !els.editBanner.hidden;
        if (pending && typeof confirmModal !== 'undefined' && confirmModal.el) {
          confirmModal.show({
            message: t('prof_edit_banner_title', { matiere: showMatiere(activeSubject) }),
            okLabel: t('prof_leave_confirm_ok'),
            danger: true,
            onConfirm: () => showClassView()
          });
        } else {
          showClassView();
        }
      } else if (!els.viewStudents.hidden || !els.viewRanking.hidden || !els.viewStats.hidden) {
        showDash();
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
      showDash();
    }
  };

  function init() {
    if (!els.screen || !els.loginCard || !els.console) return;
    loadStore();
    const isActiveScreen = els.screen.classList.contains('is-active');
    if (isAuthenticated()) {
      els.loginCard.hidden = true;
      els.console.hidden = false;
      if (isActiveScreen) showDash();
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

  /* Réinitialisation globale du site : vide aussi les classes professeur
     déjà mémorisées en mémoire (le localStorage est effacé par script.js). */
  window.resetProfesseurData = function () {
    store = {};
    activeClass = null;
    activeSubject = null;
    dashRankClass = null;
    dashStatsClass = null;
    dashSelectedStudent = null;
    if (els.editBanner) els.editBanner.hidden = true;
    if (els.viewDash) showDash();
  };

  init();
})();