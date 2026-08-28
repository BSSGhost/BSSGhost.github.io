const form = document.getElementById('moyenne-form');
const resultat = document.getElementById('resultat');

const loadingScreen = document.getElementById('loading-screen');

window.addEventListener('load', () => {
  const hide = () => {
    if (!loadingScreen) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      loadingScreen.style.display = 'none';
      return;
    }
    loadingScreen.classList.add('is-hidden');
    loadingScreen.addEventListener(
      'animationend',
      () => {
        loadingScreen.style.display = 'none';
      },
      { once: true }
    );
  };
  setTimeout(hide, 900);
  // Safety fallback: the loading screen must never be able to block the site.
  setTimeout(hide, 2500);
});

// Extra fallback for browsers where the load event is delayed by a blocked external resource.
setTimeout(() => {
  const screen = document.getElementById('loading-screen');
  if (screen) {
    screen.classList.add('is-hidden');
    screen.style.display = 'none';
    screen.style.pointerEvents = 'none';
  }
}, 3000);

const compositionGroup = document.getElementById('composition-group');
const compositionInput = document.getElementById('composition');
const classeSelect = document.getElementById('classe');
const matiereSelect = document.getElementById('matiere');
const langueGroup = document.getElementById('langue-group');
const langueRadios = document.querySelectorAll('input[name="langue"]');
const boutonSemestre = document.getElementById('calculer-semestre');
const boutonReset = document.getElementById('reset-donnees');
const boutonTelechargerPdf = document.getElementById('telecharger-bulletin');
const tableBody = document.getElementById('matiere-table-body');

/* Icône + message plus engageant pour le tableau de matières vide,
   réutilisé ici et identique au contenu statique présent dans le HTML au chargement. */
const EMPTY_SUBJECTS_ROW_HTML = `
  <tr>
    <td colspan="5" class="empty-state">
      <svg class="empty-state-icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M6 14a3 3 0 0 1 3-3h9l3 4h18a3 3 0 0 1 3 3v20a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V14Z"></path>
        <path d="M18 27l4 4 8-9"></path>
      </svg>
      <p class="empty-state-title">Aucune matière enregistrée pour le moment</p>
      <p class="empty-state-subtitle">Ajoutez votre première matière ci-dessus pour voir apparaître votre tableau.</p>
    </td>
  </tr>
`;

const classeLabel = document.getElementById('classe-label');
const partnerVisuals = document.querySelectorAll('.partner-visual');
const progressTracker = document.getElementById('progress-tracker');
const progressTrackerFill = document.getElementById('progress-tracker-fill');
const progressTrackerLabel = document.getElementById('progress-tracker-label');
const calculatorCard = document.querySelector('.calculator-card');
const deviceViewportOuter = document.getElementById('device-viewport-outer');
const deviceViewport = document.getElementById('device-viewport');
const compareToggleBtn = document.getElementById('toggle-comparaison-btn');
const comparaisonPanel = document.getElementById('comparaison-panel');
const comparaisonList = document.getElementById('comparaison-list');
const comparaisonSubtitle = document.getElementById('comparaison-subtitle');

const DEVICE_REFERENCE_WIDTHS = {
  phone: 430,
  tablette: 834,
  ordinateur: 1280
};

let currentDevice = null;

function updateViewportScale() {
  if (!deviceViewport || !deviceViewportOuter || !currentDevice) return;

  const refWidth = DEVICE_REFERENCE_WIDTHS[currentDevice];
  const actualWidth = deviceViewportOuter.clientWidth;
  const scale = Math.min(actualWidth / refWidth, 1);

  deviceViewport.style.transform = `scale(${scale})`;

  const naturalHeight = deviceViewport.offsetHeight;
  deviceViewportOuter.style.height = `${naturalHeight * scale}px`;
}

function setDeviceReference(device) {
  currentDevice = device;
  const refWidth = DEVICE_REFERENCE_WIDTHS[device];

  if (!deviceViewport || !refWidth) return;

  deviceViewport.style.width = `${refWidth}px`;
  requestAnimationFrame(updateViewportScale);
}

let scaleUpdateFrame = null;
function scheduleViewportScaleUpdate() {
  if (scaleUpdateFrame) cancelAnimationFrame(scaleUpdateFrame);
  scaleUpdateFrame = requestAnimationFrame(updateViewportScale);
}

window.addEventListener('resize', scheduleViewportScaleUpdate);

if (deviceViewport && 'ResizeObserver' in window) {
  const viewportResizeObserver = new ResizeObserver(() => scheduleViewportScaleUpdate());
  viewportResizeObserver.observe(deviceViewport);
}

const deviceModal = document.getElementById('device-modal');
const deviceOptions = document.querySelectorAll('.device-option');
const changeDeviceBtn = document.getElementById('change-device-btn');

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const DEVICE_CLASSES = ['device-phone', 'device-tablette', 'device-ordinateur'];

function applyDeviceClass(device) {
  DEVICE_CLASSES.forEach((cls) => document.body.classList.remove(cls));
  document.body.classList.add(`device-${device}`);
  setDeviceReference(device);
}

function closeDeviceModal() {
  if (!deviceModal) return;

  if (prefersReducedMotion) {
    deviceModal.style.display = 'none';
    return;
  }

  deviceModal.classList.add('is-closing');
  deviceModal.addEventListener(
    'animationend',
    () => {
      deviceModal.style.display = 'none';
      deviceModal.classList.remove('is-closing');
    },
    { once: true }
  );
}

function openDeviceModal() {
  if (!deviceModal) return;
  deviceModal.classList.remove('is-closing');
  deviceModal.style.display = 'flex';
  deviceOptions[0]?.focus();
}

deviceOptions.forEach((button) => {
  button.addEventListener('click', () => {
    const device = button.dataset.device;
    applyDeviceClass(device);
    closeDeviceModal();
  });
});

changeDeviceBtn?.addEventListener('click', openDeviceModal);

function gradeClass(value) {
  if (value < 10) return 'grade-faible';
  if (value < 14) return 'grade-moyen';
  return 'grade-bien';
}

function getMention(value) {
  if (value < 10) return { label: 'Insuffisant', cls: 'mention-insuffisant' };
  if (value < 14) return { label: 'Peux mieux faire', cls: 'mention-peux-mieux-faire' };
  if (value < 16) return { label: 'Bon travail', cls: 'mention-bon-travail' };
  if (value < 18) return { label: 'Très bon travail', cls: 'mention-tres-bon-travail' };
  return { label: 'Excellent travail', cls: 'mention-excellent-travail' };
}

/* Icône associée à chaque mention : étoile pour les meilleurs résultats,
   médaille pour un bon travail, flèche ascendante pour encourager la suite. */
function getMentionIcon(cls) {
  const star = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.5l2.9 6.06 6.6.79-4.9 4.5 1.28 6.6L12 17.3l-5.88 3.15 1.28-6.6-4.9-4.5 6.6-.79L12 2.5Z"/></svg>';
  const medal = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="14" r="6"></circle><path d="M9 2h6l-2 6.2h-2L9 2Z"></path><path d="M10.3 12.6l1.2 2.6 1.2-2.6"></path></svg>';
  const trending = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="4 15 10 9 14 13 20 6"></polyline><polyline points="14 6 20 6 20 12"></polyline></svg>';

  if (cls === 'mention-excellent-travail' || cls === 'mention-tres-bon-travail') {
    return { svg: star, isTop: true };
  }
  if (cls === 'mention-bon-travail') {
    return { svg: medal, isTop: false };
  }
  return { svg: trending, isTop: false };
}

function animateValue(el, from, to, duration = 900) {
  if (prefersReducedMotion || duration <= 0) {
    el.textContent = to.toFixed(2);
    return;
  }

  const start = performance.now();

  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = from + (to - from) * eased;
    el.textContent = current.toFixed(2);

    if (progress < 1) {
      requestAnimationFrame(tick);
    } else {
      el.textContent = to.toFixed(2);
    }
  }

  requestAnimationFrame(tick);
}

/* Confettis discrets, déclenchés uniquement pour une moyenne excellente (>= 16).
   Respecte prefers-reduced-motion et se nettoie automatiquement du DOM. */
const CONFETTI_COLORS = ['#e8c875', '#cf8a45', '#4eaa7e', '#fffaf0', '#b8752f'];

function launchConfetti(container) {
  if (prefersReducedMotion || !container) return;

  const fragment = document.createDocumentFragment();
  const pieceCount = 18;

  for (let i = 0; i < pieceCount; i += 1) {
    const piece = document.createElement('span');
    piece.className = 'confetti-piece';
    const x = (Math.random() - 0.5) * 220;
    const y = 90 + Math.random() * 100;
    const rot = (Math.random() - 0.5) * 540;
    const delay = Math.random() * 150;

    piece.style.setProperty('--confetti-x', `${x}px`);
    piece.style.setProperty('--confetti-y', `${y}px`);
    piece.style.setProperty('--confetti-rot', `${rot}deg`);
    piece.style.animationDelay = `${delay}ms`;
    piece.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];

    fragment.appendChild(piece);
  }

  container.appendChild(fragment);

  window.setTimeout(() => {
    container.querySelectorAll('.confetti-piece').forEach((el) => el.remove());
  }, 1500);
}

function pulseCard() {
  if (prefersReducedMotion || !calculatorCard) return;
  calculatorCard.classList.remove('just-saved');
  void calculatorCard.offsetWidth;
  calculatorCard.classList.add('just-saved');
}

/* ---------- Favicon dynamique selon la dernière moyenne ---------- */

const LAST_MOYENNE_STORAGE_KEY = 'lynaqe_last_moyenne';

function setFaviconHref(dataUrl) {
  const oldLink = document.querySelector('link[rel="icon"]');
  const newLink = document.createElement('link');
  newLink.rel = 'icon';
  newLink.type = 'image/png';
  newLink.href = dataUrl;
  if (oldLink) {
    oldLink.replaceWith(newLink);
  } else {
    document.head.appendChild(newLink);
  }
}

const BADGE_IMAGE_SRC = 'LYNAQE.png';
let badgeImagePromise = null;

function getBadgeImage() {
  if (!badgeImagePromise) {
    badgeImagePromise = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = BADGE_IMAGE_SRC;
    });
  }
  return badgeImagePromise;
}

async function updateFaviconBadge(value) {
  try {
    const img = await getBadgeImage();
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    /* On dessine le badge LYNAQE tel quel */
    ctx.drawImage(img, 0, 0, 64, 64);

    /* Puis on applique une teinte selon la moyenne, en ne colorant
       que les pixels non transparents du badge (source-atop) */
    let tintColor;
    if (value < 10) {
      tintColor = 'rgba(194, 59, 59, 0.5)';
    } else if (value < 14) {
      tintColor = 'rgba(210, 168, 74, 0.45)';
    } else {
      tintColor = 'rgba(29, 106, 82, 0.4)';
    }

    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = tintColor;
    ctx.fillRect(0, 0, 64, 64);
    ctx.globalCompositeOperation = 'source-over';

    setFaviconHref(canvas.toDataURL('image/png'));

    try {
      localStorage.setItem(LAST_MOYENNE_STORAGE_KEY, String(value));
    } catch {
      /* stockage indisponible, on ignore silencieusement */
    }
  } catch (e) {
    console.log("Impossible de mettre à jour le favicon :", e);
  }
}

function restoreFaviconBadgeFromStorage() {
  try {
    const stored = Number(localStorage.getItem(LAST_MOYENNE_STORAGE_KEY));
    if (Number.isFinite(stored)) {
      updateFaviconBadge(stored);
    }
  } catch {
    /* pas de localStorage disponible, on garde le favicon par défaut */
  }
}

/* ---------- Son discret et optionnel au moment du résultat ---------- */

const SOUND_STORAGE_KEY = 'lynaqe_sound_enabled';
let audioContextInstance = null;

function isSoundEnabled() {
  try {
    const stored = localStorage.getItem(SOUND_STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  } catch {
    return true;
  }
}

function getAudioContext() {
  if (audioContextInstance) return audioContextInstance;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  audioContextInstance = new AudioContextClass();
  return audioContextInstance;
}

function playTone(ctx, freq, startTime, duration, gainValue = 0.07) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(gainValue, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.03);
}

function playResultSound(value) {
  if (!isSoundEnabled()) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  const now = ctx.currentTime;

  if (value >= 14) {
    playTone(ctx, 660, now, 0.16);
    playTone(ctx, 880, now + 0.11, 0.22);
  } else if (value >= 10) {
    playTone(ctx, 540, now, 0.2);
  } else {
    playTone(ctx, 330, now, 0.24, 0.055);
  }
}

function updateSoundButtonUI() {
  const boutonSon = document.getElementById('toggle-son-btn');
  if (!boutonSon) return;

  const enabled = isSoundEnabled();
  const iconOn = boutonSon.querySelector('.son-icon-on');
  const iconOff = boutonSon.querySelector('.son-icon-off');
  const label = boutonSon.querySelector('.son-label');

  boutonSon.setAttribute('aria-pressed', String(enabled));
  boutonSon.classList.toggle('is-muted', !enabled);
  if (iconOn) iconOn.hidden = !enabled;
  if (iconOff) iconOff.hidden = enabled;
  if (label) label.textContent = enabled ? 'Son activé' : 'Son désactivé';
}

document.getElementById('toggle-son-btn')?.addEventListener('click', () => {
  const nextEnabled = !isSoundEnabled();
  try {
    localStorage.setItem(SOUND_STORAGE_KEY, String(nextEnabled));
  } catch {
    /* stockage indisponible, le réglage ne persistera pas */
  }
  updateSoundButtonUI();
  if (nextEnabled) {
    playResultSound(16);
  }
});

updateSoundButtonUI();

/* ---------- Frise d'étapes du formulaire ---------- */

function updateProgressTracker(classeVal, notes) {
  if (!progressTracker || !progressTrackerFill || !progressTrackerLabel) return;

  if (!classeVal) {
    progressTracker.hidden = true;
    return;
  }

  const totalMatieres = getMatieresDisponiblesPourClasse(classeVal).length;
  const doneMatieres = Object.keys(notes).length;
  const percent = totalMatieres > 0 ? Math.min((doneMatieres / totalMatieres) * 100, 100) : 0;
  const isComplete = totalMatieres > 0 && doneMatieres >= totalMatieres;

  progressTracker.hidden = false;
  progressTracker.classList.toggle('is-complete', isComplete);
  progressTrackerFill.style.width = `${percent}%`;
  progressTrackerLabel.textContent = isComplete
    ? `${doneMatieres} / ${totalMatieres} matières • Bulletin prêt !`
    : `${doneMatieres} / ${totalMatieres} matières renseignées`;
}

function updateStepsTimeline() {
  const steps = document.querySelectorAll('.step-item');
  if (!steps.length) return;

  const classeVal = classeSelect.value.trim();
  const nom = document.getElementById('nom').value.trim();
  const prenom = document.getElementById('prenom').value.trim();
  const hasBasicInfo = Boolean(nom && prenom && classeVal);

  const notes = classeVal ? getStoredNotesForClasse(classeVal) : {};
  const hasAtLeastOneMatiere = Object.keys(notes).length > 0;

  updateProgressTracker(classeVal, notes);

  steps.forEach((step) => {
    const stepNumber = Number(step.dataset.step);
    step.classList.remove('is-active', 'is-done');

    if (stepNumber === 1) {
      if (hasBasicInfo) {
        step.classList.add('is-done');
      } else {
        step.classList.add('is-active');
      }
    } else if (stepNumber === 2) {
      if (hasAtLeastOneMatiere) {
        step.classList.add('is-done');
      } else if (hasBasicInfo) {
        step.classList.add('is-active');
      }
    } else if (stepNumber === 3 && hasAtLeastOneMatiere) {
      step.classList.add('is-active');
    }
  });
}

document.getElementById('nom')?.addEventListener('input', updateStepsTimeline);
document.getElementById('prenom')?.addEventListener('input', updateStepsTimeline);

/* ---------- Validation en temps réel des champs de notes ---------- */
/* Donne un retour visuel (bordure verte/rouge) dès la saisie, plutôt que
   d'attendre la soumission du formulaire pour signaler une erreur. */

function updateNoteInputValidity(input) {
  const value = input.value.trim();

  if (!value) {
    // Champ vide : on n'affiche ni erreur ni validation, pour ne pas
    // décourager l'utilisateur avant même qu'il ait commencé à taper.
    input.classList.remove('is-valid', 'is-invalid');
    return;
  }

  const isValid = input.checkValidity();
  input.classList.toggle('is-valid', isValid);
  input.classList.toggle('is-invalid', !isValid);
}

document.querySelectorAll('.note-input').forEach((input) => {
  input.addEventListener('input', () => updateNoteInputValidity(input));
  input.addEventListener('blur', () => updateNoteInputValidity(input));
});


function renderMoyenneResult({ pillText, value, subtitleText, coefficientText, mention = false }) {
  resultat.classList.remove('error', 'shake');
  const resultContent = resultat.querySelector('.result-content');
  resultContent.replaceChildren();

  const grade = gradeClass(value);

  const summary = document.createElement('div');
  summary.className = 'result-summary';

  if (mention) {
    const { label, cls } = getMention(value);
    const { svg, isTop } = getMentionIcon(cls);
    const iconWrap = document.createElement('div');
    iconWrap.className = `mention-icon-wrap${isTop ? ' mention-icon-top' : ''}`;
    iconWrap.innerHTML = svg;
    summary.appendChild(iconWrap);
  }

  const resultPill = document.createElement('span');
  resultPill.className = 'result-pill';
  resultPill.textContent = pillText;

  const resultValue = document.createElement('strong');
  resultValue.className = 'result-value';
  resultValue.textContent = '0.00';

  const gauge = document.createElement('div');
  gauge.className = `moyenne-gauge ${grade}`;
  const gaugeTrack = document.createElement('div');
  gaugeTrack.className = 'moyenne-gauge-track';
  const gaugeFill = document.createElement('div');
  gaugeFill.className = 'moyenne-gauge-fill';
  gaugeTrack.appendChild(gaugeFill);
  gauge.appendChild(gaugeTrack);

  summary.append(resultPill, resultValue, gauge);

  if (mention) {
    const { label, cls } = getMention(value);
    const mentionBadge = document.createElement('span');
    mentionBadge.className = `mention-badge ${cls}`;
    mentionBadge.textContent = label;
    summary.appendChild(mentionBadge);
  }

  if (coefficientText) {
    const coeffLine = document.createElement('small');
    coeffLine.className = 'result-coeff';
    coeffLine.textContent = coefficientText;
    summary.appendChild(coeffLine);
  }

  const resultStudent = document.createElement('small');
  resultStudent.textContent = subtitleText;
  summary.appendChild(resultStudent);

  resultContent.appendChild(summary);

  requestAnimationFrame(() => {
    gaugeFill.style.width = `${Math.min((value / 20) * 100, 100)}%`;
  });

  animateValue(resultValue, 0, value);
  resultat.classList.remove('error');

  /* Dégradé de fond + effet d'apparition "récompense" cohérents avec la note */
  resultat.classList.remove('grade-faible', 'grade-moyen', 'grade-bien', 'is-revealing', 'is-exceptional');
  resultat.classList.add(grade);
  const isExceptional = value >= 16;
  if (isExceptional) {
    resultat.classList.add('is-exceptional');
  }
  void resultat.offsetWidth;
  resultat.classList.add('is-revealing');

  if (isExceptional) {
    launchConfetti(resultat);
  }

  updateFaviconBadge(value);
  playResultSound(value);
}

const matieresCommunesBase = [
  'Mathématiques',
  'Français',
  'SVT',
  'Anglais',
  'Histoire Géographie',
  'EC',
  'EPS',
  'Informatique',
  'E2C',
  'ECOFAM'
];

const STORAGE_PREFIX = 'lynaqe_moyennes';

function getSemestreActuel() {
  return document.querySelector('input[name="semestre"]:checked')?.value || 'Semestre1';
}

function getClassStorageKey(classe, semestre = getSemestreActuel()) {
  return `${STORAGE_PREFIX}_${classe.replace(/\s+/g, '_')}_${semestre}`;
}

function getStoredNotesForClasse(classe, semestre = getSemestreActuel()) {
  const raw = localStorage.getItem(getClassStorageKey(classe, semestre));
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveMatiereNote(classe, matiere, data) {
  const notes = getStoredNotesForClasse(classe);
  notes[matiere] = data;
  localStorage.setItem(getClassStorageKey(classe), JSON.stringify(notes));
  renderTableMatiere();
}

function getMatieresPourClasse(classe) {
  const baseMatieres = [...matieresCommunesBase];
  const matieresSansEconomie = baseMatieres.filter(
    matiere => matiere !== 'Economie Familiale et Sociale'
  );
  const matieresSansEconomieEtCivisme = matieresSansEconomie.filter(
    matiere => matiere !== 'Education au Civisme et à la Citoyenneté'
  );
  const matieresSansCivisme = baseMatieres.filter(
    matiere => matiere !== 'Education au Civisme et à la Citoyenneté'
  );

  if (classe === 'Tle') {
    return [...matieresSansEconomieEtCivisme, 'Sciences Physiques', 'Philosophie'];
  }

  if (classe === '1er') {
    return [...matieresSansEconomieEtCivisme, 'Sciences Physiques'];
  }

  if (classe === '2nde') {
    return [...matieresSansEconomie, 'Sciences Physiques'];
  }

  if (['4e', '3e'].includes(classe)) {
    return [...matieresSansCivisme, 'Sciences Physiques'];
  }

  return baseMatieres;
}

function getMatieresDisponiblesPourClasse(classe) {
  const selectedLangue = document.querySelector('input[name="langue"]:checked')?.value;
  let matieres = getMatieresPourClasse(classe);

  if (['4e', '3e', '2nde', '1er', 'Tle'].includes(classe) && selectedLangue) {
    matieres = [...matieres, selectedLangue];
  }

  return [...new Set(matieres)];
}

function renderTableMatiere() {
  const classe = classeSelect.value;
  const semestre = getSemestreActuel();
  const notes = classe ? getStoredNotesForClasse(classe, semestre) : {};
  const entries = Object.entries(notes).sort(([a], [b]) => a.localeCompare(b));

  classeLabel.textContent = classe
    ? `Classe : ${classe} • ${semestre === 'Semestre1' ? 'Semestre 1' : 'Semestre 2'}`
    : 'Aucune classe sélectionnée';

  updateCompareToggleVisibility();

  if (!entries.length) {
    tableBody.innerHTML = EMPTY_SUBJECTS_ROW_HTML;
    renderRadarChart([]);
    return;
  }

  tableBody.replaceChildren();

  entries.forEach(([matiere, data], index) => {
    const row = document.createElement('tr');
    row.className = 'row-in';
    row.style.animationDelay = prefersReducedMotion ? '0s' : `${index * 45}ms`;
    const moyenne = Number(data.moyenne);
    const coefficient = Number(data.coefficient);
    const points = Number(data.points ?? moyenne);

    [matiere, moyenne.toFixed(2), coefficient, points.toFixed(2)].forEach((value) => {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.appendChild(cell);
    });

    const actionsCell = document.createElement('td');
    actionsCell.className = 'table-actions';

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'table-action edit-action';
    editButton.dataset.action = 'edit';
    editButton.dataset.matiere = matiere;
    editButton.textContent = 'Modifier';

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'table-action delete-action';
    deleteButton.dataset.action = 'delete';
    deleteButton.dataset.matiere = matiere;
    deleteButton.textContent = 'Supprimer';

    actionsCell.append(editButton, deleteButton);
    row.appendChild(actionsCell);
    tableBody.appendChild(row);
  });

  renderRadarChart(entries);
  updateStepsTimeline();

  if (comparaisonPanel && !comparaisonPanel.hidden) {
    renderComparaisonSemestres();
  }
}

/* =========================================================
   COMPARAISON SEMESTRE 1 / SEMESTRE 2
   ========================================================= */
function updateCompareToggleVisibility() {
  if (!compareToggleBtn) return;
  const classe = classeSelect.value;

  if (!classe) {
    compareToggleBtn.hidden = true;
    hideComparaisonPanel();
    return;
  }

  const notesS1 = getStoredNotesForClasse(classe, 'Semestre1');
  const notesS2 = getStoredNotesForClasse(classe, 'Semestre2');
  const hasBoth = Object.keys(notesS1).length > 0 && Object.keys(notesS2).length > 0;

  compareToggleBtn.hidden = !hasBoth;
  if (!hasBoth) {
    hideComparaisonPanel();
  }
}

function hideComparaisonPanel() {
  if (!comparaisonPanel || comparaisonPanel.hidden) return;
  comparaisonPanel.hidden = true;
  if (compareToggleBtn) {
    compareToggleBtn.classList.remove('is-active');
    compareToggleBtn.innerHTML = '<span aria-hidden="true">⇄</span> Comparer S1 / S2';
  }
}

function renderComparaisonSemestres() {
  if (!comparaisonList) return;
  const classe = classeSelect.value;
  if (!classe) return;

  const notesS1 = getStoredNotesForClasse(classe, 'Semestre1');
  const notesS2 = getStoredNotesForClasse(classe, 'Semestre2');
  const matieres = [...new Set([...Object.keys(notesS1), ...Object.keys(notesS2)])].sort((a, b) =>
    a.localeCompare(b)
  );

  if (comparaisonSubtitle) {
    comparaisonSubtitle.textContent = `Classe : ${classe} • ${matieres.length} matière${matieres.length > 1 ? 's' : ''} au total`;
  }

  if (!matieres.length) {
    comparaisonList.innerHTML = '<p class="compare-empty">Aucune matière à comparer pour le moment.</p>';
    return;
  }

  comparaisonList.innerHTML = matieres
    .map((matiere, index) => {
      const moyS1 = notesS1[matiere] ? Number(notesS1[matiere].moyenne) : null;
      const moyS2 = notesS2[matiere] ? Number(notesS2[matiere].moyenne) : null;

      let deltaHtml = '<span class="compare-delta compare-delta-new">Nouveau</span>';
      if (moyS1 !== null && moyS2 !== null) {
        const delta = moyS2 - moyS1;
        if (delta > 0.05) {
          deltaHtml = `<span class="compare-delta compare-delta-up">▲ +${delta.toFixed(2)}</span>`;
        } else if (delta < -0.05) {
          deltaHtml = `<span class="compare-delta compare-delta-down">▼ ${delta.toFixed(2)}</span>`;
        } else {
          deltaHtml = '<span class="compare-delta compare-delta-stable">— Stable</span>';
        }
      }

      const widthS1 = moyS1 !== null ? Math.min(100, (moyS1 / 20) * 100) : 0;
      const widthS2 = moyS2 !== null ? Math.min(100, (moyS2 / 20) * 100) : 0;
      const delay = prefersReducedMotion ? '0s' : `${index * 40}ms`;

      return `
        <div class="compare-row" style="animation-delay:${delay}">
          <div class="compare-row-head">
            <span class="compare-subject">${escapeXml(matiere)}</span>
            ${deltaHtml}
          </div>
          <div class="compare-bars">
            <div class="compare-bar-line">
              <span class="compare-bar-label">S1</span>
              <div class="compare-bar-track"><div class="compare-bar-fill compare-bar-s1" style="width:${widthS1}%"></div></div>
              <span class="compare-bar-value">${moyS1 !== null ? moyS1.toFixed(2) : '—'}</span>
            </div>
            <div class="compare-bar-line">
              <span class="compare-bar-label">S2</span>
              <div class="compare-bar-track"><div class="compare-bar-fill compare-bar-s2" style="width:${widthS2}%"></div></div>
              <span class="compare-bar-value">${moyS2 !== null ? moyS2.toFixed(2) : '—'}</span>
            </div>
          </div>
        </div>
      `;
    })
    .join('');
}

compareToggleBtn?.addEventListener('click', () => {
  if (!comparaisonPanel) return;

  if (comparaisonPanel.hidden) {
    renderComparaisonSemestres();
    comparaisonPanel.hidden = false;
    compareToggleBtn.classList.add('is-active');
    compareToggleBtn.innerHTML = '<span aria-hidden="true">✕</span> Fermer la comparaison';
    comparaisonPanel.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'nearest' });
  } else {
    hideComparaisonPanel();
  }
});

function updateMatieres() {
  const selectedClasse = classeSelect.value;

  matiereSelect.innerHTML = '<option value="">-- Sélectionner une matière --</option>';

  if (!selectedClasse) {
    langueGroup.hidden = true;
    renderTableMatiere();
    return;
  }

  if (['4e', '3e', '2nde', '1er', 'Tle'].includes(selectedClasse)) {
    langueGroup.hidden = false;
  } else {
    langueGroup.hidden = true;
  }

  const matieres = getMatieresDisponiblesPourClasse(selectedClasse);

  matieres.forEach(matiere => {
    const option = document.createElement('option');
    option.value = matiere;
    option.textContent = matiere;
    matiereSelect.appendChild(option);
  });

  renderTableMatiere();
}

langueRadios.forEach(radio => radio.addEventListener('change', updateMatieres));

document.querySelectorAll('input[name="semestre"]').forEach((radio) => {
  radio.addEventListener('change', renderTableMatiere);
});

function setResult(message, isError = false) {
  resultat.classList.toggle('error', isError);
  resultat.classList.remove('grade-faible', 'grade-moyen', 'grade-bien', 'is-revealing');
  const resultContent = resultat.querySelector('.result-content');
  resultContent.replaceChildren();

  const resultTitle = document.createElement('h3');
  resultTitle.textContent = message;
  resultContent.appendChild(resultTitle);

  if (isError && !prefersReducedMotion) {
    resultat.classList.remove('shake');
    void resultat.offsetWidth;
    resultat.classList.add('shake');
  }

  masquerConseillerScolaire();
}

classeSelect.addEventListener('change', function () {
  langueRadios.forEach((radio) => {
    radio.checked = false;
  });
  updateMatieres();
});

function toggleCompositionField() {
  const hasComposition = document.querySelector('input[name="hasComposition"]:checked')?.value === 'oui';
  compositionGroup.classList.toggle('hidden', !hasComposition);
  compositionInput.required = hasComposition;

  if (!hasComposition) {
    compositionInput.value = '';
  }
}

document.querySelectorAll('input[name="hasComposition"]').forEach((radio) => {
  radio.addEventListener('change', toggleCompositionField);
});

toggleCompositionField();

partnerVisuals.forEach((visual) => {
  visual.addEventListener('pointerenter', () => visual.classList.add('is-hovered'));
  visual.addEventListener('pointerleave', () => visual.classList.remove('is-hovered'));
  visual.addEventListener('pointercancel', () => visual.classList.remove('is-hovered'));
});

const officialSiteLogo = document.querySelector('.official-site-logo');

if (officialSiteLogo && !prefersReducedMotion) {
  officialSiteLogo.closest('.official-site-button')?.addEventListener('click', () => {
    officialSiteLogo.classList.remove('is-tapped');
    void officialSiteLogo.offsetWidth;
    officialSiteLogo.classList.add('is-tapped');
  });
}

function isValidDecimalNote(value) {
  const raw = String(value).trim();
  if (!raw) return false;
  if (!/^(?:\d|1\d|20)(?:[.,](?:25|50|75))?$/.test(raw)) {
    return false;
  }

  const normalized = raw.replace(',', '.');
  const number = Number(normalized);
  return Number.isFinite(number) && number >= 0 && number <= 20;
}

function parseDecimalNote(value) {
  return Number(String(value).trim().replace(',', '.'));
}

function calculerMoyenneDeMatiere() {
  const nom = document.getElementById('nom').value.trim();
  const prenom = document.getElementById('prenom').value.trim();
  const classe = document.getElementById('classe').value.trim();
  const matiere = document.getElementById('matiere').value.trim();
  const coefficient = Number(document.getElementById('coefficient').value);
  const devoir1Raw = document.getElementById('devoir1').value;
  const devoir2Raw = document.getElementById('devoir2').value;
  const hasComposition = document.querySelector('input[name="hasComposition"]:checked')?.value === 'oui';
  const compositionRaw = compositionInput.value;

  if (!nom || !prenom || !classe || !matiere) {
    setResult('Veuillez renseigner votre nom, prénom, classe et matière.', true);
    return null;
  }

  if (![devoir1Raw, devoir2Raw].every((value) => isValidDecimalNote(value))) {
    setResult('Les notes doivent être comprises entre 0 et 20 et utiliser uniquement ,25, ,50 ou ,75.', true);
    return null;
  }

  if (!Number.isInteger(coefficient) || coefficient < 1 || coefficient > 8) {
    setResult('Veuillez entrer un coefficient valide entre 1 et 8.', true);
    return null;
  }

  if (hasComposition) {
    if (!isValidDecimalNote(compositionRaw)) {
      setResult('La composition doit être comprise entre 0 et 20 et utiliser uniquement ,25, ,50 ou ,75.', true);
      return null;
    }
  }

  const devoir1 = parseDecimalNote(devoir1Raw);
  const devoir2 = parseDecimalNote(devoir2Raw);
  const composition = hasComposition ? parseDecimalNote(compositionRaw) : null;
  const moyenneDevoirs = (devoir1 + devoir2) / 2;
  const moyenneMatiere = hasComposition
    ? (moyenneDevoirs + composition) / 2
    : moyenneDevoirs;
  const points = moyenneMatiere * coefficient;

  saveMatiereNote(classe, matiere, {
    moyenne: moyenneMatiere,
    points,
    coefficient,
    devoir1,
    devoir2,
    composition,
    hasComposition,
    nom,
    prenom
  });

  renderMoyenneResult({
    pillText: matiere,
    value: moyenneMatiere,
    subtitleText: `${prenom} ${nom} • ${classe}`,
    coefficientText: `Coefficient ${coefficient}`,
    mention: true
  });
  masquerConseillerScolaire();
  pulseCard();
  return { moyenneMatiere, coefficient };
}

form.addEventListener('submit', function (event) {
  event.preventDefault();
  calculerMoyenneDeMatiere();
});

function escapeXml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;'
  }[c]));
}

function renderRadarChart(entries) {
  const radarWrap = document.getElementById('radar-wrap');
  const svg = document.getElementById('radar-chart');
  if (!radarWrap || !svg) return;

  if (!entries.length) {
    radarWrap.hidden = true;
    svg.innerHTML = '';
    return;
  }

  radarWrap.hidden = false;

  const size = 360;
  const center = size / 2;
  const maxRadius = 120;
  const maxValue = 20;
  const levels = 4;
  const count = entries.length;
  const angleStep = (Math.PI * 2) / count;

  const pointFor = (index, value) => {
    const angle = angleStep * index - Math.PI / 2;
    const radius = (Math.min(value, maxValue) / maxValue) * maxRadius;
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle)
    };
  };

  let svgContent = '';

  for (let level = 1; level <= levels; level += 1) {
    const r = (maxRadius / levels) * level;
    const points = entries
      .map((_, i) => {
        const angle = angleStep * i - Math.PI / 2;
        return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
      })
      .join(' ');
    svgContent += `<polygon class="radar-grid" points="${points}" />`;
  }

  entries.forEach(([matiere], i) => {
    const angle = angleStep * i - Math.PI / 2;
    const x2 = center + maxRadius * Math.cos(angle);
    const y2 = center + maxRadius * Math.sin(angle);
    svgContent += `<line class="radar-axis" x1="${center}" y1="${center}" x2="${x2}" y2="${y2}" />`;

    const labelRadius = maxRadius + 22;
    const lx = center + labelRadius * Math.cos(angle);
    const ly = center + labelRadius * Math.sin(angle);
    const shortLabel = matiere.length > 16 ? `${matiere.slice(0, 14)}…` : matiere;
    const anchor = Math.cos(angle) > 0.25 ? 'start' : Math.cos(angle) < -0.25 ? 'end' : 'middle';
    svgContent += `<text class="radar-label" x="${lx}" y="${ly}" text-anchor="${anchor}" dominant-baseline="middle">${escapeXml(shortLabel)}</text>`;
  });

  const shapePoints = entries
    .map(([, data], i) => {
      const p = pointFor(i, Number(data.moyenne));
      return `${p.x},${p.y}`;
    })
    .join(' ');
  svgContent += `<polygon class="radar-shape" points="${shapePoints}" />`;

  entries.forEach(([, data], i) => {
    const p = pointFor(i, Number(data.moyenne));
    svgContent += `<circle class="radar-point" cx="${p.x}" cy="${p.y}" r="3.5" />`;
  });

  svg.innerHTML = svgContent;
}

const CITATIONS_DU_JOUR = [
  "La réussite est la somme de petits efforts répétés jour après jour.",
  "Un examen ne mesure pas ton intelligence, seulement ta préparation du moment.",
  "Relis tes cours le soir même : c’est le moment où la mémoire retient le mieux.",
  "Une bonne moyenne se construit devoir après devoir, pas la veille de la composition.",
  "Pose des questions en classe : ce n’est jamais une perte de temps.",
  "Un planning de révision simple vaut mieux qu’un plan parfait jamais suivi.",
  "Le sommeil avant un examen compte autant que les révisions.",
  "Comprendre un exercice vaut mieux que le mémoriser sans le comprendre.",
  "Chaque matière compte : ne néglige pas celles qui te semblent moins importantes.",
  "Fixe-toi un petit objectif clair pour chaque séance de révision.",
  "Les erreurs corrigées sont les meilleures leçons pour le prochain devoir.",
  "Travailler un peu chaque jour vaut mieux que tout réviser en une nuit.",
  "Note tes points faibles après chaque devoir pour savoir où progresser.",
  "La régularité bat le talent quand le talent ne travaille pas régulièrement.",
  "Un bon élève n’est pas celui qui ne se trompe jamais, mais celui qui persévère.",
  "Prends soin de ta concentration : coupe les distractions pendant que tu révises.",
  "Explique un cours à quelqu’un d’autre : c’est la meilleure façon de vérifier que tu l’as compris.",
  "Chaque semestre est une nouvelle chance de progresser, quel que soit le précédent.",
  "Ne te compare pas aux autres : compare-toi à toi-même et à tes progrès.",
  "La confiance en soi se construit par la préparation et la pratique, pas par la chance.",
  "Même un petit progrès chaque jour finit par faire une grande différence sur le long terme.",
  "Les révisions actives (exercices, questions) sont plus efficaces que la simple lecture.",
  "Un esprit reposé retient mieux : n’oublie pas de faire des pauses pendant tes révisions.",
];

function afficherCitationDuJour() {
  const quoteEl = document.getElementById('quote-of-day-text');
  if (!quoteEl) return;

  const debutAnnee = new Date(new Date().getFullYear(), 0, 0);
  const diffJours = Math.floor((new Date() - debutAnnee) / 86400000);
  const citation = CITATIONS_DU_JOUR[diffJours % CITATIONS_DU_JOUR.length];
  quoteEl.textContent = citation;
}

function computeMoyennePonderee(matieres, notes) {
  const matieresCalculees = matieres
    .map(matiere => ({ matiere, note: notes[matiere] }))
    .filter(entry => entry.note);

  if (matieresCalculees.length !== matieres.length) {
    const matieresManquantes = matieres.filter(matiere => !notes[matiere]);
    return { complete: false, matieresManquantes };
  }

  const sommePoints = matieresCalculees.reduce(
    (total, item) => total + Number(item.note.points ?? item.note.moyenne),
    0
  );
  const sommeCoefficients = matieresCalculees.reduce((total, item) => total + Number(item.note.coefficient), 0);

  if (sommeCoefficients === 0) {
    return { complete: false, matieresManquantes: [] };
  }

  return { complete: true, value: sommePoints / sommeCoefficients, matieresCalculees };
}

const advisorSection = document.getElementById('conseiller-scolaire');
const advisorPointsFortsEl = document.getElementById('advisor-points-forts');
const advisorAAmeliorerEl = document.getElementById('advisor-a-ameliorer');
const advisorObjectifEl = document.getElementById('advisor-objectif');

function combineMatieresAnnuelles(resultS1, resultS2) {
  const map = new Map();

  (resultS1.matieresCalculees || []).forEach((item) => {
    map.set(item.matiere, {
      matiere: item.matiere,
      note: { moyenne: Number(item.note.moyenne), coefficient: Number(item.note.coefficient) }
    });
  });

  (resultS2.matieresCalculees || []).forEach((item) => {
    const existing = map.get(item.matiere);
    if (existing) {
      existing.note.moyenne = (existing.note.moyenne + Number(item.note.moyenne)) / 2;
    } else {
      map.set(item.matiere, {
        matiere: item.matiere,
        note: { moyenne: Number(item.note.moyenne), coefficient: Number(item.note.coefficient) }
      });
    }
  });

  return Array.from(map.values());
}

function getConseilScolaire(matieresCalculees, moyenneGenerale) {
  const sorted = [...matieresCalculees].sort((a, b) => Number(b.note.moyenne) - Number(a.note.moyenne));

  let pointsForts = sorted.filter((item) => Number(item.note.moyenne) >= 14).slice(0, 3);
  if (pointsForts.length === 0) {
    pointsForts = sorted.slice(0, Math.min(2, sorted.length));
  }

  let aAmeliorer = [...sorted].reverse().filter((item) => Number(item.note.moyenne) < 10).slice(0, 3);
  if (aAmeliorer.length === 0) {
    const faibles = [...sorted]
      .reverse()
      .filter((item) => Number(item.note.moyenne) < moyenneGenerale - 1);
    aAmeliorer = faibles.slice(0, 2);
  }

  let objectifText;

  if (moyenneGenerale >= 18) {
    objectifText = `Excellent niveau (${moyenneGenerale.toFixed(2)}/20) : continue sur cette lancée pour viser l'excellence.`;
  } else {
    let objectif = Math.ceil((moyenneGenerale + 1.5) * 2) / 2;
    objectif = Math.min(objectif, 20);

    const leviers = [...matieresCalculees]
      .filter((item) => Number(item.note.moyenne) < objectif)
      .sort((a, b) => {
        const coeffDiff = Number(b.note.coefficient) - Number(a.note.coefficient);
        if (coeffDiff !== 0) return coeffDiff;
        return Number(a.note.moyenne) - Number(b.note.moyenne);
      })
      .slice(0, 2)
      .map((item) => item.matiere);

    const leviersText = leviers.length
      ? `augmente principalement tes résultats en ${leviers.join(' et ')}.`
      : `continue à consolider l'ensemble de tes matières.`;

    objectifText = `Pour atteindre ${objectif}/20 : ${leviersText}`;
  }

  return {
    pointsForts: pointsForts.map((item) => item.matiere),
    aAmeliorer: aAmeliorer.map((item) => item.matiere),
    objectifText
  };
}

function afficherConseillerScolaire(matieresCalculees, moyenneGenerale) {
  if (!advisorSection || !matieresCalculees || matieresCalculees.length < 2) {
    masquerConseillerScolaire();
    return;
  }

  const conseil = getConseilScolaire(matieresCalculees, moyenneGenerale);

  advisorPointsFortsEl.querySelector('.advisor-text').textContent = conseil.pointsForts.length
    ? `Tes points forts : ${conseil.pointsForts.join(', ')}`
    : `Continue tes efforts, aucune matière ne se démarque encore nettement.`;

  advisorAAmeliorerEl.querySelector('.advisor-text').textContent = conseil.aAmeliorer.length
    ? `À améliorer : ${conseil.aAmeliorer.join(', ')}`
    : `Aucune matière en difficulté particulière, bravo pour cet équilibre !`;

  advisorObjectifEl.querySelector('.advisor-text').textContent = conseil.objectifText;

  advisorSection.hidden = false;
  advisorSection.classList.remove('is-revealing');
  void advisorSection.offsetWidth;
  advisorSection.classList.add('is-revealing');
}

function masquerConseillerScolaire() {
  if (advisorSection) advisorSection.hidden = true;
}

boutonSemestre.addEventListener('click', function () {
  const classe = classeSelect.value.trim();
  const prenom = document.getElementById('prenom').value.trim();
  const nom = document.getElementById('nom').value.trim();
  const semestre = getSemestreActuel();

  if (!classe) {
    setResult('Veuillez d’abord sélectionner une classe pour calculer votre moyenne du semestre.', true);
    return;
  }

  if (['4e', '3e', '2nde', '1er', 'Tle'].includes(classe)) {
    const selectedLangue = document.querySelector('input[name="langue"]:checked')?.value;
    if (!selectedLangue) {
      setResult('Veuillez choisir votre langue pour cette classe avant de calculer la moyenne du semestre.', true);
      return;
    }
  }

  const matieres = getMatieresDisponiblesPourClasse(classe);
  const notes = getStoredNotesForClasse(classe, semestre);
  const result = computeMoyennePonderee(matieres, notes);

  if (!result.complete) {
    setResult(
      result.matieresManquantes.length
        ? `Vous devez d’abord calculer toutes les matières de la classe. Matières manquantes : ${result.matieresManquantes.join(', ')}.`
        : 'Aucun coefficient disponible pour calculer la moyenne du semestre.',
      true
    );
    return;
  }

  renderMoyenneResult({
    pillText: `Moyenne du ${semestre === 'Semestre1' ? 'Semestre 1' : 'Semestre 2'}`,
    value: result.value,
    subtitleText: `${prenom} ${nom} • ${classe}`,
    mention: true
  });

  afficherConseillerScolaire(result.matieresCalculees, result.value);
});

document.getElementById('calculer-annee').addEventListener('click', function () {
  const classe = classeSelect.value.trim();
  const prenom = document.getElementById('prenom').value.trim();
  const nom = document.getElementById('nom').value.trim();

  if (!classe) {
    setResult('Veuillez d’abord sélectionner une classe pour calculer votre moyenne annuelle.', true);
    return;
  }

  if (['4e', '3e', '2nde', '1er', 'Tle'].includes(classe)) {
    const selectedLangue = document.querySelector('input[name="langue"]:checked')?.value;
    if (!selectedLangue) {
      setResult('Veuillez choisir votre langue pour cette classe avant de calculer la moyenne annuelle.', true);
      return;
    }
  }

  const matieres = getMatieresDisponiblesPourClasse(classe);
  const resultS1 = computeMoyennePonderee(matieres, getStoredNotesForClasse(classe, 'Semestre1'));
  const resultS2 = computeMoyennePonderee(matieres, getStoredNotesForClasse(classe, 'Semestre2'));

  if (!resultS1.complete || !resultS2.complete) {
    setResult(
      `Il manque des notes au ${!resultS1.complete ? 'semestre 1' : 'semestre 2'} pour toutes les matières de la classe. Complétez les deux semestres avant de calculer la moyenne annuelle.`,
      true
    );
    return;
  }

  const moyenneAnnuelle = (resultS1.value + resultS2.value) / 2;

  renderMoyenneResult({
    pillText: 'Moyenne annuelle',
    value: moyenneAnnuelle,
    subtitleText: `${prenom} ${nom} • ${classe}`,
    mention: true
  });

  afficherConseillerScolaire(combineMatieresAnnuelles(resultS1, resultS2), moyenneAnnuelle);
});

// PDF Premium Generation Function
function generatePDFBulletin() {
  const { jsPDF } = window.jspdf;
  if (!jsPDF) {
    alert("Erreur: La bibliothèque jsPDF n'est pas chargée.");
    return;
  }

  const nom = document.getElementById('nom').value.trim() || 'DIOP';
  const prenom = document.getElementById('prenom').value.trim() || 'Mamadou';
  const classe = document.getElementById('classe').value.trim() || '2nde';
  const semestreVal = getSemestreActuel();
  const semestreText = semestreVal === 'Semestre1' ? '1er Semestre' : '2ème Semestre';
  const notes = getStoredNotesForClasse(classe, semestreVal);
  const entries = Object.entries(notes);

  if (entries.length === 0) {
    alert("Aucune note enregistrée pour cette classe et ce semestre. Veuillez remplir les notes d'abord.");
    return;
  }

  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210
  const pageHeight = doc.internal.pageSize.getHeight(); // 297

  // Double Cadre Soigné
  doc.setDrawColor(16, 47, 40); // Vert Foncé Premium (#102F28)
  doc.setLineWidth(0.8);
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16);

  doc.setDrawColor(210, 168, 74); // Doré (#D2A84A)
  doc.setLineWidth(0.3);
  doc.rect(9.5, 9.5, pageWidth - 19, pageHeight - 19);

  // Filigrane (Watermark en arrière-plan)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(40);
  doc.setTextColor(232, 238, 234);
  doc.text("LYNAQE SÉDHIOU", pageWidth / 2, pageHeight / 2, {
    align: "center",
    angle: 35
  });

  // Logo Intégré (taille normale, proportions respectées)
  const logoImg = document.querySelector('.brand-logo') || document.querySelector('.official-site-logo');
  if (logoImg && logoImg.complete && logoImg.naturalWidth !== 0) {
    try {
      const logoMaxHeight = 24; // hauteur de référence, en mm
      const logoMaxWidth = 22; // largeur maximale disponible, en mm
      const ratio = logoImg.naturalWidth / logoImg.naturalHeight;

      let logoHeight = logoMaxHeight;
      let logoWidth = logoHeight * ratio;

      if (logoWidth > logoMaxWidth) {
        logoWidth = logoMaxWidth;
        logoHeight = logoWidth / ratio;
      }

      doc.addImage(logoImg, 'PNG', 14, 13, logoWidth, logoHeight);
    } catch(e) {
      console.log("Erreur lors de l'intégration du logo :", e);
    }
  }

  // En-tête officiel
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(16, 47, 40);
  doc.text("RÉPUBLIQUE DU SÉNÉGAL", pageWidth - 14, 15, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text("Un Peuple - Un But - Une Foi", pageWidth - 14, 19, { align: "right" });
  doc.text("MINISTÈRE DE L'ÉDUCATION NATIONALE", pageWidth - 14, 23, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.text("Lycée Nation-Armée pour la Qualité et l'Equité", pageWidth - 14, 27, { align: "right" });

  // Ligne de séparation élégante
  doc.setDrawColor(16, 47, 40);
  doc.setLineWidth(0.8);
  doc.line(14, 43, pageWidth - 14, 43);
  doc.setDrawColor(210, 168, 74);
  doc.setLineWidth(0.4);
  doc.line(14, 44.2, pageWidth - 14, 44.2);

  // Bannière Titre
  doc.setFillColor(16, 47, 40);
  doc.roundedRect(14, 48, pageWidth - 28, 12, 2, 2, 'F');

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text(`BULLETIN DE NOTES - ${semestreText.toUpperCase()}`, pageWidth / 2, 55.5, { align: "center" });

  // Cartouche Informations Élève
  doc.setFillColor(248, 246, 240);
  doc.setDrawColor(220, 220, 210);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, 64, pageWidth - 28, 22, 2, 2, 'FD');

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(16, 47, 40);
  doc.text(`Élève : ${prenom.toUpperCase()} ${nom.toUpperCase()}`, 18, 71);
  doc.text(`Classe : ${classe}`, 18, 78);

  const totalCoeff = entries.reduce((acc, [, item]) => acc + Number(item.coefficient), 0);
  const totalPoints = entries.reduce((acc, [, item]) => acc + Number(item.points ?? (item.moyenne * item.coefficient)), 0);
  const moyenneGen = totalCoeff > 0 ? (totalPoints / totalCoeff) : 0;
  const mentionObj = getMention(moyenneGen);

function getAnneeScolaire() {
  const aujourdhui = new Date();
  const annee = aujourdhui.getFullYear();
  const mois = aujourdhui.getMonth();

  if (mois < 8) {
    return `${annee - 1}-${annee}`;
  } else {
    return `${annee}-${annee + 1}`;
  }
}

const anneeScolaireEl = document.getElementById("annee-scolaire");
if (anneeScolaireEl) anneeScolaireEl.textContent = getAnneeScolaire();
  doc.text(`Moyenne Générale : ${moyenneGen.toFixed(2)} / 20`, pageWidth - 18, 78, { align: "right" });

  // Tableau des Notes Soigné avec Colonne d'Appréciation
  const startY = 92;
  const colWidths = [45, 20, 20, 22, 20, 22, 33]; // Somme = 182
  const headers = ["Discipline", "Devoir 1", "Devoir 2", "Compo.", "Coeff.", "Moyenne", "Appréciation"];

  let curY = startY;

  // En-tête du tableau
  doc.setFillColor(23, 75, 61);
  doc.rect(14, curY, pageWidth - 28, 8, 'F');
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);

  let curX = 14;
  const colAligns = ["left", "center", "center", "center", "center", "center", "left"];

  headers.forEach((h, i) => {
    let xPos = curX + (colAligns[i] === "center" ? colWidths[i] / 2 : (colAligns[i] === "right" ? colWidths[i] - 2 : 2));
    doc.text(h, xPos, curY + 5.5, { align: colAligns[i] });
    curX += colWidths[i];
  });

  curY += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);

  function getAppreciation(moy) {
    if (moy < 8) return "Insuffisant";
    if (moy < 10) return "Passable";
    if (moy < 12) return "Assez Bien";
    if (moy < 14) return "Bien";
    if (moy < 16) return "Très Bien";
    return "Excellent";
  }

  // Lignes du tableau
  entries.forEach(([matiere, item], idx) => {
    const moy = Number(item.moyenne);
    const d1 = item.devoir1 !== undefined && item.devoir1 !== null ? Number(item.devoir1).toFixed(2) : '-';
    const d2 = item.devoir2 !== undefined && item.devoir2 !== null ? Number(item.devoir2).toFixed(2) : '-';
    const comp = item.hasComposition ? (item.composition !== null ? Number(item.composition).toFixed(2) : '-') : 'N/A';
    const coeff = item.coefficient;
    const app = getAppreciation(moy);

    if (idx % 2 === 0) {
      doc.setFillColor(250, 249, 245);
      doc.rect(14, curY, pageWidth - 28, 7, 'F');
    }

    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    doc.line(14, curY + 7, pageWidth - 14, curY + 7);

    doc.setTextColor(30, 30, 30);
    let x = 14;

    const rowData = [matiere, d1, d2, comp, String(coeff), moy.toFixed(2), app];

    rowData.forEach((val, i) => {
      let xPos = x + (colAligns[i] === "center" ? colWidths[i] / 2 : (colAligns[i] === "right" ? colWidths[i] - 2 : 2));
      if (i === 5) doc.setFont("helvetica", "bold");
      else doc.setFont("helvetica", "normal");
      doc.text(val, xPos, curY + 4.8, { align: colAligns[i] });
      x += colWidths[i];
    });

    curY += 7;
  });

  // Bordure extérieure du tableau
  doc.setDrawColor(16, 47, 40);
  doc.setLineWidth(0.5);
  doc.rect(14, startY, pageWidth - 28, curY - startY);

  // Synthèse Finale
  curY += 6;
  doc.setFillColor(243, 241, 233);
  doc.setDrawColor(16, 47, 40);
  doc.setLineWidth(0.4);
  doc.roundedRect(14, curY, pageWidth - 28, 16, 1.5, 1.5, 'FD');

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(16, 47, 40);
  doc.text(`Total Coefficients : ${totalCoeff}`, 18, curY + 6);
  doc.text(`Total Points : ${totalPoints.toFixed(2)}`, 18, curY + 12);

  doc.text(`Moyenne Semestrielle : ${moyenneGen.toFixed(2)} / 20`, pageWidth / 2 - 10, curY + 6);

  doc.setTextColor(210, 100, 30);
  doc.text(`Mention : ${mentionObj.label}`, pageWidth - 18, curY + 9, { align: "right" });

  // Bloc Cadre de Signatures
  curY += 24;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(16, 47, 40);

  // Cadre 1 : Parents
  doc.text("Observation & Signature des Parents", 14, curY);
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.rect(14, curY + 3, 55, 25);

  // Cadre 2 : Professeur Principal
  doc.text("Le Professeur Principal", pageWidth / 2 - 27.5, curY);
  doc.rect(pageWidth / 2 - 27.5, curY + 3, 55, 25);

  // Cadre 3 : Le Proviseur
  doc.text("Le Commandant d'école", pageWidth - 69, curY);
  doc.rect(pageWidth - 69, curY + 3, 55, 25);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(120, 120, 120);
  doc.text("Signature et Cachet Officiel", pageWidth - 41.5, curY + 16, { align: "center" });

  // Bas de page
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text("Document officiel généré par SUNU MOYENNE - Lycée Nation-Armée pour la Qualité et l'Equité", pageWidth / 2, pageHeight - 12, { align: "center" });

  doc.save(`Bulletin_${prenom}_${nom}_${classe}_${semestreVal}.pdf`);
}

const PDF_BUTTON_DEFAULT_LABEL = 'Télécharger mon bulletin (PDF)';
const PDF_BUTTON_SUCCESS_LABEL = 'Bulletin téléchargé';

function setPdfButtonLabel(text) {
  const label = boutonTelechargerPdf?.querySelector('.pdf-button-label');
  if (label) label.textContent = text;
}

function handleTelechargerBulletinClick() {
  if (!boutonTelechargerPdf || boutonTelechargerPdf.classList.contains('is-loading')) return;

  boutonTelechargerPdf.classList.remove('is-success');
  boutonTelechargerPdf.classList.add('is-loading');
  boutonTelechargerPdf.disabled = true;
  boutonTelechargerPdf.setAttribute('aria-busy', 'true');
  setPdfButtonLabel('Génération en cours…');

  const finishLoading = (success) => {
    boutonTelechargerPdf.classList.remove('is-loading');

    if (success) {
      // Bref état de succès (coche + barre pleine) avant de revenir à l'état initial :
      // donne une confirmation claire que le bulletin a bien été généré.
      boutonTelechargerPdf.classList.add('is-success');
      setPdfButtonLabel(PDF_BUTTON_SUCCESS_LABEL);

      window.setTimeout(() => {
        boutonTelechargerPdf.classList.remove('is-success');
        boutonTelechargerPdf.disabled = false;
        boutonTelechargerPdf.removeAttribute('aria-busy');
        setPdfButtonLabel(PDF_BUTTON_DEFAULT_LABEL);
      }, 1300);
    } else {
      boutonTelechargerPdf.disabled = false;
      boutonTelechargerPdf.removeAttribute('aria-busy');
      setPdfButtonLabel(PDF_BUTTON_DEFAULT_LABEL);
    }
  };

  // On laisse le navigateur peindre le spinner et la barre de progression avant de lancer
  // la génération (synchrone et potentiellement lourde) du PDF, sinon l'UI resterait figée
  // sans retour visuel.
  window.setTimeout(() => {
    try {
      generatePDFBulletin();
      finishLoading(true);
    } catch (error) {
      console.error('Erreur lors de la génération du PDF :', error);
      setResult('Une erreur est survenue pendant la génération du bulletin. Veuillez réessayer.', true);
      finishLoading(false);
    }
  }, 30);
}

boutonTelechargerPdf?.addEventListener('click', handleTelechargerBulletinClick);

tableBody.addEventListener('click', function (event) {
  const actionButton = event.target.closest('button[data-action]');
  if (!actionButton) return;

  const classe = classeSelect.value.trim();
  const matiere = actionButton.dataset.matiere;
  const notes = getStoredNotesForClasse(classe);
  const note = notes[matiere];

  if (!classe || !note) return;

  if (actionButton.dataset.action === 'delete') {
    if (!window.confirm(`Supprimer la matière « ${matiere} » ?`)) return;
    delete notes[matiere];
    localStorage.setItem(getClassStorageKey(classe), JSON.stringify(notes));
    renderTableMatiere();
    setResult(`La matière ${matiere} a été supprimée.`);
    return;
  }

  matiereSelect.value = matiere;
  document.getElementById('coefficient').value = note.coefficient ?? '';
  document.getElementById('devoir1').value = note.devoir1 ?? '';
  document.getElementById('devoir2').value = note.devoir2 ?? '';
  compositionInput.value = note.composition ?? '';
  document.getElementById('nom').value = note.nom ?? '';
  document.getElementById('prenom').value = note.prenom ?? '';
  document.querySelectorAll('.note-input').forEach((input) => updateNoteInputValidity(input));

  const compositionRadio = document.querySelector(
    `input[name="hasComposition"][value="${note.hasComposition === false ? 'non' : 'oui'}"]`
  );
  if (compositionRadio) compositionRadio.checked = true;
  toggleCompositionField();
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  setResult(`Les données de ${matiere} sont prêtes à être modifiées.`);
});

boutonReset.addEventListener('click', function () {
  const classe = classeSelect.value.trim();

  const confirmMessage = classe
    ? `Toutes les notes de la classe ${classe} (Semestre 1 et 2) seront définitivement supprimées. Voulez-vous continuer ?`
    : 'Toutes les données enregistrées (toutes les classes et matières) seront définitivement supprimées. Voulez-vous continuer ?';

  if (!window.confirm(confirmMessage)) return;

  if (classe) {
    localStorage.removeItem(getClassStorageKey(classe, 'Semestre1'));
    localStorage.removeItem(getClassStorageKey(classe, 'Semestre2'));
  } else {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(`${STORAGE_PREFIX}_`))
      .forEach((key) => localStorage.removeItem(key));
  }

  form.reset();
  document.querySelectorAll('.note-input').forEach((input) => {
    input.classList.remove('is-valid', 'is-invalid');
  });
  toggleCompositionField();
  renderTableMatiere();
  setResult('Les données ont été réinitialisées avec succès.', false);
  if (!classe) {
    matiereSelect.innerHTML = '<option value="">-- Sélectionner une matière --</option>';
    classeSelect.value = '';
    langueGroup.hidden = true;
  }
});

afficherCitationDuJour();
updateMatieres();
renderTableMatiere();
restoreFaviconBadgeFromStorage();

/* =========================================================
   MODE CLAIR/SOMBRE
   ========================================================= */
(() => {
  const THEME_KEY = 'sunu_moyenne_theme';

  function getTheme() {
    try { return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'; } catch { return 'light'; }
  }
  function save(key, value) { try { localStorage.setItem(key, value); } catch {} }

  function applyTheme() {
    const dark = getTheme() === 'dark';
    document.documentElement.classList.toggle('dark-mode', dark);
    const btn = document.getElementById('toggle-theme-btn');
    if (btn) {
      btn.setAttribute('aria-pressed', String(dark));
      const label = btn.querySelector('.theme-label');
      const icon = btn.querySelector('.theme-icon');
      if (label) label.textContent = dark ? 'Mode clair' : 'Mode sombre';
      if (icon) icon.textContent = dark ? '☀️' : '🌙';
    }
  }

  applyTheme();

  document.addEventListener('DOMContentLoaded', () => {
    applyTheme();

    document.getElementById('toggle-theme-btn')?.addEventListener('click', () => {
      save(THEME_KEY, getTheme() === 'dark' ? 'light' : 'dark');
      applyTheme();
    });
  });
})();