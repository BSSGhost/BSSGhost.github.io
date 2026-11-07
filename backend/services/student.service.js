/*
  STUDENT SERVICE — SUNU MOYENNE Administration
  Couche de service pour la gestion des élèves :
  - Création simple
  - Import groupé
  - Recherche de doublons
*/

import mysql from 'mysql2/promise';
import { hashCode } from '../server.js';

// Protection contre les payloads trop volumineux
const MAX_IMPORT_ROWS = 5000;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10Mo

/**
 * Vérifier si un élève existe déjà (doublon)
 * @param {object} db - Pool MySQL connection
 * @param {string} matricule - Matricule de l'élève
 * @param {string} externalId - External ID optionnel
 * @returns {Promise<object>} - { exists: boolean, studentId: number | null }
 */
export async function checkStudentExists(db, matricule, externalId = null) {
  try {
    let query = 'SELECT id FROM students WHERE matricule = ? AND is_active = TRUE';
    const params = [matricule];

    if (externalId) {
      query += ' OR external_id = ?';
      params.push(externalId);
    }

    const [rows] = await db.execute(query, params);

    if (rows.length > 0) {
      return { exists: true, studentId: rows[0].id };
    }

    return { exists: false, studentId: null };
  } catch (error) {
    console.error('Erreur vérification doublon élève:', error);
    throw error;
  }
}

/**
 * Parser un fichier Excel (.xlsx ou .xls) extrait en texte
 * @param {File} file - Fichier Excel
 * @returns {Promise<Array<Array<string>>>} - Lignes et colonnes du fichier
 * @throws {Error} Si le format n'est pas supporté ou en lecture
 */
export async function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('Aucun fichier fourni'));
      return;
    }

    const name = file.name.toLowerCase();

    if (name.endsWith('.xlsx')) {
      // Lecture XLSX via la méthode existante dans prof.js
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

          // Simplified XLSX parsing - read shared strings and sheet1
          // This is a minimal parser - in production would use a proper library
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

                const idx = ref ? ref.replace(/[0-9]/g, '').charCodeAt(0) - 65 : 0;
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
          reject(error);
        }
      };
      reader.onerror = (e) => reject(e.error);
      reader.readAsArrayBuffer(file);
    } else if (name.endsWith('.xls')) {
      // Pour les fichiers .xls, on essaie de les convertir ou de renvoyer une erreur informative
      // Dans un premier temps, on demande de convertir en .xlsx
      reject(new Error('Format .xls non supporté directement. Veuillez convertir le fichier au format .xlsx.'));
    } else {
      reject(new Error('Format de fichier Excel non reconnu'));
    }
  });
}

/**
 * Parser un fichier CSV
 * @param {File} file - Fichier CSV
 * @returns {Promise<Array<Array<string>>>} - Lignes et colonnes du fichier
 */
export function parseCsvFile(file) {
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

          // Simple CSV parsing - handle quoted fields
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

/**
 * Extraire le texte d'un PDF (texte sélectionnable)
 * Utilise pdf.js côté client
 * @param {File} file - Fichier PDF
 * @returns {Promise<Array<string>>} - Lignes de texte extraites
 * @throws {Error} Si l'extraction échoue ou PDF scanné
 */
export async function extractPdfText(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('Aucun fichier fourni'));
      return;
    }

    // Vérifier si pdf.js est disponible dans la fenêtre
    if (typeof window.extractPdfText === 'function') {
      window.extractPdfText(file).then(resolve).catch(reject);
      return;
    }

    // Sinon, essayer avec la méthode pdfjs
    if (typeof window.pdfjsLib === 'undefined') {
      reject(new Error('pdf.js n\'est pas chargé. Veuillez utiliser un fichier PDF avec du texte sélectionnable ou convertir en Excel.'));
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

        // Trier par Y descendant d'abord, puis X
        const sortedItems = items.sort((a, b) => b.y - a.y || a.x - b.x);

        for (const it of sortedItems) {
          if (currentY !== null && Math.abs(it.y - currentY) > 3) {
            // Nouvelle ligne
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

/**
 * Détecter si un PDF est scanné (basé sur les images) ou texte sélectionnable
 * @param {File} file - Fichier PDF
 * @returns {Promise<{isScanned: boolean, message: string}>}
 */
export async function detectPdfType(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const arrayBuffer = e.target.result;
      const uint8 = new Uint8Array(arrayBuffer);

      // Vérifier les entêtes PDF
      if (uint8[0] === 0x25 && uint8[1] === 0x50 && uint8[2] === 0x44 && uint8[3] === 0x46) {
        // C'est un fichier PDF valide
        // Essayer d'extraire un peu de texte pour voir s'il y a du texte sélectionnable
        if (typeof window.pdfjsLib !== 'undefined') {
          // Tentative d'extraction rapide
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
          resolve({ isScanned: true, message: 'Impossible de déterminer le type PDF sans pdf.js.' });
        }
      } else {
        resolve({ isScanned: true, message: 'Format de fichier non reconnu.' });
      }
    };

    reader.onerror = () => resolve({ isScanned: true, message: 'Erreur de lecture du fichier.' });
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Normaliser une valeur de champ pour la comparaison
 * @param {string} value - Valeur brute
 * @returns {string} - Valeur normalisée
 */
export function normalizeField(value) {
  if (value == null || value === undefined) return '';
  return String(value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Construire un élève à partir d'une ligne de fichier
 * @param {Array<string>} row - Ligne du fichier (colonnes)
 * @param {Object} columnMapping - Correspondance colonne → champ
 * @returns {Object} - Données de l'élève normalisées
 */
export function buildStudentFromRow(row, columnMapping) {
  const getColumn = (colIndex) => {
    if (colIndex === undefined || colIndex === null) return '';
    if (colIndex >= row.length) return '';
    return row[colIndex];
  };

  const firstName = normalizeField(getColumn(columnMapping.firstName));
  const lastName = normalizeField(getColumn(columnMapping.lastName));
  const matricule = normalizeField(getColumn(columnMapping.matricule));
  const gender = getColumn(columnMapping.gender);
  const birthDate = getColumn(columnMapping.birthDate);
  const birthPlace = getColumn(columnMapping.birthPlace);
  const classId = getColumn(columnMapping.classId);

  // Validation basique : prénom et nom requis
  if (!firstName || !lastName) {
    return null;
  }

  return {
    firstName,
    lastName,
    matricule: matricule || undefined,
    gender: gender || 'UNSPECIFIED',
    birthDate: birthDate || null,
    birthPlace: birthPlace || null,
    classId: classId || null,
  };
}

/**
 * Définir la correspondance automatique entre les colonnes du fichier
 * et les champs de SUNU MOYENNE en se basant sur les en-têtes.
 * @param {Array<Array<string>>> rows - Toutes les lignes du fichier (première ligne = en-têtes)
 * @param {Object} knownFields - Champs connus de SUNU MOYENNE
 * @returns {Object} - Mapping colonne → champ
 */
export function autoMapColumns(rows, knownFields) {
  if (!rows || rows.length === 0) return {};

  const headers = rows[0];
  const mapping = {};

  // Essayer de correspondre chaque en-tête à un champ connu
  for (let i = 0; i < headers.length; i++) {
    const header = normalizeField(headers[i]);

    // Essayer une correspondance directe
    let foundField = null;

    for (const [fieldName, fieldVariants] of Object.entries(knownFields)) {
      if (fieldVariants.includes(header)) {
        foundField = fieldName;
        break;
      }
    }

    // Si pas de correspondance directe, essayer une correspondance partielle
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

/**
 * Obtenir les options de classe disponibles pour l'import
 * @param {object} db - Pool MySQL
 * @returns {Promise<Array>} - Liste des classes actives avec leurs infos
 */
export async function getAvailableClasses(db) {
  const [rows] = await db.execute(`
    SELECT c.id, c.name, c.level, y.label AS school_year
    FROM classes c
    JOIN school_years y ON y.id = c.school_year_id
    WHERE c.is_active = TRUE
    ORDER BY y.label DESC, c.name
  `);
  return rows || [];
}

/**
 * Obtenir les années scolaires actives
 * @param {object} db - Pool MySQL
 * @returns {Promise<Array>} - Liste des années scolaires
 */
export async function getSchoolYears(db) {
  const [rows] = await db.execute(`
    SELECT id, label, starts_on, ends_on, is_current, is_active
    FROM school_years
    WHERE is_active = TRUE
    ORDER BY label DESC
  `);
  return rows || [];
}

/**
 * Traiter une ligne individuelle pendant l'import
 * Vérifie les doublons, valide les données, retourne le statut
 * @param {object} db - Pool MySQL connection
 * @param {object} studentData - Données de l'élève à créer
 * @param {Array} existingClasses - Classes existantes pour validation
 * @returns {Promise<{status: string, student: object}|null}> - Statut et étudiant ou null
 */
export async function processImportRow(db, studentData, existingClasses) {
  try {
    // Vérifier si l'élève existe déjà (par matricule)
    let existsCheck = { exists: false };

    if (studentData.matricule) {
      existsCheck = await checkStudentExists(db, studentData.matricule);
    }

    if (existsCheck.exists) {
      return {
        status: 'duplicate',
        reason: 'déjà_inscrit',
        matricule: studentData.matricule,
      };
    }

    // Valider que la classe existe si fournie
    if (studentData.classId) {
      const classExists = existingClasses.some((c) => String(c.id) === String(studentData.classId));
      if (!classExists) {
        return {
          status: 'error',
          reason: 'classe_inconnue',
          classId: studentData.classId,
          message: `Classe ID ${studentData.classId} introuvable`,
        };
      }
    }

    // L'élève peut être créé
    return {
      status: 'valid',
      student: {
        matricule: studentData.matricule || `auto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        first_name: studentData.firstName,
        last_name: studentData.lastName,
        gender: studentData.gender,
        birth_date: studentData.birthDate,
        guardian_name: null,
        guardian_phone: null,
        is_active: true,
      },
    };
  } catch (error) {
    console.error('Erreur traitement ligne import:', error);
    return {
      status: 'error',
      reason: 'traitement_erreur',
      message: error.message,
    };
  }
}