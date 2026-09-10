/* =========================================================
   OCR SEMI-AUTOMATIQUE — MODE PROFESSEUR
   Extrait les noms/prénoms et notes d'une photo de relevé
   via Tesseract.js (client-side, pas de serveur).
   L'utilisateur DOIT vérifier et corriger avant application.
   ========================================================= */
(function () {
  'use strict';

  /* ---------- Configuration ---------- */

  const TESSERACT_SCRIPT = './vendor/tesseract/tesseract.min.js';
  const TESSERACT_WORKER = './vendor/tesseract/worker.min.js';
  const TESSERACT_CORE = './vendor/tesseract';
  const TESSERACT_LANG_PATH = './vendor/tesseract';
  const CONFIDENCE_THRESHOLD = 0.60;
  const NOTE_PATTERN = /^(\d{1,2})[.,]?(\d{1,2})?$/;
  const MAX_NOTE = 20;
  const OCR_TIMEOUT_MS = 60000;

  /* ---------- Références DOM ---------- */

  const $ = (id) => document.getElementById(id);

  const els = {
    fileInput: $('prof-file-input'),
    dropzone: $('prof-dropzone'),
    filePreview: $('prof-file-preview'),
    fileImg: $('prof-file-img'),
    fileName: $('prof-file-name'),
    fileRemove: $('prof-file-remove'),
    tbody: $('prof-tbody'),
    empty: $('prof-empty'),
    thComposition: $('prof-th-composition'),
    imgTools: $('prof-img-tools'),
    imgRotL: $('prof-img-rot-l'),
    imgRotR: $('prof-img-rot-r'),
    imgCrop: $('prof-img-crop'),
    imgEnhance: $('prof-img-enhance')
  };

  /* ---------- État ---------- */

  let tesseractLoaded = false;
  let tesseractWorker = null;
  let scanInProgress = false;
  let lastScannedFile = null;
  let ocrModalEl = null;
  let scanBtnEl = null;

  /* ---------- État de prétraitement d'image ---------- */

  let imgRotationDeg = 0;
  let imgCropRect = null; /* {x, y, w, h} en pixels du canvas "rotation appliquée" */
  let imgEnhanceEnabled = true;
  let imgSourceCanvas = null; /* canvas de l'image originale (dimensions natives) */
  let currentPdfBlob = null; /* pour PDF : blob converti en image */

  /* ---------- Utilitaires ---------- */

  function t(key, vars) {
    if (typeof window.t === 'function') return window.t(key, vars);
    return key;
  }

  function hasComposition() {
    return document.querySelector('input[name="prof-composition"]:checked')?.value === 'oui';
  }

  /* ---------- Chargement lazy de Tesseract.js ---------- */

  function loadTesseractScript() {
    return new Promise((resolve, reject) => {
      if (tesseractLoaded) return resolve();
      const script = document.createElement('script');
      script.src = TESSERACT_SCRIPT;
      script.onload = () => {
        tesseractLoaded = true;
        resolve();
      };
      script.onerror = () => reject(new Error('Impossible de charger Tesseract.js'));
      document.head.appendChild(script);
    });
  }

  /* ---------- Prétraitement image : pipeline (rotation, recadrage, amélioration) ---------- */

  function loadCanvasFromBlob(blob) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 2000;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          const ratio = Math.min(maxDim / w, maxDim / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(canvas);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Image invalide'));
      };
      img.src = url;
    });
  }

  function rotatedCanvas(canvas) {
    const deg = ((imgRotationDeg % 360) + 360) % 360;
    if (!deg) return canvas;
    const swap = deg % 180 !== 0;
    const out = document.createElement('canvas');
    out.width = swap ? canvas.height : canvas.width;
    out.height = swap ? canvas.width : canvas.height;
    const ctx = out.getContext('2d');
    ctx.translate(out.width / 2, out.height / 2);
    ctx.rotate((deg * Math.PI) / 180);
    ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
    return out;
  }

  function croppedCanvas(canvas) {
    if (!imgCropRect) return canvas;
    const { x, y, w, h } = imgCropRect;
    const rx = Math.max(0, Math.min(canvas.width, Math.round(x)));
    const ry = Math.max(0, Math.min(canvas.height, Math.round(y)));
    const rw = Math.max(1, Math.min(canvas.width - rx, Math.round(w)));
    const rh = Math.max(1, Math.min(canvas.height - ry, Math.round(h)));
    const out = document.createElement('canvas');
    out.width = rw;
    out.height = rh;
    const ctx = out.getContext('2d');
    ctx.drawImage(canvas, rx, ry, rw, rh, 0, 0, rw, rh);
    return out;
  }

  function enhanceCanvas(canvas) {
    if (!imgEnhanceEnabled) return canvas;
    const out = document.createElement('canvas');
    out.width = canvas.width;
    out.height = canvas.height;
    const ctx = out.getContext('2d');
    ctx.drawImage(canvas, 0, 0);
    const imageData = ctx.getImageData(0, 0, out.width, out.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      let gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      gray = ((gray / 255 - 0.5) * 1.6 + 0.5) * 255;
      gray = Math.max(0, Math.min(255, gray));
      const bin = gray > 140 ? 255 : 0;
      data[i] = bin;
      data[i + 1] = bin;
      data[i + 2] = bin;
    }
    ctx.putImageData(imageData, 0, 0);
    return out;
  }

  function pipelineCanvas() {
    if (!imgSourceCanvas) return null;
    let canvas = imgSourceCanvas;
    canvas = rotatedCanvas(canvas);
    canvas = croppedCanvas(canvas);
    canvas = enhanceCanvas(canvas);
    return canvas;
  }

  function pipelineBlob() {
    return new Promise((resolve, reject) => {
      const canvas = pipelineCanvas();
      if (!canvas) return reject(new Error('Aucune image'));
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Échec du prétraitement'));
      }, 'image/png');
    });
  }

  function renderImagePreview() {
    const canvas = pipelineCanvas();
    if (!canvas || !els.fileImg) return;
    els.fileImg.src = canvas.toDataURL('image/png');
    els.fileImg.hidden = false;
    if (els.filePdf) {
      els.filePdf.hidden = true;
      els.filePdf.removeAttribute('src');
    }
    if (els.imgEnhance) {
      els.imgEnhance.classList.toggle('is-on', imgEnhanceEnabled);
    }
  }

  /* ---------- Modal de recadrage ---------- */

  let cropModalEl = null;

  function openCropModal() {
    if (!imgSourceCanvas) return;
    const rotated = rotatedCanvas(imgSourceCanvas);
    const maxW = Math.min(860, window.innerWidth - 48);
    const maxH = Math.min(520, window.innerHeight - 240);
    const scale = Math.min(maxW / rotated.width, maxH / rotated.height, 1);
    const dispW = Math.max(1, Math.round(rotated.width * scale));
    const dispH = Math.max(1, Math.round(rotated.height * scale));

    closeCropModal();

    const modal = document.createElement('div');
    modal.className = 'prof-crop-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = `
      <div class="prof-crop-overlay"></div>
      <div class="prof-crop-card">
        <div class="prof-crop-header">
          <h3>${t('prof_crop_title')}</h3>
          <p class="prof-crop-hint">${t('prof_crop_hint')}</p>
        </div>
        <div class="prof-crop-stage" style="width:${dispW}px;height:${dispH}px">
          <canvas width="${dispW}" height="${dispH}"></canvas>
          <div class="prof-crop-rect" hidden></div>
        </div>
        <div class="prof-crop-actions">
          <button type="button" class="ghost-button" data-act="reset">${t('prof_crop_reset')}</button>
          <div class="prof-crop-actions-right">
            <button type="button" class="ghost-button" data-act="cancel">${t('prof_crop_cancel')}</button>
            <button type="button" class="primary-button" data-act="apply" disabled>${t('prof_crop_apply')}</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    cropModalEl = modal;
    document.body.style.overflow = 'hidden';

    const cv = modal.querySelector('canvas');
    const cctx = cv.getContext('2d');
    cctx.drawImage(rotated, 0, 0, dispW, dispH);

    const rectEl = modal.querySelector('.prof-crop-rect');
    const applyBtn = modal.querySelector('[data-act="apply"]');
    let dragStart = null;
    let dragCurrent = null;

    const toSourceRect = () => {
      if (!dragStart || !dragCurrent) return null;
      const x = Math.min(dragStart.x, dragCurrent.x) / scale;
      const y = Math.min(dragStart.y, dragCurrent.y) / scale;
      const w = Math.abs(dragCurrent.x - dragStart.x) / scale;
      const h = Math.abs(dragCurrent.y - dragStart.y) / scale;
      if (w < 4 / scale || h < 4 / scale) return null;
      return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
    };

    const updateRectEl = () => {
      if (!dragStart || !dragCurrent) {
        rectEl.hidden = true;
        return;
      }
      const x = Math.min(dragStart.x, dragCurrent.x);
      const y = Math.min(dragStart.y, dragCurrent.y);
      const w = Math.abs(dragCurrent.x - dragStart.x);
      const h = Math.abs(dragCurrent.y - dragStart.y);
      rectEl.hidden = false;
      rectEl.style.left = x + 'px';
      rectEl.style.top = y + 'px';
      rectEl.style.width = w + 'px';
      rectEl.style.height = h + 'px';
      const rect = toSourceRect();
      applyBtn.disabled = !rect;
    };

    const posFromEvent = (e) => {
      const rect = cv.getBoundingClientRect();
      return {
        x: Math.max(0, Math.min(dispW, e.clientX - rect.left)),
        y: Math.max(0, Math.min(dispH, e.clientY - rect.top))
      };
    };

    cv.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      cv.setPointerCapture && cv.setPointerCapture(e.pointerId);
      dragStart = posFromEvent(e);
      dragCurrent = posFromEvent(e);
      updateRectEl();
    });

    cv.addEventListener('pointermove', (e) => {
      if (!dragStart) return;
      e.preventDefault();
      dragCurrent = posFromEvent(e);
      updateRectEl();
    });

    const stopDrag = (e) => {
      if (!dragStart) return;
      dragCurrent = posFromEvent(e);
      updateRectEl();
      dragStart = null;
      dragCurrent = null;
    };

    cv.addEventListener('pointerup', stopDrag);
    cv.addEventListener('pointercancel', stopDrag);

    modal.querySelector('[data-act="apply"]').addEventListener('click', () => {
      const rect = toSourceRect();
      if (!rect) return;
      imgCropRect = rect;
      closeCropModal();
      renderImagePreview();
    });

    modal.querySelector('[data-act="reset"]').addEventListener('click', () => {
      imgCropRect = null;
      renderImagePreview();
    });

    modal.querySelector('[data-act="cancel"]').addEventListener('click', closeCropModal);
    modal.querySelector('.prof-crop-overlay').addEventListener('click', closeCropModal);
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeCropModal();
    });
  }

  function closeCropModal() {
    if (cropModalEl) {
      cropModalEl.remove();
      cropModalEl = null;
      document.body.style.overflow = '';
    }
  }

  /* ---------- OCR via Tesseract.js ---------- */

  async function runOCR(file, onProgress) {
    await loadTesseractScript();

    if (!tesseractWorker) {
      tesseractWorker = await Tesseract.createWorker('fra+eng', 1, {
        workerPath: TESSERACT_WORKER,
        corePath: TESSERACT_CORE,
        langPath: TESSERACT_LANG_PATH,
        logger: (m) => {
          if (m.status === 'recognizing text' && onProgress) {
            onProgress(Math.round((m.progress || 0) * 100));
          }
        }
      });
    }

    const processedBlob = await pipelineBlob();
    const result = await tesseractWorker.recognize(processedBlob);
    return result.data;
  }

  /* ---------- Parsing des résultats OCR ---------- */

  function parseOCRWords(ocrData) {
    if (!ocrData || !ocrData.words || !ocrData.words.length) return [];

    const words = ocrData.words.filter((w) => w.text && w.text.trim());
    if (!words.length) return [];

    const lineThreshold = 12;
    const sortedWords = [...words].sort((a, b) => {
      const dy = a.bbox.y0 - b.bbox.y0;
      if (Math.abs(dy) > lineThreshold) return dy;
      return a.bbox.x0 - b.bbox.x0;
    });

    const lines = [];
    let currentLine = [];
    let currentY = null;

    sortedWords.forEach((word) => {
      const wordY = (word.bbox.y0 + word.bbox.y1) / 2;
      if (currentY === null || Math.abs(wordY - currentY) <= lineThreshold) {
        currentLine.push(word);
        currentY = currentY === null ? wordY : (currentY + wordY) / 2;
      } else {
        if (currentLine.length) lines.push(currentLine);
        currentLine = [word];
        currentY = wordY;
      }
    });
    if (currentLine.length) lines.push(currentLine);

    const results = [];
    lines.forEach((lineWords) => {
      const sorted = [...lineWords].sort((a, b) => a.bbox.x0 - b.bbox.x0);
      const texts = sorted.map((w) => ({
        text: w.text.trim(),
        conf: w.confidence / 100,
        x: (w.bbox.x0 + w.bbox.x1) / 2,
        isNote: false
      }));

      const noteValues = [];
      const nameValues = [];

      texts.forEach((item) => {
        const cleaned = item.text.replace(/\s/g, '');
        const normalized = cleaned.replace(',', '.');
        if (NOTE_PATTERN.test(normalized)) {
          const val = parseFloat(normalized);
          if (val >= 0 && val <= MAX_NOTE) {
            item.isNote = true;
            item.numericValue = val;
            noteValues.push(item);
          } else {
            nameValues.push(item);
          }
        } else if (/^\d+$/.test(cleaned) && parseInt(cleaned, 10) <= MAX_NOTE) {
          item.isNote = true;
          item.numericValue = parseInt(cleaned, 10);
          noteValues.push(item);
        } else {
          nameValues.push(item);
        }
      });

      if (nameValues.length >= 1 && noteValues.length >= 2) {
        let nom = '';
        let prenom = '';
        if (nameValues.length >= 2) {
          nom = nameValues[0].text;
          prenom = nameValues[1].text;
        } else {
          nom = nameValues[0].text;
        }
        const avgConf = noteValues.reduce((s, n) => s + n.conf, 0) / noteValues.length;
        const nameConf = nameValues.reduce((s, n) => s + n.conf, 0) / nameValues.length;

        const row = {
          nom: nom,
          prenom: prenom,
          d1: noteValues.length >= 1 ? formatNote(noteValues[0].numericValue) : '',
          d2: noteValues.length >= 2 ? formatNote(noteValues[1].numericValue) : '',
          compo: noteValues.length >= 3 ? formatNote(noteValues[2].numericValue) : '',
          confidence: Math.min(avgConf, nameConf),
          _raw: texts.map((t) => t.text).join(' | ')
        };
        results.push(row);
      }
    });

    return results;
  }

  function formatNote(value) {
    if (value === null || value === undefined) return '';
    const str = String(value).replace('.', ',');
    return str;
  }

  /* ---------- Parsing alternatif : texte brut ---------- */

  function parseOCRTextFallback(rawText) {
    if (!rawText || !rawText.trim()) return [];

    const lines = rawText.split('\n').filter((l) => l.trim());
    const results = [];

    lines.forEach((line) => {
      const parts = line.split(/[\t;|]+/).map((s) => s.trim()).filter(Boolean);
      if (parts.length < 3) return;

      const noteCandidates = [];
      const nameCandidates = [];

      parts.forEach((part) => {
        const cleaned = part.replace(/\s/g, '').replace(',', '.');
        if (NOTE_PATTERN.test(cleaned)) {
          const val = parseFloat(cleaned);
          if (val >= 0 && val <= MAX_NOTE) {
            noteCandidates.push({ text: part, numericValue: val, conf: 0.5 });
          } else {
            nameCandidates.push({ text: part, conf: 0.5 });
          }
        } else if (/^\d+$/.test(cleaned) && parseInt(cleaned, 10) <= MAX_NOTE) {
          noteCandidates.push({ text: part, numericValue: parseInt(cleaned, 10), conf: 0.5 });
        } else {
          nameCandidates.push({ text: part, conf: 0.5 });
        }
      });

      if (nameCandidates.length >= 1 && noteCandidates.length >= 2) {
        results.push({
          nom: nameCandidates[0]?.text || '',
          prenom: nameCandidates[1]?.text || '',
          d1: noteCandidates.length >= 1 ? formatNote(noteCandidates[0].numericValue) : '',
          d2: noteCandidates.length >= 2 ? formatNote(noteCandidates[1].numericValue) : '',
          compo: noteCandidates.length >= 3 ? formatNote(noteCandidates[2].numericValue) : '',
          confidence: 0.4,
          _raw: parts.join(' | ')
        });
      }
    });

    return results;
  }

  /* ---------- UI : Modal de vérification ---------- */

  function createOCRModal() {
    if (ocrModalEl) return ocrModalEl;

    const modal = document.createElement('div');
    modal.id = 'prof-ocr-modal';
    modal.className = 'prof-ocr-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = `
      <div class="prof-ocr-overlay"></div>
      <div class="prof-ocr-modal-card">
        <div class="prof-ocr-header">
          <h3 data-i18n="prof_ocr_verify_title">${t('prof_ocr_verify_title')}</h3>
          <p class="prof-ocr-subtitle" data-i18n="prof_ocr_verify_subtitle">${t('prof_ocr_verify_subtitle')}</p>
        </div>
        <div class="prof-ocr-table-wrap">
          <table class="prof-ocr-table">
            <thead>
              <tr>
                <th>#</th>
                <th data-i18n="label_nom">${t('label_nom')}</th>
                <th data-i18n="label_prenom">${t('label_prenom')}</th>
                <th data-i18n="label_devoir1">${t('label_devoir1')}</th>
                <th data-i18n="label_devoir2">${t('label_devoir2')}</th>
                <th class="prof-ocr-th-compo" data-i18n="label_composition">${t('label_composition')}</th>
                <th data-i18n="prof_ocr_confidence">${t('prof_ocr_confidence')}</th>
                <th class="prof-ocr-th-del">&nbsp;</th>
              </tr>
            </thead>
            <tbody id="prof-ocr-tbody"></tbody>
          </table>
        </div>
        <div class="prof-ocr-empty" id="prof-ocr-empty" hidden>
          <p data-i18n="prof_ocr_no_data">${t('prof_ocr_no_data')}</p>
        </div>
        <div class="prof-ocr-actions">
          <button type="button" id="prof-ocr-add-row" class="secondary-button prof-ocr-add-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" width="15" height="15" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            <span data-i18n="prof_ocr_add_row">${t('prof_ocr_add_row')}</span>
          </button>
          <div class="prof-ocr-actions-right">
            <button type="button" id="prof-ocr-cancel" class="ghost-button" data-i18n="prof_ocr_cancel">${t('prof_ocr_cancel')}</button>
            <button type="button" id="prof-ocr-apply" class="primary-button" data-i18n="prof_ocr_apply">${t('prof_ocr_apply')}</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    ocrModalEl = modal;

    modal.querySelector('.prof-ocr-overlay').addEventListener('click', hideVerificationModal);
    modal.querySelector('#prof-ocr-cancel').addEventListener('click', hideVerificationModal);
    modal.querySelector('#prof-ocr-apply').addEventListener('click', onApplyOCR);
    modal.querySelector('#prof-ocr-add-row').addEventListener('click', onAddOCRRow);

    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') hideVerificationModal();
    });

    return modal;
  }

  let ocrDataRows = [];

  function showVerificationModal(results) {
    ocrDataRows = results.map((r) => ({
      nom: r.nom || '',
      prenom: r.prenom || '',
      d1: r.d1 || '',
      d2: r.d2 || '',
      compo: r.compo || '',
      confidence: r.confidence || 0
    }));

    const modal = createOCRModal();
    updateCompoColumn();
    renderOCRTable();
    modal.hidden = false;
    document.body.style.overflow = 'hidden';

    requestAnimationFrame(() => {
      const firstInput = modal.querySelector('.prof-ocr-table tbody input');
      if (firstInput) firstInput.focus();
    });
  }

  function hideVerificationModal() {
    if (ocrModalEl) {
      ocrModalEl.hidden = true;
      document.body.style.overflow = '';
    }
    ocrDataRows = [];
  }

  function updateCompoColumn() {
    if (!ocrModalEl) return;
    const showCompo = hasComposition();
    ocrModalEl.querySelectorAll('.prof-ocr-th-compo').forEach((th) => {
      th.hidden = !showCompo;
    });
    ocrModalEl.querySelectorAll('.prof-ocr-compo-cell').forEach((td) => {
      td.hidden = !showCompo;
    });
  }

  function renderOCRTable() {
    const modal = createOCRModal();
    const tbody = modal.querySelector('#prof-ocr-tbody');
    const emptyEl = modal.querySelector('#prof-ocr-empty');
    const showCompo = hasComposition();

    tbody.innerHTML = '';
    emptyEl.hidden = ocrDataRows.length > 0;

    ocrDataRows.forEach((row, index) => {
      const tr = document.createElement('tr');
      tr.className = 'prof-ocr-row';

      const rankCell = document.createElement('td');
      rankCell.className = 'prof-ocr-col-rank';
      rankCell.textContent = String(index + 1);

      const nomCell = createOCRTextInput(row, 'nom', t('prof_name_placeholder'), index);
      const prenomCell = createOCRTextInput(row, 'prenom', t('prof_prenom_placeholder'), index);
      const d1Cell = createOCRNoteInput(row, 'd1', index);
      const d2Cell = createOCRNoteInput(row, 'd2', index);
      const compoCell = createOCRNoteInput(row, 'compo', index);
      compoCell.className = 'prof-ocr-compo-cell';
      compoCell.hidden = !showCompo;

      const confCell = document.createElement('td');
      confCell.className = 'prof-ocr-confidence';
      const confBadge = document.createElement('span');
      confBadge.className = 'prof-ocr-conf-badge';
      const conf = row.confidence || 0;
      if (conf >= 0.8) {
        confBadge.classList.add('conf-high');
      } else if (conf >= CONFIDENCE_THRESHOLD) {
        confBadge.classList.add('conf-medium');
      } else {
        confBadge.classList.add('conf-low');
      }
      confBadge.textContent = Math.round(conf * 100) + '%';
      confCell.appendChild(confBadge);

      const delCell = document.createElement('td');
      delCell.className = 'prof-ocr-col-del';
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'prof-ocr-del-btn';
      delBtn.setAttribute('aria-label', t('prof_ocr_remove_row'));
      delBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
      delBtn.addEventListener('click', () => {
        ocrDataRows.splice(index, 1);
        renderOCRTable();
      });
      delCell.appendChild(delBtn);

      tr.append(rankCell, nomCell, prenomCell, d1Cell, d2Cell, compoCell, confCell, delCell);
      tbody.appendChild(tr);
    });
  }

  function createOCRTextInput(row, field, placeholder, rowIndex) {
    const td = document.createElement('td');
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'prof-ocr-input';
    input.value = row[field] || '';
    input.placeholder = placeholder;
    input.addEventListener('input', () => {
      ocrDataRows[rowIndex][field] = input.value;
    });
    td.appendChild(input);
    return td;
  }

  function createOCRNoteInput(row, field, rowIndex) {
    const td = document.createElement('td');
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'prof-ocr-input prof-ocr-note-input';
    input.inputMode = 'decimal';
    input.maxLength = 5;
    input.value = row[field] || '';
    input.addEventListener('input', () => {
      ocrDataRows[rowIndex][field] = input.value;
      validateOCRNoteInput(input);
    });
    validateOCRNoteInput(input);
    td.appendChild(input);
    return td;
  }

  function validateOCRNoteInput(input) {
    const raw = input.value.trim();
    input.classList.remove('is-valid', 'is-invalid');
    if (!raw) return;
    const ok = typeof isValidDecimalNote === 'function'
      ? isValidDecimalNote(raw)
      : /^(?:\d|1\d|20)(?:[.,](?:25|50|75))?$/.test(raw);
    input.classList.toggle('is-valid', ok);
    input.classList.toggle('is-invalid', !ok);
  }

  function onAddOCRRow() {
    ocrDataRows.push({
      nom: '',
      prenom: '',
      d1: '',
      d2: '',
      compo: '',
      confidence: 1
    });
    renderOCRTable();
    const modal = createOCRModal();
    const inputs = modal.querySelectorAll('.prof-ocr-table tbody .prof-ocr-input');
    const lastInput = inputs[inputs.length - 2];
    if (lastInput) lastInput.focus();
  }

  function onApplyOCR() {
    const validRows = ocrDataRows.filter((r) => {
      return (r.nom || r.prenom) && (r.d1 || r.d2);
    });

    if (!validRows.length) {
      if (typeof showInfoDialog === 'function') {
        showInfoDialog(t('prof_ocr_no_data'));
      }
      return;
    }

    if (typeof window.populateProfRows === 'function') {
      window.populateProfRows(validRows);
    }

    hideVerificationModal();
  }

  /* ---------- Bouton "Scanner le relevé" ---------- */

  function createScanButton() {
    if (scanBtnEl) return scanBtnEl;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'prof-ocr-scan-btn';
    btn.className = 'primary-button prof-ocr-scan-btn';
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18" aria-hidden="true">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
        <circle cx="12" cy="13" r="4"></circle>
      </svg>
      <span data-i18n="prof_ocr_scan_btn">${t('prof_ocr_scan_btn')}</span>
    `;
    btn.addEventListener('click', onScanClick);
    return btn;
  }

  function showScanButton() {
    const btn = createScanButton();
    const preview = els.filePreview;
    if (preview && !btn.parentElement) {
      preview.insertAdjacentElement('afterend', btn);
    }
    const labelSpan = btn.querySelector('[data-i18n="prof_ocr_scan_btn"]');
    if (labelSpan) labelSpan.textContent = t('prof_ocr_scan_btn');
    btn.hidden = false;
  }

  function hideScanButton() {
    if (scanBtnEl) {
      scanBtnEl.hidden = true;
      if (scanBtnEl.parentElement) scanBtnEl.parentElement.removeChild(scanBtnEl);
    }
  }

  /* ---------- Progress overlay ---------- */

  let progressEl = null;

  function showProgress() {
    if (progressEl) return;
    const div = document.createElement('div');
    div.className = 'prof-ocr-progress-overlay';
    div.innerHTML = `
      <div class="prof-ocr-progress-card">
        <div class="prof-ocr-progress-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="32" height="32" aria-hidden="true">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
            <circle cx="12" cy="13" r="4"></circle>
          </svg>
        </div>
        <p class="prof-ocr-progress-title" data-i18n="prof_ocr_scanning">${t('prof_ocr_scanning')}</p>
        <div class="prof-ocr-progress-bar-wrap">
          <div class="prof-ocr-progress-bar" id="prof-ocr-progress-bar"></div>
        </div>
        <p class="prof-ocr-progress-text" id="prof-ocr-progress-text" data-i18n="prof_ocr_loading_deps">${t('prof_ocr_loading_deps')}</p>
      </div>
    `;
    document.body.appendChild(div);
    progressEl = div;
  }

  function updateProgress(pct, text) {
    const bar = progressEl?.querySelector('#prof-ocr-progress-bar');
    const textEl = progressEl?.querySelector('#prof-ocr-progress-text');
    if (bar) bar.style.width = pct + '%';
    if (textEl && text) textEl.textContent = text;
  }

  function hideProgress() {
    if (progressEl) {
      progressEl.remove();
      progressEl = null;
    }
  }

  /* ---------- PDF → image conversion ---------- */

  const PDFJS_SCRIPT = './vendor/pdfjs/pdf.min.mjs';
  const PDFJS_WORKER = './vendor/pdfjs/pdf.worker.min.mjs';
  let pdfjsLoaded = false;

  function loadPdfJs() {
    return new Promise((resolve, reject) => {
      if (pdfjsLoaded) return resolve();

      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        window.removeEventListener('pdfjs-ready', onReady);
        pdfjsLoaded = true;
        resolve();
      };
      const fail = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        window.removeEventListener('pdfjs-ready', onReady);
        reject(new Error('Impossible de charger pdf.js'));
      };
      const onReady = () => finish();
      window.addEventListener('pdfjs-ready', onReady, { once: true });

      const timer = setTimeout(fail, 15000);

      const script = document.createElement('script');
      script.type = 'module';
      script.textContent = `
        import * as pdfjsLib from '${PDFJS_SCRIPT}';
        window.pdfjsLib = pdfjsLib;
        window.dispatchEvent(new Event('pdfjs-ready'));
      `;
      document.head.appendChild(script);
    });
  }

  async function pdfToImageBlob(pdfFile) {
    await loadPdfJs();
    const pdfjsLib = window.pdfjsLib;
    if (!pdfjsLib) throw new Error('pdf.js non disponible');
    pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Échec de la conversion PDF'));
      }, 'image/png');
    });
  }

  /* ---------- Scan principal ---------- */

  async function onScanClick() {
    if (scanInProgress) return;

    const classeEl = document.getElementById('prof-classe');
    const matiereEl = document.getElementById('prof-matiere');
    const coefficientEl = document.getElementById('prof-coefficient');
    const customInput = document.getElementById('prof-matiere-custom');

    if (!classeEl?.value) {
      if (typeof showInfoDialog === 'function') showInfoDialog(t('prof_msg_classe_requise'));
      return;
    }
    const matiereVal = matiereEl?.value === '__autre__' ? customInput?.value?.trim() : matiereEl?.value;
    if (!matiereVal) {
      if (typeof showInfoDialog === 'function') showInfoDialog(t('prof_msg_matiere_requise'));
      return;
    }
    const coeff = Number(coefficientEl?.value);
    if (!Number.isInteger(coeff) || coeff < 1 || coeff > 8) {
      if (typeof showInfoDialog === 'function') showInfoDialog(t('prof_msg_coefficient_requis'));
      return;
    }

    const fileInput = els.fileInput;
    const file = fileInput?.files?.[0];
    if (!file) {
      if (typeof showInfoDialog === 'function') {
        showInfoDialog(t('prof_ocr_no_file'));
      }
      return;
    }

    const isImage = /^image\//.test(file.type) || /\.(png|jpe?g|webp|gif|bmp)$/i.test(file.name);
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);

    if (!isImage && !isPdf) {
      if (typeof showInfoDialog === 'function') {
        showInfoDialog(t('prof_ocr_only_images'));
      }
      return;
    }

    scanInProgress = true;
    showProgress();

    try {
      updateProgress(5, t('prof_ocr_loading_deps'));
      await loadTesseractScript();

      let ocrInputBlob = file;
      if (isPdf) {
        updateProgress(8, t('prof_ocr_pdf_conversion'));
        try {
          ocrInputBlob = await pdfToImageBlob(file);
        } catch (pdfErr) {
          hideProgress();
          console.error('PDF conversion error:', pdfErr);
          if (typeof showInfoDialog === 'function') {
            showInfoDialog(t('prof_ocr_pdf_error'));
          }
          return;
        }
      }

      if (!imgSourceCanvas) {
        imgSourceCanvas = await loadCanvasFromBlob(ocrInputBlob);
      }

      updateProgress(10, t('prof_ocr_progress', { pct: '10' }));
      const ocrData = await runOCR(ocrInputBlob, (pct) => {
        const text = t('prof_ocr_progress', { pct: String(10 + Math.round(pct * 0.8)) });
        updateProgress(10 + Math.round(pct * 0.8), text);
      });

      updateProgress(95, t('prof_ocr_scanning'));
      let results = parseOCRWords(ocrData);

      if (!results.length && ocrData.text) {
        results = parseOCRTextFallback(ocrData.text);
      }

      updateProgress(100, '');

      await new Promise((r) => setTimeout(r, 300));
      hideProgress();

      showVerificationModal(results);
    } catch (err) {
      hideProgress();
      console.error('OCR error:', err);
      if (typeof showInfoDialog === 'function') {
        showInfoDialog(t('prof_ocr_error'));
      }
    } finally {
      scanInProgress = false;
    }
  }

  /* ---------- Hooks exposés (appelés par prof.js) ---------- */

  window.onProfFileSelected = async function (file, isImage) {
    resetImageState();
    if (isImage) {
      try {
        imgSourceCanvas = await loadCanvasFromBlob(file);
      } catch (err) {
        console.error('Image load error:', err);
        imgSourceCanvas = null;
      }
    }
    if (els.imgTools) els.imgTools.hidden = !isImage || !imgSourceCanvas;
  };

  window.onProfFileCleared = function () {
    resetImageState();
    if (els.imgTools) els.imgTools.hidden = true;
    closeCropModal();
  };

  function resetImageState() {
    imgRotationDeg = 0;
    imgCropRect = null;
    imgEnhanceEnabled = true;
    imgSourceCanvas = null;
  }

  function initImageTools() {
    if (!els.imgTools) return;

    els.imgRotL?.addEventListener('click', () => {
      imgRotationDeg = ((imgRotationDeg - 90) % 360 + 360) % 360;
      renderImagePreview();
    });

    els.imgRotR?.addEventListener('click', () => {
      imgRotationDeg = ((imgRotationDeg + 90) % 360 + 360) % 360;
      renderImagePreview();
    });

    els.imgCrop?.addEventListener('click', () => openCropModal());

    els.imgEnhance?.addEventListener('click', () => {
      imgEnhanceEnabled = !imgEnhanceEnabled;
      if (els.imgEnhance) els.imgEnhance.classList.toggle('is-on', imgEnhanceEnabled);
      renderImagePreview();
    });
  }

  /* ---------- Hook sur l'upload ---------- */

  function hookFileUpload() {
    if (!els.fileInput) return;

    els.fileInput.addEventListener('change', (event) => {
      const file = event.target.files?.[0];
      if (file) {
        const isImage = /^image\//.test(file.type) || /\.(png|jpe?g|webp|gif|bmp)$/i.test(file.name);
        const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
        if (isImage || isPdf) {
          lastScannedFile = file;
          setTimeout(showScanButton, 100);
        } else {
          hideScanButton();
        }
      }
    });

    if (els.fileRemove) {
      els.fileRemove.addEventListener('click', () => {
        hideScanButton();
        lastScannedFile = null;
      });
    }
  }

  /* ---------- Exposition globale ---------- */

  window.startOCRScan = onScanClick;

  /* ---------- Initialisation ---------- */

  function init() {
    hookFileUpload();
    initImageTools();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
