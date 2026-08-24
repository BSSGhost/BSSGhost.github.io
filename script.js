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
});

const compositionGroup = document.getElementById('composition-group');
const compositionInput = document.getElementById('composition');
const classeSelect = document.getElementById('classe');
const matiereSelect = document.getElementById('matiere');
const langueGroup = document.getElementById('langue-group');
const langueRadios = document.querySelectorAll('input[name="langue"]');
const boutonSemestre = document.getElementById('calculer-semestre');
const boutonReset = document.getElementById('reset-donnees');
const tableBody = document.getElementById('matiere-table-body');
const classeLabel = document.getElementById('classe-label');
const partnerVisuals = document.querySelectorAll('.partner-visual');
const calculatorCard = document.querySelector('.calculator-card');
const deviceViewportOuter = document.getElementById('device-viewport-outer');
const deviceViewport = document.getElementById('device-viewport');

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

function pulseCard() {
  if (prefersReducedMotion || !calculatorCard) return;
  calculatorCard.classList.remove('just-saved');
  void calculatorCard.offsetWidth;
  calculatorCard.classList.add('just-saved');
}

function renderMoyenneResult({ pillText, value, subtitleText, coefficientText, mention = false }) {
  resultat.classList.remove('error', 'shake');
  const resultContent = resultat.querySelector('.result-content');
  resultContent.replaceChildren();

  const summary = document.createElement('div');
  summary.className = 'result-summary';

  const resultPill = document.createElement('span');
  resultPill.className = 'result-pill';
  resultPill.textContent = pillText;

  const resultValue = document.createElement('strong');
  resultValue.className = 'result-value';
  resultValue.textContent = '0.00';

  const gauge = document.createElement('div');
  gauge.className = `moyenne-gauge ${gradeClass(value)}`;
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
  return document.querySelector('input[name="semestre"]:checked')?.value || 'S1';
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
    ? `Classe : ${classe} • Semestre ${semestre === 'S1' ? '1' : '2'}`
    : 'Aucune classe sélectionnée';

  if (!entries.length) {
    tableBody.innerHTML = '<tr><td colspan="5" class="empty-state">Aucune matière enregistrée pour le moment.</td></tr>';
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
}

function updateMatieres() {
  const selectedClasse = classeSelect.value;
  const selectedLangue = document.querySelector('input[name="langue"]:checked')?.value;

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

  return { complete: true, value: sommePoints / sommeCoefficients };
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
    pillText: `Moyenne du semestre ${semestre === 'S1' ? '1' : '2'}`,
    value: result.value,
    subtitleText: `${prenom} ${nom} • ${classe}`,
    mention: true
  });
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
  const resultS1 = computeMoyennePonderee(matieres, getStoredNotesForClasse(classe, 'S1'));
  const resultS2 = computeMoyennePonderee(matieres, getStoredNotesForClasse(classe, 'S2'));

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
});

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

  if (classe) {
    localStorage.removeItem(getClassStorageKey(classe, 'S1'));
    localStorage.removeItem(getClassStorageKey(classe, 'S2'));
  } else {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(`${STORAGE_PREFIX}_`))
      .forEach((key) => localStorage.removeItem(key));
  }

  form.reset();
  toggleCompositionField();
  renderTableMatiere();
  setResult('Les données ont été réinitialisées avec succès.', false);
  if (!classe) {
    matiereSelect.innerHTML = '<option value="">-- Sélectionner une matière --</option>';
    classeSelect.value = '';
    langueGroup.hidden = true;
  }
});

document.getElementById('telecharger-bulletin').addEventListener('click', function () {
  const classe = classeSelect.value.trim();
  const prenom = document.getElementById('prenom').value.trim();
  const nom = document.getElementById('nom').value.trim();
  const semestre = getSemestreActuel();

  if (!classe || !prenom || !nom) {
    setResult('Veuillez renseigner votre nom, prénom et classe avant de télécharger le bulletin.', true);
    return;
  }

  const notes = getStoredNotesForClasse(classe, semestre);
  const entries = Object.entries(notes).sort(([a], [b]) => a.localeCompare(b));

  if (!entries.length) {
    setResult('Aucune matière enregistrée pour ce semestre : rien à mettre dans le bulletin.', true);
    return;
  }

  if (!window.jspdf) {
    setResult('Le générateur de PDF n’a pas pu se charger. Vérifiez votre connexion puis réessayez.', true);
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 18;
  let y = 20;

  doc.setFillColor(16, 47, 40);
  doc.rect(0, 0, pageWidth, 34, 'F');
  doc.setTextColor(255, 250, 240);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('LYNAQE SENEGAL', marginX, 16);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Lycée Nation-Armée pour la Qualité et l’Equité', marginX, 23);
  doc.text(`Bulletin — Semestre ${semestre === 'S1' ? '1' : '2'}`, marginX, 29);

  y = 46;
  doc.setTextColor(20, 30, 26);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`${prenom} ${nom}`, marginX, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`Classe : ${classe}`, pageWidth - marginX, y, { align: 'right' });
  y += 5;
  doc.setFontSize(9);
  doc.setTextColor(100, 110, 100);
  doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, marginX, y);

  y += 10;

  const colX = [marginX, marginX + 78, marginX + 110, marginX + 142];
  const headers = ['Matière', 'Moyenne /20', 'Coefficient', 'Points'];

  doc.setFillColor(231, 239, 231);
  doc.rect(marginX, y, pageWidth - marginX * 2, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(16, 47, 40);
  headers.forEach((h, i) => doc.text(h, colX[i] + 2, y + 5.5));
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 40, 34);

  let sommePoints = 0;
  let sommeCoeff = 0;

  entries.forEach(([matiere, data], index) => {
    const moyenne = Number(data.moyenne);
    const coefficient = Number(data.coefficient);
    const points = Number(data.points ?? moyenne);
    sommePoints += points;
    sommeCoeff += coefficient;

    if (index % 2 === 0) {
      doc.setFillColor(248, 245, 238);
      doc.rect(marginX, y, pageWidth - marginX * 2, 7, 'F');
    }

    doc.text(matiere, colX[0] + 2, y + 5);
    doc.text(moyenne.toFixed(2), colX[1] + 2, y + 5);
    doc.text(String(coefficient), colX[2] + 2, y + 5);
    doc.text(points.toFixed(2), colX[3] + 2, y + 5);
    y += 7;
  });

  y += 4;
  doc.setDrawColor(200, 200, 200);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 8;

  const moyenneGenerale = sommeCoeff > 0 ? sommePoints / sommeCoeff : 0;
  const mentionSemestre = getMention(moyenneGenerale);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(16, 47, 40);
  doc.text(`Moyenne générale : ${moyenneGenerale.toFixed(2)} / 20`, marginX, y);
  y += 7;
  doc.setFontSize(11);
  doc.text(`Mention : ${mentionSemestre.label}`, marginX, y);

  const matieresRequises = getMatieresDisponiblesPourClasse(classe);
  const resultS1 = computeMoyennePonderee(matieresRequises, getStoredNotesForClasse(classe, 'S1'));
  const resultS2 = computeMoyennePonderee(matieresRequises, getStoredNotesForClasse(classe, 'S2'));

  if (resultS1.complete && resultS2.complete) {
    const moyenneAnnuelle = (resultS1.value + resultS2.value) / 2;
    const mentionAnnuelle = getMention(moyenneAnnuelle);
    y += 10;
    doc.setDrawColor(210, 168, 74);
    doc.setLineWidth(0.6);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(140, 105, 30);
    doc.text(`Moyenne annuelle : ${moyenneAnnuelle.toFixed(2)} / 20 — ${mentionAnnuelle.label}`, marginX, y);
  }

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(120, 130, 120);
  doc.text('Document généré automatiquement par le calculateur LYNAQE SENEGAL — à valeur indicative.', marginX, 285);

  doc.save(`Bulletin_${nom}_${prenom}_${classe}_${semestre}.pdf`);
});

afficherCitationDuJour();
updateMatieres();
renderTableMatiere();