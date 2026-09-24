/*
   TABLEAU DE BORD ÉLÈVE — SUNU MOYENNE
   Écran "Accueil" (dashboard) + fiche "Mon profil scolaire".
   S'appuie sur les données déjà stockées par script.js
   (profil élève, notes par classe/semestre, objectif) et sur
   l'espace professeur pour le rang de la classe.
*/
(function () {
  'use strict';

  function t(key, vars) {
    return typeof window.t === 'function' ? window.t(key, vars) : key;
  }

  function esc(value) {
    const div = document.createElement('div');
    div.textContent = String(value ?? '');
    return div.innerHTML;
  }

  function el(id) {
    return document.getElementById(id);
  }

  /* Format français : 15.42 -> "15,42" */
  function frNum(value, digits = 2) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
    return Number(value).toFixed(digits).replace('.', ',');
  }

  function getProfile() {
    return typeof getStudentProfile === 'function' ? getStudentProfile() : {};
  }

  function currentSem() {
    return typeof getSemestreActuel === 'function' ? getSemestreActuel() : 'Semestre1';
  }

  function classeCourante() {
    const prof = getProfile();
    if (prof.classe) return prof.classe;
    if (typeof classeSelect !== 'undefined' && classeSelect && classeSelect.value) return classeSelect.value;
    return '';
  }

  /* Calculs (moyennes, progression, matière forte/faible) */

  function moySemestre(classe, sem) {
    const notes = classe ? getStoredNotesForClasse(classe, sem) : {};
    if (!Object.keys(notes).length) return null;
    return computeMoyenneBrute(notes);
  }

  function subjectList(classe, sem) {
    const notes = classe ? getStoredNotesForClasse(classe, sem) : {};
    return Object.entries(notes)
      .filter(([, data]) => data && data.moyenne !== null && data.moyenne !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
  }

  /* Objectif : celui de l'élève s'il existe, sinon une suggestion réaliste. */
  function resolveObjectif(moyenneActuelle) {
    const objectif = typeof getObjectifPersonnel === 'function' ? getObjectifPersonnel() : null;
    if (objectif !== null && objectif !== undefined) return Number(objectif);
    if (moyenneActuelle === null) return null;
    return Math.min(20, Math.ceil((moyenneActuelle + 1.5) * 2) / 2);
  }

  /* Rang de classe (depuis l'espace professeur) */

  function parseNote(raw) {
    const value = String(raw ?? '').trim();
    if (!value) return null;
    if (!/^(?:\d|1\d|20)(?:[.,](?:25|50|75))?$/.test(value)) return null;
    return Number(value.replace(',', '.'));
  }

  function moyenneEleve(notes, composition) {
    const d1 = parseNote(notes && notes.d1);
    const d2 = parseNote(notes && notes.d2);
    if (d1 === null || d2 === null) return null;
    const moyDevoirs = (d1 + d2) / 2;
    if (!composition) return moyDevoirs;
    const compo = parseNote(notes && notes.compo);
    return compo === null ? null : (moyDevoirs + compo) / 2;
  }

  function semAvgLocal(classeData, sem, idEleve) {
    const semObj = (classeData && classeData.semestres && classeData.semestres[sem]) || {};
    let somme = 0;
    let coef = 0;
    Object.values(semObj).forEach((record) => {
      if (!record || !record.coefficient) return;
      const moy = moyenneEleve(record.notes ? record.notes[idEleve] : null, record.composition);
      if (moy === null) return;
      somme += moy * record.coefficient;
      coef += record.coefficient;
    });
    return coef ? somme / coef : null;
  }

  function annualAvgLocal(classeData, idEleve) {
    const s1 = semAvgLocal(classeData, 'Semestre1', idEleve);
    const s2 = semAvgLocal(classeData, 'Semestre2', idEleve);
    if (s1 === null) return s2;
    if (s2 === null) return s1;
    return (s1 + s2) / 2;
  }

  function isSameString(a, b) {
    return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
  }

  function computeRank(prof, classe) {
    if (!classe) return null;
    try {
      const store = JSON.parse(localStorage.getItem(PROF_STORE_KEY) || '{}') || {};
      const classeData = store[classe];
      if (!classeData || !Array.isArray(classeData.eleves) || !classeData.eleves.length) return null;

      const self = classeData.eleves.find(
        (e) => isSameString(e.nom, prof.nom) && isSameString(e.prenom, prof.prenom)
      );
      if (!self) return null;

      const scores = classeData.eleves
        .map((e) => ({ id: e.id, avg: annualAvgLocal(classeData, e.id) }))
        .filter((x) => x.avg !== null);
      if (!scores.length) return null;

      scores.sort((a, b) => b.avg - a.avg);
      const myIndex = scores.findIndex((x) => x.id === self.id);
      if (myIndex < 0) return null;
      return { rang: myIndex + 1, total: scores.length, moyenne: scores[myIndex].avg };
    } catch {
      return null;
    }
  }

  /* Données agrégées du tableau de bord */

  function dashData() {
    const prof = getProfile();
    const classe = classeCourante();
    const sem = currentSem();
    const nextSem = sem === 'Semestre1' ? 'Semestre2' : 'Semestre1';

    const moyS1 = moySemestre(classe, 'Semestre1');
    const moyS2 = moySemestre(classe, 'Semestre2');
    const moyActuelle = sem === 'Semestre1' ? moyS1 : moyS2;
    const moyPrécédente = sem === 'Semestre1' ? moyS2 : moyS1;
    const moyAnnuelle = moyS1 !== null && moyS2 !== null ? (moyS1 + moyS2) / 2 : null;

    let delta = null;
    if (moyActuelle !== null && moyPrécédente !== null) delta = moyActuelle - moyPrécédente;

    const objectif = resolveObjectif(moyActuelle);
    const progression =
      moyActuelle !== null && objectif !== null && objectif > 0
        ? Math.min(100, Math.round((moyActuelle / objectif) * 100))
        : 0;

    const subjectPrev = Object.fromEntries(subjectList(classe, nextSem));

    const subjects = subjectList(classe, sem).map(([matiere, data]) => {
      const curAvg = Number(data.moyenne);
      const prev = subjectPrev[matiere] ? Number(subjectPrev[matiere].moyenne) : null;
      let trend = 'flat';
      if (prev !== null) {
        if (curAvg > prev + 0.01) trend = 'up';
        else if (curAvg < prev - 0.01) trend = 'down';
      }
      return { matiere, moy: curAvg, prev, trend };
    });

    return { prof, classe, sem, moyS1, moyS2, moyActuelle, moyAnnuelle, delta, objectif, progression, subjects };
  }

  /* Écran "Accueil" */

  function trendIcon(trend) {
    if (trend === 'up') return `<span class="dash-trend up">${t('dash_trend_up')}</span>`;
    if (trend === 'down') return `<span class="dash-trend down">${t('dash_trend_down')}</span>`;
    return `<span class="dash-trend flat">${t('dash_trend_flat')}</span>`;
  }

  function dashActionsHTML() {
    return `
      <div class="dash-actions">
        <button type="button" class="primary-button" data-dash="calculer">${esc(t('dash_btn_calculer'))}</button>
        <button type="button" class="secondary-button" data-dash="bulletin">${esc(t('dash_btn_bulletin'))}</button>
        <button type="button" class="secondary-button" data-dash="evolution">${esc(t('dash_btn_evolution'))}</button>
        <button type="button" class="ghost-button" data-dash="profil">${esc(t('dash_btn_profil'))}</button>
      </div>
    `;
  }

  function renderDashboard() {
    const root = el('dash-screen');
    if (!root) return;

    const prof = getProfile();
    const hasIdentity = Boolean(prof.nom || prof.prenom || classeCourante());

    if (!hasIdentity) {
      root.innerHTML = `
        <section class="prof-panel dash-empty">
          <span class="dash-empty-emoji" aria-hidden="true">🎓</span>
          <h3>${esc(t('dash_empty_title'))}</h3>
          <p>${esc(t('dash_empty_text'))}</p>
          <div class="dash-actions">
            <button type="button" class="primary-button" data-dash="profil">${esc(t('dash_empty_cta_profile'))}</button>
            <button type="button" class="secondary-button" data-dash="calculer">${esc(t('dash_empty_cta_calc'))}</button>
          </div>
        </section>
      `;
      wireDashboard();
      return;
    }

    const d = dashData();
    const greeting = d.prof.prenom
      ? t('dash_greeting', { prenom: esc(d.prof.prenom) })
      : t('dash_greeting_fallback');

    const deltaHTML =
      d.delta === null
        ? `<span class="dash-delta neutral">${esc(t('dash_delta_first'))}</span>`
        : d.delta >= 0
          ? `<span class="dash-delta up">▲ ${esc(t('dash_delta_positive', { delta: frNum(d.delta) }))}</span>`
          : `<span class="dash-delta down">▼ ${esc(t('dash_delta_negative', { delta: frNum(d.delta) }))}</span>`;

    const rankInfo = d.prof.nom && d.classe ? computeRank(d.prof, d.classe) : null;
    const rankHTML = rankInfo
      ? `${esc(t('dash_rank_of', { rang: rankInfo.rang, total: rankInfo.total }))}`
      : `<span class="dash-rank-unknown">${esc(t('dash_rank_unknown'))}</span>`;

    const subjectsHTML = d.subjects.length
      ? d.subjects.map((s, i) => {
          const width = Math.min(100, (s.moy / 20) * 100);
          const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? '0s' : `${i * 40}ms`;
          const cls = s.moy < 10 ? 'is-low' : s.moy >= 14 ? 'is-high' : '';
          return `
            <div class="dash-subject" style="animation-delay:${delay}">
              <span class="dash-subject-name">${esc(typeof translateMatiere === 'function' ? translateMatiere(s.matiere) : s.matiere)}</span>
              <span class="dash-subject-track"><span class="dash-subject-fill ${cls}" style="width:${width}%"></span></span>
              <b class="dash-subject-value">${frNum(s.moy)}</b>
              ${trendIcon(s.trend)}
            </div>
          `;
        }).join('')
      : `<p class="dash-subjects-empty">${esc(t('dash_subjects_empty'))}<br><small>${esc(t('dash_subjects_empty_cta'))}</small></p>`;

    root.innerHTML = `
      <header class="dash-head">
        <div>
          <h2 class="dash-greeting">${greeting}</h2>
          <p class="dash-subtitle">${esc(t('dash_subtitle'))}</p>
        </div>
        <span class="dash-sem-tag">${esc(t('dash_current_semestre'))} : ${esc(semLabelFr(d.sem))}</span>
      </header>

      <div class="dash-cards">
        <article class="dash-card dash-card-main">
          <span class="dash-card-label">${esc(t('dash_card_moyenne'))}</span>
          <div class="dash-card-value">${frNum(d.moyActuelle)}<small>/20</small></div>
          ${deltaHTML}
        </article>
        <article class="dash-card">
          <span class="dash-card-label">${esc(t('dash_card_rang'))}</span>
          <div class="dash-card-value">${rankHTML}</div>
        </article>
        <article class="dash-card">
          <span class="dash-card-label">${esc(t('dash_card_objectif'))}</span>
          <div class="dash-card-value">${d.objectif === null ? '—' : frNum(d.objectif)}<small>/20</small></div>
          <span class="dash-card-hint">${d.progression === 100 ? esc(t('dash_objectif_atteint')) : ''}</span>
        </article>
      </div>

      <section class="prof-panel dash-panel">
        <div class="dash-progress">
          <div class="dash-progress-head">
            <span>${esc(t('dash_progression'))}</span>
            <b>${esc(t('dash_progress_value', { pct: d.progression }))}</b>
          </div>
          <div class="dash-progress-track" role="progressbar" aria-valuenow="${d.progression}" aria-valuemin="0" aria-valuemax="100">
            <div class="dash-progress-fill" style="width:${d.progression}%"></div>
          </div>
        </div>
      </section>

      <section class="prof-panel dash-panel">
        <div class="prof-panel-head">
          <h4>${esc(t('dash_subjects'))}</h4>
        </div>
        <div class="dash-subjects">${subjectsHTML}</div>
      </section>

      ${dashActionsHTML()}
    `;
    wireDashboard();
  }

  function semLabelFr(sem) {
    return sem === 'Semestre1' ? (t('table_semestre1_full')) : t('table_semestre2_full');
  }

  function wireDashboard() {
    const root = el('dash-screen');
    if (!root || root.dataset.wired) return;
    root.dataset.wired = '1';
    root.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-dash]');
      if (!btn) return;
      const target = btn.dataset.dash;
      if (target && typeof window.activateScreen === 'function') {
        window.activateScreen(target);
      }
    });
  }

  /* Écran "Mon profil scolaire" */

  let pendingPhoto = null;

  function populateProfilForm() {
    const prof = getProfile();
    const nom = el('profil-nom');
    const prenom = el('profil-prenom');
    const classe = el('profil-classe');
    const etab = el('profil-etablissement');
    const annee = el('profil-annee');
    if (nom) nom.value = prof.nom || '';
    if (prenom) prenom.value = prof.prenom || '';
    if (classe) classe.value = prof.classe || '';
    if (etab) etab.value = prof.etablissement || '';
    if (annee) annee.value = prof.anneeScolaire || (typeof getAnneeScolaire === 'function' ? getAnneeScolaire() : '');
    populateMatiereOptions(prof.classe || '', prof.matierePreferee || '');

    pendingPhoto = prof.photo || null;
    updatePhotoUI();
  }

  /* Matière préférée : la liste vient de la même source que l'écran
     Calculer (getMatieresPourClasse + langues vivantes). Sans classe
     choisie, on propose toutes les matières du site. */
  const CLASSES_AVEC_LANGUE = ['4e', '3e', '2nde', '1er', 'Tle'];
  const TOUTES_LES_CLASSES = ['6e', '5e', '4e', '3e', '2nde', '1er', 'Tle'];

  function matieresPourProfil(classe) {
    if (typeof getMatieresPourClasse !== 'function') return [];
    if (!classe) {
      const toutes = new Set();
      TOUTES_LES_CLASSES.forEach((c) => matieresPourProfil(c).forEach((m) => toutes.add(m)));
      return Array.from(toutes);
    }
    const langues = typeof LANGUE_OPTIONS !== 'undefined' ? LANGUE_OPTIONS : [];
    const liste = getMatieresPourClasse(classe);
    return Array.from(new Set(CLASSES_AVEC_LANGUE.includes(classe) ? [...liste, ...langues] : liste));
  }

  function populateMatiereOptions(classe, selected) {
    const select = el('profil-matiere');
    if (!select) return;
    select.innerHTML = '';

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.setAttribute('data-i18n', 'option_matiere_preferee_default');
    placeholder.textContent = t('option_matiere_preferee_default');
    select.appendChild(placeholder);

    const matieres = matieresPourProfil(classe);
    matieres.forEach((matiere) => {
      const option = document.createElement('option');
      option.value = matiere;
      option.textContent = typeof translateMatiere === 'function' ? translateMatiere(matiere) : matiere;
      select.appendChild(option);
    });

    select.value = matieres.includes(selected) ? selected : '';
  }

  function updatePhotoUI() {
    const block = el('profil-photo-block');
    const img = el('profil-photo-img');
    if (!block || !img) return;
    if (pendingPhoto) {
      img.src = pendingPhoto;
      img.alt = '';
      block.hidden = false;
    } else {
      img.src = '';
      block.hidden = true;
    }
  }

  function wireProfilForm() {
    const form = el('profil-form');
    if (!form || form.dataset.wired) return;
    form.dataset.wired = '1';

    const classeProfil = el('profil-classe');
    if (classeProfil) {
      classeProfil.addEventListener('change', () => {
        const matiere = el('profil-matiere');
        populateMatiereOptions(classeProfil.value, matiere ? matiere.value : '');
      });
    }

    const input = el('profil-photo-input');
    if (input) {
      input.addEventListener('change', () => {
        const file = input.files && input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          pendingPhoto = String(reader.result || '');
          input.value = '';
          updatePhotoUI();
        };
        reader.readAsDataURL(file);
      });
    }

    const remove = el('profil-photo-remove');
    if (remove) {
      remove.addEventListener('click', () => {
        pendingPhoto = null;
        updatePhotoUI();
      });
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const nom = el('profil-nom').value.trim();
      const prenom = el('profil-prenom').value.trim();
      const classe = el('profil-classe').value;

      const partial = {
        nom,
        prenom,
        classe,
        etablissement: el('profil-etablissement').value.trim(),
        anneeScolaire: el('profil-annee').value.trim(),
        matierePreferee: el('profil-matiere').value
      };
      if (pendingPhoto) partial.photo = pendingPhoto;
      else if (getProfile().photo) partial.photo = null;

      saveStudentProfile(partial);
      syncCalcForm(nom, prenom, classe);
      refreshProfilFiche();
      if (typeof showInfoDialog === 'function') showInfoDialog(t('profil_saved'));
    });

    const deleteBtn = el('profil-delete-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        if (typeof confirmModal === 'undefined' || !confirmModal.el) return;
        confirmModal.show({
          message: t('profil_delete_confirm'),
          danger: true,
          onConfirm: () => {
            saveStudentProfile({
              nom: '',
              prenom: '',
              classe: '',
              etablissement: '',
              matierePreferee: ''
            });
            if (getProfile().photo) saveStudentProfile({ photo: null });
            pendingPhoto = null;
            updatePhotoUI();
            populateProfilForm();
            syncCalcForm('', '', '');
            refreshProfilFiche();
            if (typeof showInfoDialog === 'function') showInfoDialog(t('profil_deleted'));
          }
        });
      });
    }
  }

  /* Sélectionne dans l'écran Calculer la classe enregistrée dans le profil.
     Si la classe change, langue vivante et série sont réinitialisées
     (comme lors d'un changement manuel de classe), car elles en dépendent. */
  function syncCalcClasse(classe) {
    if (!classe || typeof classeSelect === 'undefined' || !classeSelect) return;
    const existe = Array.from(classeSelect.options).some((o) => o.value === classe);
    if (!existe) return;

    if (classeSelect.value !== classe) {
      classeSelect.value = classe;
      document.querySelectorAll('input[name="langue"], input[name="serie"]').forEach((radio) => {
        radio.checked = false;
      });
      saveStudentProfile({ langue: null, serie: null });
      if (typeof hideResultActionButtons === 'function') hideResultActionButtons();
    }
    if (typeof updateMatieres === 'function') updateMatieres();
    if (typeof updateCoefficientSuggestion === 'function') updateCoefficientSuggestion();
    if (typeof updateStepsTimeline === 'function') updateStepsTimeline();
  }

  /* Synchronise le formulaire du calculateur avec le profil enregistré,
     pour que les écrans restent cohérents entre eux. */
  function syncCalcForm(nom, prenom, classe) {
    const nomInput = document.getElementById('nom');
    const prenomInput = document.getElementById('prenom');
    if (nomInput) nomInput.value = nom;
    if (prenomInput) prenomInput.value = prenom;
    syncCalcClasse(classe);
  }

  /* Appelé à l'ouverture de l'écran Calculer (script.js). */
  window.syncCalcFromProfile = function () {
    syncCalcClasse(getProfile().classe);
  };

  /* Matières fortes / faibles à partir des moyennes annuelles par matière. */
  function subjectStrengths() {
    const classe = classeCourante();
    if (!classe) return { strong: [], weak: [] };

    const bySubject = {};
    ['Semestre1', 'Semestre2'].forEach((sem) => {
      subjectList(classe, sem).forEach(([matiere, data]) => {
        if (!bySubject[matiere]) bySubject[matiere] = [];
        bySubject[matiere].push(Number(data.moyenne));
      });
    });

    const annuals = Object.entries(bySubject)
      .map(([matiere, vals]) => ({
        matiere,
        moy: vals.reduce((s, v) => s + v, 0) / vals.length
      }))
      .sort((a, b) => b.moy - a.moy);

    const strong = annuals.filter((s) => s.moy >= 12).slice(0, 3);
    const weak = annuals.slice().reverse().filter((s) => s.moy < 12).slice(0, 3);
    return { strong, weak: weak.reverse() };
  }

  function makeChips(items) {
    if (!items.length) return `<span class="profil-fiche-na">${esc(t('fiche_vide'))}</span>`;
    return items
      .map(
        (s) =>
          `<span class="profil-chip ${s.moy >= 14 ? 'is-strong' : 'is-weak'}">${esc(
            typeof translateMatiere === 'function' ? translateMatiere(s.matiere) : s.matiere
          )}</span>`
      )
      .join('');
  }

  function refreshProfilFiche() {
    const fiche = el('profil-fiche');
    if (!fiche) return;

    const prof = getProfile();
    const classe = classeCourante();
    const moyS1 = moySemestre(classe, 'Semestre1');
    const moyS2 = moySemestre(classe, 'Semestre2');
    const moyAnnuelle = moyS1 !== null && moyS2 !== null ? (moyS1 + moyS2) / 2 : null;
    const moyActuelle = currentSem() === 'Semestre1' ? moyS1 : moyS2;

    const mention = moyActuelle === null
      ? '<span class="profil-fiche-na">' + esc(t('fiche_vide')) + '</span>'
      : `<span class="mention-badge ${typeof getMention === 'function' ? getMention(moyActuelle).cls : ''}">${esc(typeof getMention === 'function' ? getMention(moyActuelle).label : '')}</span>`;

    const rank = prof.nom && classe ? computeRank(prof, classe) : null;

    const delta =
      moyS1 !== null && moyS2 !== null
        ? (moyS2 - moyS1 >= 0 ? '▲ +' : '▼ ') + frNum(Math.abs(moyS2 - moyS1))
        : esc(t('fiche_vide'));

    const { strong, weak } = subjectStrengths();

    const matiereFav = prof.matierePreferee
      ? esc(typeof translateMatiere === 'function' ? translateMatiere(prof.matierePreferee) : prof.matierePreferee)
      : esc(t('fiche_vide'));

    fiche.innerHTML = `
      <div class="profil-fiche-grid">
        <div class="profil-fiche-cell is-wide"><small>${esc(t('fiche_matiere_preferee'))}</small><b>${matiereFav}</b></div>
        <div class="profil-fiche-cell"><small>${esc(t('fiche_moyenne_actuelle'))}</small><b>${frNum(moyActuelle)}</b></div>
        <div class="profil-fiche-cell"><small>${esc(t('fiche_mention'))}</small>${mention}</div>
        <div class="profil-fiche-cell"><small>${esc(t('fiche_moyenne_s1'))}</small><b>${frNum(moyS1)}</b></div>
        <div class="profil-fiche-cell"><small>${esc(t('fiche_moyenne_s2'))}</small><b>${frNum(moyS2)}</b></div>
        <div class="profil-fiche-cell"><small>${esc(t('fiche_moyenne_annuelle'))}</small><b>${frNum(moyAnnuelle)}</b></div>
        <div class="profil-fiche-cell"><small>${esc(t('fiche_rang'))}</small><b>${rank ? esc(t('dash_rank_of', { rang: rank.rang, total: rank.total })) : esc(t('fiche_vide'))}</b></div>
        <div class="profil-fiche-cell"><small>${esc(t('fiche_progression'))}</small><b>${delta}</b></div>
        <div class="profil-fiche-cell"><small>${esc(t('fiche_objectif'))}</small><b>${resolveObjectif(moyActuelle) === null ? esc(t('fiche_vide')) : frNum(resolveObjectif(moyActuelle))}</b></div>
      </div>
      <div class="profil-fiche-cols">
        <div class="profil-fiche-col">
          <h5>${esc(t('fiche_forces'))}</h5>
          <div class="profil-chips">${makeChips(strong)}</div>
        </div>
        <div class="profil-fiche-col">
          <h5>${esc(t('fiche_faibles'))}</h5>
          <div class="profil-chips">${makeChips(weak)}</div>
        </div>
      </div>
    `;
    wireProfilTexts();
  }

  /* Ajoute data-i18n manquant dans la fiche dynamique après traduction. */
  function wireProfilTexts() {
    const fiche = el('profil-fiche');
    if (fiche) fiche.querySelectorAll('[data-i18n]').forEach((node) => {
      node.textContent = t(node.dataset.i18n);
    });
  }

  function refreshProfilScreen() {
    populateProfilForm();
    refreshProfilFiche();
    wireProfilForm();
  }

  /* Hooks exposés (appelés par script.js) */

  window.refreshDashboardScreen = renderDashboard;
  window.refreshProfilScreen = refreshProfilScreen;

  window.refreshDashboardTexts = function () {
    const accueil = document.querySelector('.app-screen[data-screen="accueil"]');
    const profil = document.querySelector('.app-screen[data-screen="profil"]');
    if (accueil && accueil.classList.contains('is-active')) renderDashboard();
    if (profil && profil.classList.contains('is-active')) refreshProfilScreen();
  };

  /* Mise à jour automatique du tableau de bord quand on arrive sur le site. */
  document.addEventListener('DOMContentLoaded', () => {
    renderDashboard();
    refreshProfilScreen();
  });
})();