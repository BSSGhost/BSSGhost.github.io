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

  const actualWidth = deviceViewportOuter.clientWidth;

  // Si on est sur téléphone ou si l'écran est petit, on adapte en 100% de largeur sans scaling problématique
  if (currentDevice === 'phone' || actualWidth <= 480) {
    deviceViewport.style.width = '100%';
    deviceViewport.style.transform = 'none';
    deviceViewportOuter.style.height = 'auto';
    return;
  }

  const refWidth = DEVICE_REFERENCE_WIDTHS[currentDevice];
  const scale = Math.min(actualWidth / refWidth, 1);

  deviceViewport.style.width = `${refWidth}px`;
  deviceViewport.style.transform = `scale(${scale})`;

  const naturalHeight = deviceViewport.offsetHeight;
  deviceViewportOuter.style.height = `${naturalHeight * scale}px`;
}

function setDeviceReference(device) {
  currentDevice = device;
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
  resultContent.innerHTML = `<p class="result-message">${message}</p>`;
}

function toggleCompositionField() {
  const hasComposition = document.querySelector('input[name="hasComposition"]:checked')?.value;
  if (hasComposition === 'non') {
    compositionGroup.hidden = true;
    compositionInput.required = false;
    compositionInput.value = '';
  } else {
    compositionGroup.hidden = false;
    compositionInput.required = true;
  }
}

document.querySelectorAll('input[name="hasComposition"]').forEach((radio) => {
  radio.addEventListener('change', toggleCompositionField);
});

classeSelect.addEventListener('change', updateMatieres);

tableBody.addEventListener('click', (e) => {
  const button = e.target.closest('button[data-action]');
  if (!button) return;

  const action = button.dataset.action;
  const matiere = button.dataset.matiere;
  const classe = classeSelect.value;

  if (!classe || !matiere) return;

  if (action === 'delete') {
    const notes = getStoredNotesForClasse(classe);
    delete notes[matiere];
    localStorage.setItem(getClassStorageKey(classe), JSON.stringify(notes));
    renderTableMatiere();
    setResult(`La matière "${matiere}" a été supprimée.`);
    return;
  }

  if (action === 'edit') {
    const notes = getStoredNotesForClasse(classe);
    const note = notes[matiere];
    if (!note) return;

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
  }
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
});

form.addEventListener('submit', function (e) {
  e.preventDefault();

  const nom = document.getElementById('nom').value.trim();
  const prenom = document.getElementById('prenom').value.trim();
  const classe = classeSelect.value;
  const matiere = matiereSelect.value;
  const coefficient = parseFloat(document.getElementById('coefficient').value);
  const devoir1 = parseFloat(document.getElementById('devoir1').value);
  const devoir2 = parseFloat(document.getElementById('devoir2').value);
  const hasComposition = document.querySelector('input[name="hasComposition"]:checked')?.value !== 'non';
  const composition = hasComposition ? parseFloat(compositionInput.value) : null;

  if (!nom || !prenom || !classe || !matiere || isNaN(coefficient)) {
    setResult('Veuillez remplir correctement tous les champs obligatoires.', true);
    return;
  }

  let moyDevoirs = 0;
  let nbDevoirs = 0;
  if (!isNaN(devoir1)) { moyDevoirs += devoir1; nbDevoirs++; }
  if (!isNaN(devoir2)) { moyDevoirs += devoir2; nbDevoirs++; }

  if (nbDevoirs === 0 && (!hasComposition || isNaN(composition))) {
    setResult('Veuillez saisir au moins une note (devoir ou composition).', true);
    return;
  }

  moyDevoirs = nbDevoirs > 0 ? moyDevoirs / nbDevoirs : 0;

  let moyenneMatiere = 0;
  if (hasComposition && !isNaN(composition)) {
    moyenneMatiere = nbDevoirs > 0 ? (moyDevoirs + composition) / 2 : composition;
  } else {
    moyenneMatiere = moyDevoirs;
  }

  const points = moyenneMatiere * coefficient;

  saveMatiereNote(classe, matiere, {
    nom,
    prenom,
    coefficient,
    devoir1: isNaN(devoir1) ? null : devoir1,
    devoir2: isNaN(devoir2) ? null : devoir2,
    hasComposition,
    composition,
    moyenne: moyenneMatiere,
    points
  });

  pulseCard();
  renderMoyenneResult({
    pillText: matiere,
    value: moyenneMatiere,
    subtitleText: `${prenom} ${nom} (${classe})`,
    coefficientText: `Coefficient : ${coefficient} | Points : ${points.toFixed(2)}`
  });
});

boutonSemestre?.addEventListener('click', function () {
  const classe = classeSelect.value;
  if (!classe) {
    setResult('Veuillez sélectionner une classe pour calculer la moyenne du semestre.', true);
    return;
  }

  const notes = getStoredNotesForClasse(classe);
  const entries = Object.entries(notes);

  if (!entries.length) {
    setResult('Aucune matière enregistrée pour cette classe.', true);
    return;
  }

  let totalPoints = 0;
  let totalCoefficients = 0;
  let studentName = '';

  entries.forEach(([, data]) => {
    const coeff = Number(data.coefficient) || 0;
    const moy = Number(data.moyenne) || 0;
    totalPoints += moy * coeff;
    totalCoefficients += coeff;
    if (!studentName && data.prenom && data.nom) {
      studentName = `${data.prenom} ${data.nom}`;
    }
  });

  if (totalCoefficients === 0) {
    setResult('Les coefficients enregistrés sont invalides.', true);
    return;
  }

  const moyenneSemestrielle = totalPoints / totalCoefficients;

  renderMoyenneResult({
    pillText: 'Moyenne Général (Semestre)',
    value: moyenneSemestrielle,
    subtitleText: studentName ? `${studentName} (${classe})` : `Classe : ${classe}`,
    coefficientText: `Total coefficients : ${totalCoefficients} | Total points : ${totalPoints.toFixed(2)}`
  });
});

// Initialisation au chargement
toggleCompositionField();