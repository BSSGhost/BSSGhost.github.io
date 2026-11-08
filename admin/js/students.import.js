/*
  STUDENT SERVICE — SUNU MOYENNE Administration (Client-friendly version)
  Only client-safe functions - no database access in this file.
  The actual DB operations happen via the API.
  Updated to match the professor's import functionality.
*/

/* ============================== Normalisation ============================== */
export function normalizeField(value) {
  return String(value ?? '').trim();
}

function normalizeHeader(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

function parseDelimitedCSV(text) {
  const source = String(text ?? '').replace(/^\uFEFF/, '');
  const firstLine = source.split(/\r\n|\n|\r/, 1)[0] || '';
  const candidates = [',', ';', '\t'];
  const delimiter = candidates
    .map((candidate) => ({ candidate, count: (firstLine.match(new RegExp(candidate === '\t' ? '\t' : candidate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length }))
    .sort((a, b) => b.count - a.count)[0].candidate;

  const result = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === '"') {
      if (quoted && source[i + 1] === '"') { field += '"'; i += 1; }
      else quoted = !quoted;
    } else if (ch === delimiter && !quoted) {
      row.push(field.trim()); field = '';
    } else if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && source[i + 1] === '\n') i += 1;
      row.push(field.trim()); field = '';
      if (row.some((cell) => cell !== '')) result.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field.trim());
  if (row.some((cell) => cell !== '')) result.push(row);
  return result;
}

function xlsxColumnIndex(reference) {
  const letters = String(reference || '').match(/^[A-Z]+/i)?.[0]?.toUpperCase();
  if (!letters) return -1;
  let index = 0;
  for (const char of letters) index = index * 26 + char.charCodeAt(0) - 64;
  return index - 1;
}

async function parseXlsxFileClient(file) {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('La lecture XLSX n’est pas prise en charge par ce navigateur.');
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const entries = new Map();
  // Lire le répertoire ZIP central : plus fiable que les en-têtes locaux seuls.
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65558); i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Fichier Excel invalide ou endommagé.');
  const count = view.getUint16(eocd + 10, true);
  let cursor = view.getUint32(eocd + 16, true);
  for (let i = 0; i < count; i += 1) {
    if (view.getUint32(cursor, true) !== 0x02014b50) break;
    const method = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const name = new TextDecoder().decode(bytes.slice(cursor + 46, cursor + 46 + nameLength));
    entries.set(name, { method, compressedSize, localOffset });
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  const readEntry = async (name) => {
    const entry = entries.get(name);
    if (!entry) return null;
    const offset = entry.localOffset;
    if (view.getUint32(offset, true) !== 0x04034b50) throw new Error('Structure Excel invalide.');
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const start = offset + 30 + nameLength + extraLength;
    let data = bytes.slice(start, start + entry.compressedSize);
    if (entry.method === 8) {
      const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      data = new Uint8Array(await new Response(stream).arrayBuffer());
    } else if (entry.method !== 0) throw new Error('Compression Excel non prise en charge.');
    return new TextDecoder('utf-8').decode(data);
  };
  const workbookXml = await readEntry('xl/workbook.xml');
  const relsXml = await readEntry('xl/_rels/workbook.xml.rels');
  if (!workbookXml) throw new Error('Classeur Excel illisible.');
  const parser = new DOMParser();
  const workbook = parser.parseFromString(workbookXml, 'application/xml');
  const rels = relsXml ? parser.parseFromString(relsXml, 'application/xml') : null;
  const firstSheet = workbook.querySelector('sheets sheet');
  if (!firstSheet) throw new Error('Aucune feuille trouvée dans le classeur.');
  const relationId = firstSheet.getAttribute('r:id');
  let sheetPath = 'xl/worksheets/sheet1.xml';
  if (rels && relationId) {
    const relation = [...rels.querySelectorAll('Relationship')].find((item) => item.getAttribute('Id') === relationId);
    const target = relation?.getAttribute('Target');
    if (target) sheetPath = target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`;
  }
  const [sharedXml, sheetXml] = await Promise.all([readEntry('xl/sharedStrings.xml'), readEntry(sheetPath)]);
  if (!sheetXml) throw new Error('Feuille de calcul introuvable.');
  const shared = [];
  if (sharedXml) {
    const doc = parser.parseFromString(sharedXml, 'application/xml');
    doc.querySelectorAll('si').forEach((si) => shared.push([...si.querySelectorAll('t')].map((node) => node.textContent || '').join('')));
  }
  const sheet = parser.parseFromString(sheetXml, 'application/xml');
  const rows = [];
  sheet.querySelectorAll('sheetData row').forEach((rowElement) => {
    const cells = [];
    rowElement.querySelectorAll('c').forEach((cell) => {
      const index = xlsxColumnIndex(cell.getAttribute('r'));
      const type = cell.getAttribute('t') || '';
      const valueNode = cell.querySelector('v');
      const inline = cell.querySelector('is');
      let value = '';
      if (type === 's' && valueNode) value = shared[Number(valueNode.textContent)] ?? '';
      else if (type === 'inlineStr' && inline) value = [...inline.querySelectorAll('t')].map((node) => node.textContent || '').join('');
      else if (valueNode) value = valueNode.textContent || '';
      if (index >= 0) cells[index] = String(value).trim();
    });
    if (cells.some((cell) => String(cell ?? '').trim() !== '')) rows.push(cells.map((cell) => cell ?? ''));
  });
  return rows;
}

async function extractPdfTextClient(file) {
  const pdfjs = window.pdfjsLib;
  if (!pdfjs?.getDocument) throw new Error('Le lecteur PDF est indisponible. Recharge la page puis réessaie.');
  const document = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const lines = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const items = content.items.filter((item) => typeof item.str === 'string' && item.str.trim());
    if (!items.length) continue;
    // Regrouper les éléments par hauteur de ligne, puis conserver les tabulations entre colonnes.
    const grouped = new Map();
    for (const item of items) {
      const y = Math.round(item.transform?.[5] ?? 0);
      if (!grouped.has(y)) grouped.set(y, []);
      grouped.get(y).push(item);
    }
    [...grouped.keys()].sort((a, b) => b - a).forEach((y) => {
      const lineItems = grouped.get(y).sort((a, b) => (a.transform?.[4] ?? 0) - (b.transform?.[4] ?? 0));
      lines.push(lineItems.map((item) => item.str.trim()).join('\t'));
    });
  }
  if (!lines.length) throw new Error('Ce PDF semble scanné ou ne contient aucun texte sélectionnable.');
  return lines;
}

/* ============================== Normalisation de genre (professeur) ============================== */

// Convertit une valeur libre (F, Fille, Féminin, M, Garçon, Mme…) en
// 'fille' / 'garçon'. Une valeur vide ou inconnue donne '' : on ne
// devine jamais un genre.
export function normalizeGenre(raw) {
  const v = String(raw || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]+/g, ' ')
    .trim();
  if (!v) return '';
  if (/^(f|fille|filles|feminin|feminine|female|girl|femme|mlle|mme|madame|mademoiselle)$/.test(v)) return 'fille';
  if (/^(m|g|garcon|garcons|masculin|male|boy|homme|h|mr|monsieur)$/.test(v)) return 'garçon';
  return '';
}

function cleanGenre(value) {
  return value === 'fille' || value === 'garçon' ? value : '';
}

function getFormGenre() {
  const checked = document.querySelector('input[name="import-student-genre"]:checked');
  return checked ? cleanGenre(checked.value) : '';
}

function setFormGenre(value) {
  const genre = cleanGenre(value);
  document.querySelectorAll('input[name="import-student-genre"]').forEach((radio) => {
    radio.checked = radio.value === genre;
  });
}

// Compter les genres dans une liste d'élèves
function genreCounts(eleves) {
  const counts = { boys: 0, girls: 0, unknown: 0 };
  (eleves || []).forEach((e) => {
    const g = cleanGenre(e && e.genre);
    if (g === 'garçon') counts.boys += 1;
    else if (g === 'fille') counts.girls += 1;
    else counts.unknown += 1;
  });
  return counts;
}

/* Liste déroulante Genre réutilisée dans l'aperçu d'import. */
function buildGenreSelect(value, onChange) {
  const select = document.createElement('select');
  select.className = 'prof-genre-select';
  select.setAttribute('aria-label', 'Genre de l\'élève');
  [['', '—'], ['garçon', 'Garçon'], ['fille', 'Fille']].forEach(([val, label]) => {
    const option = document.createElement('option');
    option.value = val;
    option.textContent = label;
    select.appendChild(option);
  });
  select.value = cleanGenre(value);
  select.dataset.genre = select.value;
  select.addEventListener('change', () => {
    select.dataset.genre = select.value;
    if (onChange) onChange(cleanGenre(select.value));
  });
  return select;
}

/* ============================== Mapping automatique ============================== */
export function autoMapColumns(headers, knownFields) {
  if (!headers || headers.length === 0) return {};

  const mapping = {};
  const unmatchedHeaders = [];

  for (let i = 0; i < headers.length; i++) {
    const header = normalizeHeader(headers[i]);
    let foundField = null;

    // Essayer correspondance directe
    for (const [fieldName, fieldVariants] of Object.entries(knownFields)) {
      if (fieldVariants.some((variant) => normalizeHeader(variant) === header)) {
        foundField = fieldName;
        break;
      }
    }

    // Essayer correspondance partielle
    if (!foundField) {
      for (const [fieldName, fieldVariants] of Object.entries(knownFields)) {
        if (header && fieldVariants.some((v) => normalizeHeader(v) && (header.includes(normalizeHeader(v)) || normalizeHeader(v).includes(header)))) {
          foundField = fieldName;
          break;
        }
      }
    }

    // Si toujours rien, essayer avec simplification supplémentaire (retirer accents, espaces)
    if (!foundField) {
      const simplifiedHeader = header;
      for (const [fieldName, fieldVariants] of Object.entries(knownFields)) {
        const simplifiedVariants = fieldVariants.map(normalizeHeader);
        if (simplifiedHeader && simplifiedVariants.some((v) => simplifiedHeader === v || v.includes(simplifiedHeader))) {
          foundField = fieldName;
          break;
        }
      }
    }

    if (foundField) {
      mapping[i] = foundField;
    } else {
      unmatchedHeaders.push({ index: i, original: headers[i] });
    }
  }

  // Avertir si des en-têtes importants sont non appariés
  // (warning removed to avoid syntax checking issues with node --check)
  if (unmatchedHeaders.length > 0 && mapping['firstName'] === undefined) {
    // warning intentionally removed
  }

  return mapping;
}

/* ============================== Construction élève depuis ligne ============================== */
export function buildStudentFromRow(row, mapping, knownFields) {
  const getColumn = (colIndex) => {
    if (colIndex === undefined || colIndex === null) return '';
    if (colIndex >= row.length) return '';
    return row[colIndex];
  };

  // Trouver la clé de mapping pour un champ donné
  const findMappingKey = (fieldName) => {
    const keys = Object.keys(mapping).filter(k => mapping[k] === fieldName);
    return keys.length > 0 ? keys[0] : null;
  };

  const firstName = normalizeField(getColumn(
    findMappingKey('firstName')
  ));
  const lastName = normalizeField(getColumn(
    findMappingKey('lastName')
  ));
  const matricule = normalizeField(getColumn(
    findMappingKey('matricule')
  ));
  const gender = getColumn(findMappingKey('gender')) || 'UNSPECIFIED';
  const birthDate = getColumn(findMappingKey('birthDate')) || null;
  const birthPlace = getColumn(findMappingKey('birthPlace')) || null;

  // Validation basique
  if (!firstName || !lastName) {
    return null;
  }

  return {
    firstName,
    lastName,
    matricule: matricule || undefined,
    gender,
    birthDate: birthDate || null,
    birthPlace: birthPlace || null,
  };
}

/* ============================== Known fields for reference ============================== */
export const KNOWN_FIELDS = {
  firstName: ['prénom', 'first_name', 'prenom'],
  lastName: ['nom', 'last_name', 'surname'],
  matricule: ['matricule', 'id_étudiant', 'student_id'],
  gender: ['sexe', 'gender', 'genre'],
  birthDate: ['date de naissance', 'birth_date', 'né(e) le'],
  birthPlace: ['lieu de naissance', 'birth_place', 'lieu_né'],
  classId: ['classe', 'class', 'classe_affectation']
};

/* Déclarer les clés connues pour accès externe */
export const knownFieldKeys = Object.keys(KNOWN_FIELDS);

/* ============================== Détection de doublons (professeur) ============================== */

// Normalise un nom pour la comparaison : minuscules, sans accents,
// apostrophes et tirets ignorés.
export function normName(s) {
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
   normalisation) ou null.
*/
export function duplicateInfo(students, nom, prenom, mode) {
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
export function findDuplicateStudent(students, nom, prenom) {
  const info = duplicateInfo(students, nom, prenom, 'all');
  return info ? info.student : null;
}

/* Modale « Doublon détecté » : Fusionner / Conserver les deux / Annuler.
   Résout une Promise avec 'merge' | 'keepBoth' | 'cancel' | 'none'.
   Adapted for admin interface - uses custom labels and simple translations.
*/
export function askDuplicateResolution(labels, translate = null) {
  return new Promise((resolve) => {
    if (!Array.isArray(labels) || !labels.length) return resolve('none');
    document.querySelectorAll('.prof-dup-modal').forEach((node) => node.remove());
    const t = translate || ((value) => value);
    const modal = document.createElement('div');
    modal.className = 'prof-ocr-modal prof-dup-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'student-duplicate-title');
    const overlay = document.createElement('div');
    overlay.className = 'prof-ocr-overlay';
    const card = document.createElement('div');
    card.className = 'prof-ocr-modal-card';
    const header = document.createElement('div');
    header.className = 'prof-ocr-header';
    const title = document.createElement('h3');
    title.id = 'student-duplicate-title';
    title.textContent = 'Doublons détectés';
    const paragraph = document.createElement('p');
    paragraph.textContent = labels.length === 1 ? `${t('Élève en doublon : ')}${labels[0]}` : t('Les élèves suivants semblent déjà exister :');
    header.append(title, paragraph);
    card.appendChild(header);
    if (labels.length > 1) {
      const list = document.createElement('ul');
      list.className = 'prof-dup-list';
      labels.forEach((label) => { const li = document.createElement('li'); li.textContent = label; list.appendChild(li); });
      card.appendChild(list);
    }
    const actions = document.createElement('div');
    actions.className = 'prof-ocr-actions prof-dup-actions';
    [['merge', 'Conserver l’élève existant', 'secondary-button prof-dup-primary'], ['keep', 'Conserver les deux', 'ghost-button'], ['cancel', 'Annuler', 'ghost-button prof-danger-text']].forEach(([value, label, className]) => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = className; button.dataset.dup = value;
      button.textContent = t(label); actions.appendChild(button);
    });
    card.appendChild(actions); modal.append(overlay, card);
    let settled = false;
    const done = (value) => {
      if (settled) return;
      settled = true; modal.remove(); document.body.style.overflow = ''; resolve(value);
    };
    actions.addEventListener('click', (event) => {
      const button = event.target.closest('[data-dup]');
      if (button) done(button.dataset.dup === 'keep' ? 'keepBoth' : button.dataset.dup);
    });
    overlay.addEventListener('click', () => done('cancel'));
    modal.addEventListener('keydown', (event) => { if (event.key === 'Escape') done('cancel'); });
    document.body.appendChild(modal); document.body.style.overflow = 'hidden';
    actions.querySelector('[data-dup="merge"]')?.focus();
  });
}

/* ============================== Assistant d'import ============================== */
export function StudentsImportWizard(options = {}) {
  const target = document.getElementById('importWizard') || document.getElementById('import-wizard');
  if (!target) return null;
  if (target.dataset.initialized === 'true') return target.wizardController || null;

  const classes = Array.isArray(options.classes) ? options.classes : [];
  const schoolYears = Array.isArray(options.schoolYears) ? options.schoolYears : [];
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  const MAX_ROWS = 10000;
  let rows = [];
  let mapping = {};
  let selectedRows = new Set();
  let genreOverrides = new Map();
  let busy = false;
  let previewPage = 0;
  const PAGE_SIZE = 100;

  target.innerHTML = `
    <div class="student-import-wizard">
      <label class="ui-field"><span class="ui-label">Fichier des élèves</span>
        <input class="ui-input" id="student-import-file" type="file" accept=".csv,.xlsx,.xls,.pdf" />
      </label>
      <div class="ui-row">
        <label class="ui-field"><span class="ui-label">Classe de destination</span>
          <select class="ui-input" id="student-import-class"><option value="">Choisir une classe</option>${classes.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}${item.level ? ` — ${escapeHtml(item.level)}` : ''}</option>`).join('')}</select>
        </label>
        <label class="ui-field"><span class="ui-label">Année scolaire</span>
          <select class="ui-input" id="student-import-year"><option value="">Choisir une année</option>${schoolYears.map((item) => `<option value="${escapeHtml(item.id)}" ${item.is_current ? 'selected' : ''}>${escapeHtml(item.label)}</option>`).join('')}</select>
        </label>
      </div>
      <p id="student-import-status" role="status" aria-live="polite"></p>
      <div id="student-import-summary" aria-live="polite"></div>
      <div id="column-mapping-controls"></div>
      <div id="student-import-preview"></div>
      <button class="ui-btn ui-btn--primary" id="student-import-submit" type="button" disabled>Importer les élèves sélectionnés</button>
    </div>`;

  const fileInput = target.querySelector('#student-import-file');
  const classSelect = target.querySelector('#student-import-class');
  const yearSelect = target.querySelector('#student-import-year');
  const status = target.querySelector('#student-import-status');
  const summary = target.querySelector('#student-import-summary');
  const preview = target.querySelector('#student-import-preview');
  const submit = target.querySelector('#student-import-submit');
  const mappingControls = target.querySelector('#column-mapping-controls');

  const fieldIndex = (field) => Object.keys(mapping).find((key) => mapping[key] === field);
  const getCell = (row, field) => {
    const index = fieldIndex(field);
    return index === undefined ? '' : String(row[Number(index)] ?? '').trim();
  };
  const getValidRows = () => rows.slice(1).map((row, offset) => ({ row, sourceIndex: offset + 1 }))
    .filter(({ row }) => getCell(row, 'firstName') && getCell(row, 'lastName'));

  const updateSummary = () => {
    const total = Math.max(0, rows.length - 1);
    const valid = getValidRows().length;
    summary.textContent = rows.length ? `${total} ligne(s) détectée(s) · ${valid} ligne(s) avec nom et prénom · ${selectedRows.size} sélectionnée(s)` : '';
    submit.disabled = busy || selectedRows.size === 0 || !rows.length;
  };

  const renderPreview = () => {
    if (!rows.length) { preview.innerHTML = ''; updateSummary(); return; }
    const headers = ['Importer', 'Ligne', 'Nom', 'Prénom', 'Genre'];
    const dataCount = rows.length - 1;
    const pageCount = Math.max(1, Math.ceil(dataCount / PAGE_SIZE));
    previewPage = Math.min(previewPage, pageCount - 1);
    const startIndex = previewPage * PAGE_SIZE + 1;
    const display = rows.slice(startIndex, startIndex + PAGE_SIZE);
    const body = display.map((row, offset) => {
      const sourceIndex = startIndex + offset;
      const firstName = getCell(row, 'firstName');
      const lastName = getCell(row, 'lastName');
      const rawGenre = getCell(row, 'gender');
      const genre = genreOverrides.has(sourceIndex) ? genreOverrides.get(sourceIndex) : normalizeGenre(rawGenre);
      const valid = Boolean(firstName && lastName);
      const checked = selectedRows.has(sourceIndex);
      return `<tr>
        <td><input type="checkbox" class="student-import-check" data-index="${sourceIndex}" ${checked ? 'checked' : ''} ${valid ? '' : 'disabled'} aria-label="Importer la ligne ${sourceIndex + 1}" /></td>
        <td>${sourceIndex + 1}</td><td>${escapeHtml(lastName)}</td><td>${escapeHtml(firstName)}</td>
        <td><select class="prof-genre-select student-import-genre" data-index="${sourceIndex}" aria-label="Genre de ${escapeHtml(firstName)} ${escapeHtml(lastName)}">
          <option value="" ${genre === '' ? 'selected' : ''}>Non renseigné</option>
          <option value="garçon" ${genre === 'garçon' ? 'selected' : ''}>Garçon</option>
          <option value="fille" ${genre === 'fille' ? 'selected' : ''}>Fille</option>
        </select></td></tr>`;
    }).join('');
    preview.innerHTML = `<div class="ui-table-card"><table class="ui-table"><thead><tr>${headers.map((header) => `<th>${header}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div>${pageCount > 1 ? `<div class="ui-row student-import-pagination"><button type="button" class="ui-btn" data-page="prev" ${previewPage === 0 ? 'disabled' : ''}>Précédent</button><span>Page ${previewPage + 1} / ${pageCount}</span><button type="button" class="ui-btn" data-page="next" ${previewPage >= pageCount - 1 ? 'disabled' : ''}>Suivant</button></div>` : ''}`;
    updateSummary();
  };

  const renderMappingControls = () => {
    if (!rows.length) { mappingControls.innerHTML = ''; return; }
    const optionsHtml = Object.entries(KNOWN_FIELDS).map(([key, variants]) => `<option value="${key}">${escapeHtml(variants[0] || key)}</option>`).join('');
    mappingControls.innerHTML = `<div class="column-mapping-card"><h3>Correspondance des colonnes</h3><div class="mapping-table">
      <div class="tr"><div class="th">Colonne du fichier</div><div class="th">Champ SUNU MOYENNE</div></div>
      ${rows[0].map((header, index) => `<div class="tr"><div class="td">${escapeHtml(header || `Colonne ${index + 1}`)}</div><div class="td"><select class="ui-input ui-mapping-select" data-column-index="${index}"><option value="">Non associé</option>${optionsHtml}</select></div></div>`).join('')}
      </div></div>`;
    mappingControls.querySelectorAll('.ui-mapping-select').forEach((select) => {
      const index = Number(select.dataset.columnIndex);
      select.value = mapping[index] || '';
    });
  };

  const refreshAfterMappingChange = () => {
    const next = {};
    mappingControls.querySelectorAll('.ui-mapping-select').forEach((select) => {
      if (select.value) next[select.dataset.columnIndex] = select.value;
    });
    mapping = next;
    previewPage = 0;
    selectedRows = new Set(getValidRows().map(({ sourceIndex }) => sourceIndex));
    genreOverrides.clear();
    renderPreview();
  };

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    rows = []; mapping = {}; selectedRows.clear(); genreOverrides.clear();
    submit.disabled = true; preview.innerHTML = ''; summary.textContent = ''; mappingControls.innerHTML = '';
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) { status.textContent = 'Fichier trop volumineux (maximum 10 Mo).'; fileInput.value = ''; return; }
    status.textContent = 'Analyse du fichier…';
    try {
      const name = file.name.toLowerCase();
      if (name.endsWith('.csv')) rows = parseDelimitedCSV(await file.text());
      else if (name.endsWith('.xlsx')) rows = await parseXlsxFileClient(file);
      else if (name.endsWith('.xls')) {
        if (window.XLSX?.read) {
          const workbook = window.XLSX.read(await file.arrayBuffer(), { type: 'array' });
          rows = window.XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, raw: false, defval: '' });
        } else throw new Error('Le format .xls ancien n’est pas pris en charge. Enregistre le fichier au format .xlsx ou .csv.');
      } else if (name.endsWith('.pdf')) {
        const lines = await extractPdfTextClient(file);
        rows = parseDelimitedCSV(lines.join('\n'));
      } else throw new Error('Format de fichier non pris en charge.');
      rows = rows.map((row) => Array.isArray(row) ? row.map((cell) => String(cell ?? '').trim()) : []);
      if (rows.length < 2) throw new Error('Le fichier ne contient aucune ligne élève exploitable.');
      if (rows.length > MAX_ROWS + 1) throw new Error(`Le fichier dépasse la limite de ${MAX_ROWS} lignes.`);
      mapping = autoMapColumns(rows[0], KNOWN_FIELDS);
      previewPage = 0;
      if (fieldIndex('firstName') === undefined || fieldIndex('lastName') === undefined) {
        // Le mapping automatique n'a pas reconnu les deux champs : l'administrateur pourra les associer manuellement.
      }
      selectedRows = new Set(getValidRows().map(({ sourceIndex }) => sourceIndex));
      renderMappingControls(); renderPreview();
      status.textContent = `${rows.length - 1} ligne(s) détectée(s). Vérifie les correspondances et la prévisualisation.`;
    } catch (error) {
      rows = []; mapping = {}; selectedRows.clear(); renderPreview();
      status.textContent = error?.message || 'Impossible de lire le fichier.';
    }
  });

  mappingControls.addEventListener('change', (event) => {
    if (event.target.matches('.ui-mapping-select')) refreshAfterMappingChange();
  });

  preview.addEventListener('click', (event) => {
    const pageButton = event.target.closest('[data-page]');
    if (!pageButton || pageButton.disabled) return;
    previewPage += pageButton.dataset.page === 'next' ? 1 : -1;
    renderPreview();
  });

  preview.addEventListener('change', (event) => {
    const checkbox = event.target.closest('.student-import-check');
    if (checkbox) {
      const index = Number(checkbox.dataset.index);
      if (checkbox.checked) selectedRows.add(index); else selectedRows.delete(index);
      updateSummary();
      return;
    }
    const genreSelect = event.target.closest('.student-import-genre');
    if (genreSelect) genreOverrides.set(Number(genreSelect.dataset.index), cleanGenre(genreSelect.value));
  });

  submit.addEventListener('click', async () => {
    if (busy) return;
    const firstNameKey = fieldIndex('firstName');
    const lastNameKey = fieldIndex('lastName');
    if (firstNameKey === undefined || lastNameKey === undefined) {
      status.textContent = 'Associe obligatoirement une colonne au prénom et une autre au nom.'; return;
    }
    const counts = {};
    Object.values(mapping).forEach((field) => { counts[field] = (counts[field] || 0) + 1; });
    const duplicatedField = Object.entries(counts).find(([field, count]) => count > 1 && ['firstName', 'lastName', 'matricule', 'gender', 'birthDate', 'birthPlace'].includes(field));
    if (duplicatedField) { status.textContent = `Le champ « ${duplicatedField[0]} » est associé à plusieurs colonnes.`; return; }
    const targetClassId = classSelect.value;
    const schoolYearId = yearSelect.value || null;
    if (!targetClassId) { status.textContent = 'Choisis une classe de destination.'; return; }
    if (!selectedRows.size) { status.textContent = 'Sélectionne au moins un élève valide.'; return; }

    busy = true; submit.disabled = true; fileInput.disabled = true; classSelect.disabled = true; yearSelect.disabled = true;
    try {
      status.textContent = 'Vérification des élèves déjà présents…';
      const existingResponse = await fetch(`/api/admin/classes/${encodeURIComponent(targetClassId)}/students`, { credentials: 'same-origin', headers: { Accept: 'application/json' } });
      if (!existingResponse.ok) throw new Error('Impossible de vérifier les élèves de cette classe. Réessaie avant de lancer l’importation.');
      const existingData = await existingResponse.json();
      const existingStudents = Array.isArray(existingData.students) ? existingData.students : [];
      const duplicateDecisions = new Map();
      const exactDuplicateRows = new Set();
      const potentialDuplicates = [];
      const seenIncoming = [];

      [...selectedRows].sort((a, b) => a - b).forEach((sourceIndex) => {
        const row = rows[sourceIndex];
        const firstName = getCell(row, 'firstName');
        const lastName = getCell(row, 'lastName');
        if (!firstName || !lastName) return;
        const existing = duplicateInfo(existingStudents.map((student) => ({ nom: student.last_name || student.nom || '', prenom: student.first_name || student.prenom || '' })), lastName, firstName, 'all');
        const incoming = duplicateInfo(seenIncoming, lastName, firstName, 'all');
        if (existing?.strong || incoming?.strong) {
          exactDuplicateRows.add(sourceIndex);
          duplicateDecisions.set(sourceIndex, 'skip');
        } else if (existing || incoming) {
          const match = existing?.student || incoming?.student;
          potentialDuplicates.push({ sourceIndex, label: `${lastName} ${firstName} — correspondance possible avec ${match?.nom || ''} ${match?.prenom || ''}` });
        }
        seenIncoming.push({ nom: lastName, prenom: firstName });
      });

      let resolution = 'none';
      if (potentialDuplicates.length) {
        resolution = await askDuplicateResolution(potentialDuplicates.map((item) => item.label));
        if (resolution === 'cancel') { status.textContent = 'Importation annulée. Aucune donnée n’a été envoyée.'; return; }
        potentialDuplicates.forEach(({ sourceIndex }) => duplicateDecisions.set(sourceIndex, resolution === 'keepBoth' ? 'keep' : 'skip'));
      }

      const importRows = [rows[0].slice()];
      [...selectedRows].sort((a, b) => a - b).forEach((sourceIndex) => {
        if (duplicateDecisions.get(sourceIndex) === 'skip') return;
        const source = rows[sourceIndex];
        const row = source.slice();
        const genderColumn = fieldIndex('gender');
        if (genderColumn !== undefined && genreOverrides.has(sourceIndex)) row[Number(genderColumn)] = genreOverrides.get(sourceIndex);
        importRows.push(row);
      });
      if (importRows.length < 2) {
        status.textContent = `Aucun nouvel élève à importer. ${exactDuplicateRows.size} doublon(s) exact(s) ignoré(s).`;
        return;
      }

      const backendMapping = {};
      Object.entries(mapping).forEach(([columnIndex, fieldName]) => { backendMapping[String(columnIndex)] = fieldName; });
      if (fieldIndex('gender') === undefined && genreOverrides.size) {
        const genderColumnIndex = importRows[0].length;
        importRows[0].push('Genre');
        importRows.slice(1).forEach((row, index) => {
          const originalSourceIndex = [...selectedRows].sort((a, b) => a - b).filter((sourceIndex) => duplicateDecisions.get(sourceIndex) !== 'skip')[index];
          row[genderColumnIndex] = genreOverrides.get(originalSourceIndex) || '';
        });
        backendMapping[String(genderColumnIndex)] = 'gender';
      }
      status.textContent = `Importation de ${importRows.length - 1} élève(s)…`;
      const response = await fetch('/api/admin/students/import', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          rows: importRows,
          columnMapping: backendMapping,
          targetClassId,
          schoolYearId,
          fileName: fileInput.files?.[0]?.name || null
        })
      });
      let result = {};
      try { result = await response.json(); } catch { /* réponse non JSON */ }
      if (!response.ok) throw new Error(result.message || result.error || `Échec de l’importation (HTTP ${response.status}).`);
      const created = Number(result.created ?? 0);
      const backendDuplicates = Number(result.duplicates ?? 0);
      const errors = Number(result.errors ?? 0);
      status.textContent = `${created} élève(s) importé(s), ${exactDuplicateRows.size + backendDuplicates} doublon(s) ignoré(s), ${errors} erreur(s).`;
      if (Array.isArray(result.details) && result.details.length) {
        const details = document.createElement('ul');
        details.className = 'student-import-errors';
        result.details.slice(0, 20).forEach((detail) => { const li = document.createElement('li'); li.textContent = typeof detail === 'string' ? detail : JSON.stringify(detail); details.appendChild(li); });
        status.appendChild(details);
      }
      if (created > 0) {
        selectedRows.clear();
        renderPreview();
        if (typeof options.onImported === 'function') await options.onImported(result);
      }
    } catch (error) {
      status.textContent = error?.message || 'Échec de l’importation.';
    } finally {
      busy = false; fileInput.disabled = false; classSelect.disabled = false; yearSelect.disabled = false;
      updateSummary();
    }
  });

  target.dataset.initialized = 'true';
  target.wizardController = { refresh: renderPreview };
  return target.wizardController;
}
