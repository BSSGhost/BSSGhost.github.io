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

    if (foundField) {
      mapping[i] = foundField;
    }
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

  const firstName = normalizeField(getColumn(
    Object.keys(mapping).find(k => mapping[k] === 'firstName') || 0
  ));
  const lastName = normalizeField(getColumn(
    Object.keys(mapping).find(k => mapping[k] === 'lastName') || 0
  ));
  const matricule = normalizeField(getColumn(
    Object.keys(mapping).find(k => mapping[k] === 'matricule') || 0
  ));
  const gender = getColumn(Object.keys(mapping).find(k => mapping[k] === 'gender')) || 'UNSPECIFIED';
  const birthDate = getColumn(Object.keys(mapping).find(k => mapping[k] === 'birthDate')) || null;
  const birthPlace = getColumn(Object.keys(mapping).find(k => mapping[k] === 'birthPlace')) || null;

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
          entries[entryName] = { method, compSize, dataStart };
          pos = entryDataStart + compSize;
        }

        // Read shared strings
        let sharedStrings = [];
        if ('xl/sharedStrings.xml' in entries) {
          const ssData = data.slice(entries['xl/sharedStrings.xml'].dataStart, entries['xl/sharedStrings.xml'].dataStart + entries['xl/sharedStrings.xml'].compSize);
          const ssText = new TextDecoder('utf-8').decode(ssData);
          const parser = new DOMParser();
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
          const sheetData = data.slice(entries['xl/worksheets/sheet1.xml'].dataStart, entries['xl/worksheets/sheet1.xml'].dataStart + entries['xl/worksheets/sheet1.xml'].compSize);
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