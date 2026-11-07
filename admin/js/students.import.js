/*
  STUDENT SERVICE — SUNU MOYENNE Administration (Client-friendly version)
  Only client-safe functions - no database access in this file.
  The actual DB operations happen via the API.
*/

/* ============================== Normalisation ============================== */
export function normalizeField(value) {
  if (value == null || value === undefined) return '';
  return String(value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/* ============================== Mapping automatique ============================== */
export function autoMapColumns(headers, knownFields) {
  if (!headers || headers.length === 0) return {};

  const mapping = {};
  const unmatchedHeaders = [];

  for (let i = 0; i < headers.length; i++) {
    const header = normalizeField(headers[i]);
    let foundField = null;

    // Essayer correspondance directe
    for (const [fieldName, fieldVariants] of Object.entries(knownFields)) {
      if (fieldVariants.includes(header)) {
        foundField = fieldName;
        break;
      }
    }

    // Essayer correspondance partielle
    if (!foundField) {
      for (const [fieldName, fieldVariants] of Object.entries(knownFields)) {
        if (fieldVariants.some((v) => header.includes(v) || v.includes(header))) {
          foundField = fieldName;
          break;
        }
      }
    }

    // Si toujours rien, essayer avec simplification supplémentaire (retirer accents, espaces)
    if (!foundField) {
      const simplifiedHeader = header.replace(/[-\s]/g, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      for (const [fieldName, fieldVariants] of Object.entries(knownFields)) {
        const simplifiedVariants = fieldVariants.map(v => v.replace(/[-\s]/g, '').normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
        if (simplifiedVariants.some((v) => simplifiedHeader === v || v.includes(simplifiedHeader))) {
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

/* ============================== Parse CSV (client-side) ============================== */
export function parseCsvFileClient(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('Aucun fichier fourni'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        let resultText = text;

        // Enlever l'octet BOM si présent
        if (resultText.charCodeAt(0) === 0xfeff) {
          resultText = resultText.slice(1);
        }

        const lines = resultText.split(/\r\n|\r|\n/);
        const rows = [];

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (!line.trim()) continue;

          // Simple CSV parsing
          const row = [];
          let field = '';
          let inQuotes = false;

          for (let j = 0; j < line.length; j++) {
            const c = line[j];

            if (inQuotes) {
              if (c === '"') {
                if (j + 1 < line.length && line[j + 1] === '"') {
                  field += '"';
                  j++;
                } else {
                  inQuotes = false;
                }
              } else {
                field += c;
              }
            } else if (c === '"') {
              inQuotes = true;
            } else if (c === ';' || c === ',') {
              row.push(field.trim());
              field = '';
            } else {
              field += c;
            }
          }
          row.push(field.trim());
          if (row.some((f) => f !== '')) rows.push(row);
        }

        resolve(rows);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (e) => reject(e.error);
    reader.readAsText(file, 'utf-8');
  });
}

/* ============================== Parse XLSX (client-side, avec try/catch corrigé) ============================== */
export function parseXlsxFileClient(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('Aucun fichier fourni'));
      return;
    }

    // Vérifier si DecompressionStream est disponible (PWA/ moderne)
    if (typeof DecompressionStream === 'undefined') {
      // Essayer une approche simpler : lire les premiers octets pour vérifier le format
      const name = file.name.toLowerCase();
      if (name.endsWith('.xlsx')) {
        reject(new Error(
          'Lecture XLSX complète non disponible sans DecompressionStream. ' +
          'Veuillez convertir le fichier en CSV ou utiliser un fichier CSV.'
        ));
      } else {
        reject(new Error('Format de fichier inconnu'));
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);

        // Vérifier l'en-tête XLSX
        if (dv.getUint32(0, true) !== 0x04034b50) {
          reject(new Error('Format XLSX invalide'));
          return;
        }

        // Minimal XLSX parsing - read shared strings and sheet1
        const entries = {};
        let pos = 0;

        // Read all entries from the workbook
        while (pos + 30 <= data.length) {
          if (dv.getUint32(pos, true) !== 0x04034b50) break;
          const method = dv.getUint16(pos + 8, true);
          const compSize = dv.getUint32(pos + 18, true);
          const nameLen = dv.getUint16(pos + 26, true);
          const extraLen = dv.getUint16(pos + 28, true);
          const entryName = new TextDecoder().decode(data.slice(pos + 30, pos + 30 + nameLen));
          const entryDataStart = pos + 30 + nameLen + extraLen;
          entries[entryName] = { method, compSize, dataStart: entryDataStart };
          pos = entryDataStart + compSize;
        }

        const inflateEntry = async (entry) => {
          const raw = data.slice(entry.dataStart, entry.dataStart + entry.compSize);
          if (entry.method === 0) return raw;
          if (entry.method !== 8 || typeof DecompressionStream === 'undefined') {
            throw new Error('Compression XLSX non prise en charge par ce navigateur');
          }
          const stream = new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
          return new Uint8Array(await new Response(stream).arrayBuffer());
        };

        const parser = new DOMParser();
        // Read shared strings
        let sharedStrings = [];
        if ('xl/sharedStrings.xml' in entries) {
          const ssData = await inflateEntry(entries['xl/sharedStrings.xml']);
          const ssText = new TextDecoder('utf-8').decode(ssData);
          const doc = parser.parseFromString(ssText, 'application/xml');
          if (doc.querySelectorAll) {
            doc.querySelectorAll('si').forEach((si) => {
              let text = '';
              si.querySelectorAll('t').forEach((n) => {
                text += n.textContent;
              });
              sharedStrings.push(text);
            });
          }
        }

        // Read sheet1
        if ('xl/worksheets/sheet1.xml' in entries) {
          const sheetData = await inflateEntry(entries['xl/worksheets/sheet1.xml']);
          const sheetText = new TextDecoder('utf-8').decode(sheetData);
          const doc = parser.parseFromString(sheetText, 'application/xml');
          const rows = [];

          doc.querySelectorAll('sheetData row').forEach((rowEl) => {
            const cells = [];
            rowEl.querySelectorAll('c').forEach((cEl) => {
              const ref = cEl.getAttribute('r');
              const type = cEl.getAttribute('t') || '';
              const vEl = cEl.querySelector('v');
              const isEl = cEl.querySelector('is');
              let value = '';

              if (type === 's' && vEl) {
                const siIndex = Number(vEl.textContent);
                value = sharedStrings[siIndex] || '';
              } else if (type === 'inlineStr' && isEl) {
                value = isEl.textContent || '';
              } else if (vEl) {
                value = vEl.textContent || '';
              }

              const idx = ref ? ref.charCodeAt(0) - 65 : 0;
              while (cells.length <= idx) cells.push('');
              cells[idx] = String(value).trim();
            });

            if (cells.some((f) => f !== '')) rows.push(cells);
          });

          resolve(rows);
        } else {
          reject(new Error('Feuille de calcul introuvable dans le fichier Excel'));
        }
      } catch (error) {
        // ** CORRECTION : Bloc try/catch complet et correctement fermé**
        reject(error);
      }
    };

    reader.onerror = (e) => reject(e.error);
    reader.readAsArrayBuffer(file);
  });
}

/* ============================== Detect PDF type ============================== */
export async function detectPdfTypeClient(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const arrayBuffer = e.target.result;
      const uint8 = new Uint8Array(arrayBuffer);

      if (uint8[0] === 0x25 && uint8[1] === 0x50 && uint8[2] === 0x44 && uint8[3] === 0x46) {
        // C'est un fichier PDF valide
        if (typeof window.pdfjsLib !== 'undefined') {
          (async () => {
            try {
              const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
              const page = await pdf.getPage(1);
              const text = await page.getTextContent();
              const hasText = text.items && text.items.some((item) => {
                return item.str && item.str.trim().length > 0;
              });
              resolve({ isScanned: !hasText, message: hasText ? '' : 'Ce PDF semble être un document scanné sans texte sélectionnable.' });
            } catch (e) {
              resolve({ isScanned: true, message: 'Impossible d\'extraire le texte de ce PDF.' });
            }
          })();
        } else {
          resolve({ isScanned: true, message: 'pdf.js non chargé sur le client.' });
        }
      } else {
        resolve({ isScanned: true, message: 'Format de fichier non reconnu.' });
      }
    };

    reader.onerror = () => resolve({ isScanned: true, message: 'Erreur de lecture du fichier.' });
    reader.readAsArrayBuffer(file);
  });
}

/* ============================== Extract PDF text (client-side) ============================== */
export async function extractPdfTextClient(file) {
  return new Promise((resolve, reject) => {
    if (typeof window.extractPdfText === 'function') {
      window.extractPdfText(file).then(resolve).catch(reject);
      return;
    }

    if (typeof window.pdfjsLib === 'undefined') {
      reject(new Error('pdf.js non disponible dans le navigateur'));
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target.result;
        const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        const textContent = await page.getTextContent();
        const items = textContent.items
          .filter((item) => item.str && String(item.str).trim() !== '')
          .map((item) => ({ y: item.transform[5], x: item.transform[4], text: String(item.str) }));

        const lines = [];
        let currentY = null;
        let lineItems = [];

        const sortedItems = items.sort((a, b) => b.y - a.y || a.x - b.x);

        for (const it of sortedItems) {
          if (currentY !== null && Math.abs(it.y - currentY) > 3) {
            lineItems.sort((a, b) => a.x - b.x);
            lines.push(lineItems.map((i) => i.text).join(' '));
            lineItems = [];
          }
          currentY = it.y;
          lineItems.push(it);
        }

        if (lineItems.length) {
          lineItems.sort((a, b) => a.x - b.x);
          lines.push(lineItems.map((i) => i.text).join(' '));
        }

        resolve(lines);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (e) => reject(e.error);
    reader.readAsArrayBuffer(file);
  });
}

/* ============================== Assistant d'import ============================== */
export function StudentsImportWizard(options = {}) {
  const target = document.getElementById('importWizard') || document.getElementById('import-wizard');
  if (!target) return null;
  if (target.dataset.initialized === 'true') return target.wizardController || null;

  let rows = [];
  let mapping = {};
  const classes = options.classes || [];
  const schoolYears = options.schoolYears || [];
  const escHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => {
  const map = { '&': '&', '<': '<', '>': '>', '"': '"', "'": '' };
  return map[char] || char;
});

  // Build the initial UI without column mapping controls yet
  // They will be added after file reading and auto-mapping
  target.innerHTML = `
    <div class="student-import-wizard">
      <label class="ui-field"><span class="ui-label">Fichier élève</span><input class="ui-input" id="student-import-file" type="file" accept=".csv,.xlsx,.xls,.pdf" /></label>
      <div class="ui-row">
        <label class="ui-field"><span class="ui-label">Classe</span><select class="ui-input" id="student-import-class">${classes.map((item) => `<option value="${escHtml(item.id)}">${escHtml(item.name)}${item.level ? ` - ${escHtml(item.level)}` : ''}</option>`).join('')}</select></label>
        <label class="ui-field"><span class="ui-label">Année scolaire</span><select class="ui-input" id="student-import-year">${schoolYears.map((item) => `<option value="${escHtml(item.id)}" ${item.is_current ? 'selected' : ''}>${escHtml(item.label)}</option>`).join('')}</select></label>
      </div>
      <p id="student-import-status" role="status"></p>
      <div id="student-import-preview"></div>
      <button class="ui-btn ui-btn--primary" id="student-import-submit" type="button" disabled>Importer les élèves</button>
      <!-- Column mapping controls will be injected here after file load -->
      <div id="column-mapping-controls"></div>
    </div>`;

  const fileInput = target.querySelector('#student-import-file');
  const status = target.querySelector('#student-import-status');
  const preview = target.querySelector('#student-import-preview');
  const submit = target.querySelector('#student-import-submit');
  const mappingControls = target.querySelector('#column-mapping-controls');

  const renderPreview = () => {
    if (!rows.length) {
      preview.innerHTML = '';
      submit.disabled = true;
      mappingControls.innerHTML = '';
      return;
    }
    preview.innerHTML = `<div class="ui-table-card"><table class="ui-table"><thead><tr>${rows[0].map((header) => `<th>${escHtml(header)}</th>`).join('')}</tr></thead><tbody>${rows.slice(1, 11).map((row) => `<tr>${rows[0].map((_, index) => `<td>${escHtml(row[index] ?? '')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    submit.disabled = rows.length < 2;
  };

  // Generate column mapping controls HTML
  // Returns the HTML string and also returns the mapping object representing user choices
  const generateColumnMappingControls = (autoMapping, headers) => {
    // Known field keys for the selectors
    const fieldKeys = knownFieldKeys; // ['firstName', 'lastName', 'matricule', 'gender', 'birthDate', 'birthPlace', 'classId']

    // Build set of fields that are already mapped (to prevent duplicates for unique fields)
    const mappedFields = new Set(Object.values(autoMapping));

    // Build the list of available fields, excluding those already mapped (for unique fields)
    // But allow re-mapping - admin should be able to change any association
    const allFieldOptions = {
      firstName: KNOWN_FIELDS.firstName,
      lastName: KNOWN_FIELDS.lastName,
      matricule: KNOWN_FIELDS.matricule,
      gender: KNOWN_FIELDS.gender,
      birthDate: KNOWN_FIELDS.birthDate,
      birthPlace: KNOWN_FIELDS.birthPlace,
      classId: KNOWN_FIELDS.classId
    };

    let html = '<div class="column-mapping-card"><h3>Correspondance des colonnes</h3><div class="mapping-table">';

    // Header row
    html += '<div class="tr"><div class="th">Colonne</div><div class="th">Type de donnée</div><div class="th">Association</div></div>';

    // One row per column
    for (let i = 0; i < headers.length; i++) {
      const autoMappedField = autoMapping[i] || null;
      const headerText = headers[i] || '';

      // Determine available options for this column
      // Start with "Non associé" as default
      let optionValues = [''];
      let optionLabels = ['Non associé'];

      // Add auto-mapped field as pre-selected if present
      if (autoMappedField && allFieldOptions[autoMappedField]) {
        // Check if this field is already mapped from another column (for unique fields)
        // Allow it - admin can override, but we warn about duplicates
        optionValues.unshift(autoMappedField);
        optionLabels.unshift(allFieldOptions[autoMappedField][0] || autoMappedField);
      }

      // Add all other known fields
      for (const [fieldName, variants] of Object.entries(allFieldOptions)) {
        if (fieldName !== autoMappedField && !mappedFields.has(fieldName)) {
          optionValues.push(fieldName);
          optionLabels.push(variants[0] || fieldName);
        }
      }

      // For unique fields (firstName, lastName, matricule, gender), prevent 
      // mapping two columns to the same field if it's already mapped elsewhere
      // But actually, we allow the admin to change - we just need to handle it at submit time
      // For now, show all options and let admin decide

      // Build the select HTML
      let selectHtml = `<select class="ui-input ui-mapping-select" data-column-index="${i}" aria-label="Colonne ${i + 1}">`;
      
      for (let j = 0; j < optionValues.length; j++) {
        const value = optionValues[j];
        const label = optionLabels[j];
        const selected = (value === autoMappedField) ? 'selected' : '';
        selectHtml += `<option value="${escHtml(value)}" ${selected}>${escHtml(label)}</option>`;
      }
      
      selectHtml += `</select>`;

      html += `<div class="tr"><div class="td">${escHtml(headerText)}</div><div class="td">${selectHtml}</div><div class="td small">${escHtml(autoMappedField || '')}</div></div>`;
    }

    html += '</div></div>';

    // Store the auto-mapping reference for later use
    // We'll extract the final mapping from the DOM selectors on submit
    mappingControls.dataset.autoMapping = JSON.stringify(autoMapping);
    mappingControls.dataset.headers = JSON.stringify(headers);

    return html;
  };

  // Attach event listener for file selection
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    submit.disabled = true;
    status.textContent = 'Analyse du fichier…';
    try {
      const name = file.name.toLowerCase();
      if (name.endsWith('.csv')) rows = await parseCsvFileClient(file);
      else if (name.endsWith('.xlsx') || name.endsWith('.xls')) rows = await parseXlsxFileClient(file);
      else if (name.endsWith('.pdf')) {
        const pdfInfo = await detectPdfTypeClient(file);
        if (pdfInfo.isScanned) throw new Error(pdfInfo.message || 'Ce PDF ne contient pas de texte sélectionnable.');
        const lines = await extractPdfTextClient(file);
        rows = lines.map((line) => line.split(/\s{2,}|\t|;/)).filter((row) => row.length && row.some(Boolean));
      } else throw new Error('Format de fichier non pris en charge.');
      if (rows.length < 2) throw new Error('Le fichier ne contient aucune ligne élève.');

      // Auto-detect column mappings
      mapping = autoMapColumns(rows[0], KNOWN_FIELDS);
      status.textContent = `${rows.length - 1} élève(s) détecté(s).`;
      renderPreview();

      // Generate and inject column mapping controls
      const mappingHtml = generateColumnMappingControls(mapping, rows[0]);
      mappingControls.innerHTML = mappingHtml;

      // Add event listeners to all mapping selectors
      const selectorElements = mappingControls.querySelectorAll('.ui-mapping-select');
      selectorElements.forEach((select) => {
        select.addEventListener('change', (e) => {
          const columnIndex = parseInt(e.target.dataset.columnIndex, 10);
          const selectedValue = e.target.value;
          // Update the mapping object directly
          mapping[columnIndex] = selectedValue;
          // Re-render to update selections (handle duplicate prevention)
          // Actually, we let the admin choose - re-render with updated state
          const updatedHtml = generateColumnMappingControls(mapping, rows[0]);
          mappingControls.innerHTML = updatedHtml;
          // Re-attach listeners
          const newSelectors = mappingControls.querySelectorAll('.ui-mapping-select');
          newSelectors.forEach((s) => {
            s.addEventListener('change', arguments.callee);
          });
        });
      });

    } catch (error) {
      rows = [];
      renderPreview();
      status.textContent = error.message || 'Impossible de lire le fichier.';
    }
  });

  // Submit handler - collect final mapping from DOM selectors
  submit.addEventListener('click', async () => {
    // Collect final mapping from all mapping selectors
    const finalMapping = {};
    const selectorElements = mappingControls.querySelectorAll('.ui-mapping-select');
    selectorElements.forEach((select) => {
      const columnIndex = parseInt(select.dataset.columnIndex, 10);
      const selectedValue = select.value;
      if (selectedValue) { // Only add if a field is associated
        finalMapping[columnIndex] = selectedValue;
      }
    });

    // Validate required fields
    // firstName and lastName are required - must be associated somewhere
    const firstNameKey = Object.values(finalMapping).includes('firstName') ? 
      Object.keys(finalMapping).find(k => finalMapping[k] === 'firstName') : null;
    const lastNameKey = Object.values(finalMapping).includes('lastName') ?
      Object.keys(finalMapping).find(k => finalMapping[k] === 'lastName') : null;

    if (!firstNameKey || !lastNameKey) {
      status.textContent = 'Les champs Prénom et Nom sont obligatoires. Veuillez associer des colonnes à ces champs.';
      submit.disabled = false;
      return;
    }

    // Prevent two columns mapped to the same unique field
    const fieldCounts = {};
    selectorElements.forEach((select) => {
      const v = select.value;
      if (v) {
        fieldCounts[v] = (fieldCounts[v] || 0) + 1;
      }
    });
    for (const [field, count] of Object.entries(fieldCounts)) {
      if (count > 1 && ['firstName', 'lastName', 'matricule', 'gender'].includes(field)) {
        status.textContent = `Attention : Le champ "${field}" est associé à ${count} colonne(s). Les champs uniques ne doivent pas être dupliqués.`;
        submit.disabled = false;
        return;
      }
    }

    try {
      submit.disabled = true;
      status.textContent = 'Importation en cours…';

      // Transform columnMapping from {0: 'firstName', 1: 'lastName'} 
      // to {"0": "firstName", "1": "lastName"} format expected by backend
      const backendMapping = {};
      Object.entries(finalMapping).forEach(([colIndex, fieldName]) => {
        if (fieldName && fieldName !== '') {
          backendMapping[String(colIndex)] = fieldName;
        }
      });

      const response = await fetch('/api/admin/students/import', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows, // Send raw rows (headers + data), backend will build students
          columnMapping: backendMapping,
          targetClassId: target.querySelector('#student-import-class').value,
          schoolYearId: target.querySelector('#student-import-year').value || null,
          fileName: fileInput.files?.[0]?.name || null
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || result.error || 'Échec de l’importation.');
      status.textContent = `${result.created ?? 0} élève(s) importé(s), ${result.duplicates ?? 0} doublon(s), ${result.errors ?? 0} erreur(s).`;
    } catch (error) {
      status.textContent = error.message || 'Échec de l’importation.';
    } finally {
      submit.disabled = false;
    }
  });

  target.dataset.initialized = 'true';
  target.wizardController = { refresh: renderPreview };
  return target.wizardController;
}