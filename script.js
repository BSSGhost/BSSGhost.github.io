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

function saveMatiereNote(classe, matiere, coefficient, moyenneMatiere) {
  const notes = getStoredNotesForClasse(classe);
  notes[matiere] = {
    moyenne: Number(moyenneMatiere),
    coefficient: Number(coefficient)
  };
  localStorage.setItem(getClassStorageKey(classe), JSON.stringify(notes));
  renderTableMatiere();
}

function getMatieresPourClasse(classe) {
  const baseMatieres = [...matieresCommunesBase];
  const matieresSansEconomie = baseMatieres.filter(
    matiere => matiere !== 'Economie Familiale et Sociale'
  );

  if (classe === 'Tle') {
    return [...matieresSansEconomie, 'Sciences Physiques', 'Philosophie'];
  }

  if (['2nde', '1er'].includes(classe)) {
    return [...matieresSansEconomie, 'Sciences Physiques'];
  }

  if (['4e', '3e'].includes(classe)) {
    return [...baseMatieres, 'Sciences Physiques'];
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
    tableBody.innerHTML = '<tr><td colspan="3" class="empty-state">Aucune matière enregistrée pour le moment.</td></tr>';
    return;
  }

  tableBody.innerHTML = entries
    .map(([matiere, data]) => `
      <tr>
        <td>${matiere}</td>
        <td>${Number(data.moyenne).toFixed(2)}</td>
        <td>${Number(data.coefficient)}</td>
      </tr>
    `)
    .join('');
}

function updateMatieres() {
  const selectedClasse = classeSelect.value;
  const selectedLangue = document.querySelector('input[name="langue"]:checked')?.value;

  matiereSelect.innerHTML = '<option value="">-- Sélectionner une matière --</option>';

  if (!selectedClasse) {
    langueGroup.style.display = 'none';
    renderTableMatiere();
    return;
  }

  if (['4e', '3e', '2nde', '1er', 'Tle'].includes(selectedClasse)) {
    langueGroup.style.display = 'block';
  } else {
    langueGroup.style.display = 'none';
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

classeSelect.addEventListener('change', updateMatieres);
langueRadios.forEach(radio => radio.addEventListener('change', updateMatieres));

function setResult(message, isError = false) {
  resultat.classList.toggle('error', isError);
  const resultTitle = resultat.querySelector('h3');
  resultTitle.textContent = message;
}

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

function isValidDecimalNote(value) {
  const raw = String(value).trim();
  if (!raw) return false;
  if (!/^(?:\d+)(?:[.,]\d{1,2})?$/.test(raw)) {
    return false;
  }

  const normalized = raw.replace(',', '.');
  const number = Number(normalized);
  return Number.isFinite(number) && number >= 0 && number <= 20;
}

function calculerMoyenneDeMatiere() {
  const nom = document.getElementById('nom').value.trim();
  const prenom = document.getElementById('prenom').value.trim();
  const classe = document.getElementById('classe').value.trim();
  const matiere = document.getElementById('matiere').value.trim();
  const coefficient = Number(document.getElementById('coefficient').value);
  const devoir1 = Number(String(document.getElementById('devoir1').value).replace(',', '.'));
  const devoir2 = Number(String(document.getElementById('devoir2').value).replace(',', '.'));
  const hasComposition = document.querySelector('input[name="hasComposition"]:checked')?.value === 'oui';
  const composition = Number(String(compositionInput.value).replace(',', '.'));

  if (!nom || !prenom || !classe || !matiere) {
    setResult('Veuillez renseigner votre nom, prénom, classe et matière.', true);
    return null;
  }

  if (![devoir1, devoir2].every((value) => isValidDecimalNote(value))) {
    setResult('Veuillez entrer des notes de devoir valides entre 0 et 20, avec maximum 2 décimales.', true);
    return null;
  }

  if (Number.isNaN(coefficient) || coefficient < 1 || coefficient > 8) {
    setResult('Veuillez entrer un coefficient valide entre 1 et 8.', true);
    return null;
  }

  if (hasComposition) {
    if (!isValidDecimalNote(composition)) {
      setResult('Veuillez entrer une note de composition valide entre 0 et 20, avec maximum 2 décimales.', true);
      return null;
    }
  }

  const moyenneDevoirs = (devoir1 + devoir2) / 2;
  let moyenneMatiere;

  if (hasComposition) {
    moyenneMatiere = ((moyenneDevoirs + composition) / 2) * coefficient;
  } else {
    moyenneMatiere = moyenneDevoirs * coefficient;
  }

  saveMatiereNote(classe, matiere, coefficient, moyenneMatiere);

  setResult(`${prenom} ${nom} (${classe}) — ${matiere} : moyenne = ${moyenneMatiere.toFixed(2)}`);
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

  const sommeMoyennes = matieresCalculees.reduce((total, item) => total + Number(item.note.moyenne), 0);
  const sommeCoefficients = matieresCalculees.reduce((total, item) => total + Number(item.note.coefficient), 0);

  if (sommeCoefficients === 0) {
    setResult('Aucun coefficient disponible pour calculer la moyenne du semestre.', true);
    return;
  }

  const moyenneSemestre = sommeMoyennes / sommeCoefficients;

  const summary = `
    <div class="result-summary">
      <span class="result-pill">Moyenne du semestre</span>
      <strong>${moyenneSemestre.toFixed(2)}</strong>
      <small>${prenom} ${nom} • ${classe}</small>
    </div>
  `;

  resultat.querySelector('.result-content').innerHTML = summary;
  setResult(`${prenom} ${nom} (${classe}) — moyenne du semestre = ${moyenneSemestre.toFixed(2)}`);
});

boutonReset.addEventListener('click', function () {
  const classe = classeSelect.value.trim();

  if (classe) {
    localStorage.removeItem(getClassStorageKey(classe));
  } else {
    localStorage.clear();
  }

  renderTableMatiere();
  setResult('Les données ont été réinitialisées avec succès.', false);
  if (!classe) {
    matiereSelect.innerHTML = '<option value="">-- Sélectionner une matière --</option>';
    classeSelect.value = '';
    langueGroup.style.display = 'none';
  }
});

updateMatieres();
renderTableMatiere();
