const form = document.getElementById('moyenne-form');
const resultat = document.getElementById('resultat');
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
  DEVICE_CLASSES.forEach((cls) => document.documentElement.classList.remove(cls));
  document.documentElement.classList.add(`device-${device}`);
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

function renderMoyenneResult({ pillText, value, subtitleText, coefficientText }) {
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
  'Science de la Vie et de la Terre',
  'Anglais',
  'Histoire Géographie',
  'Education Civique',
  'Education Physique et Sportive',
  'Informatique',
  'Education au Civisme et à la Citoyenneté',
  'Economie Familiale et Sociale'
];

const STORAGE_PREFIX = 'lynaqe_moyennes';

function getClassStorageKey(classe) {
  return `${STORAGE_PREFIX}_${classe.replace(/\s+/g, '_')}`;
}

function getStoredNotesForClasse(classe) {
  const raw = localStorage.getItem(getClassStorageKey(classe));
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
  const notes = classe ? getStoredNotesForClasse(classe) : {};
  const entries = Object.entries(notes).sort(([a], [b]) => a.localeCompare(b));

  classeLabel.textContent = classe ? `Classe : ${classe}` : 'Aucune classe sélectionnée';

  if (!entries.length) {
    tableBody.innerHTML = '<tr><td colspan="5" class="empty-state">Aucune matière enregistrée pour le moment.</td></tr>';
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
    coefficientText: `Coefficient ${coefficient}`
  });
  pulseCard();
  return { moyenneMatiere, coefficient };
}

form.addEventListener('submit', function (event) {
  event.preventDefault();
  calculerMoyenneDeMatiere();
});

boutonSemestre.addEventListener('click', function () {
  const classe = classeSelect.value.trim();
  const prenom = document.getElementById('prenom').value.trim();
  const nom = document.getElementById('nom').value.trim();

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
  const notes = getStoredNotesForClasse(classe);
  const matieresCalculees = matieres
    .map(matiere => ({
      matiere,
      note: notes[matiere]
    }))
    .filter(entry => entry.note);

  if (matieresCalculees.length !== matieres.length) {
    const matieresManquantes = matieres.filter(matiere => !notes[matiere]);

    setResult(
      `Vous devez d’abord calculer toutes les matières de la classe. Matières manquantes : ${matieresManquantes.join(', ')}.`,
      true
    );
    return;
  }

  const sommePoints = matieresCalculees.reduce(
    (total, item) => total + Number(item.note.points ?? item.note.moyenne),
    0
  );
  const sommeCoefficients = matieresCalculees.reduce((total, item) => total + Number(item.note.coefficient), 0);

  if (sommeCoefficients === 0) {
    setResult('Aucun coefficient disponible pour calculer la moyenne du semestre.', true);
    return;
  }

  const moyenneSemestre = sommePoints / sommeCoefficients;

  renderMoyenneResult({
    pillText: 'Moyenne du semestre',
    value: moyenneSemestre,
    subtitleText: `${prenom} ${nom} • ${classe}`
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
    localStorage.removeItem(getClassStorageKey(classe));
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

updateMatieres();
renderTableMatiere();