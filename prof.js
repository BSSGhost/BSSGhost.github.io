/* =========================================================
   MODE PROFESSEUR — SUNU MOYENNE / LYNAQE Sédhiou
   Connexion protégée par mot de passe simple. Pour une matière
   et un coefficient donnés, le professeur ou le surveillant
   charge le relevé de notes (photo ou PDF) puis saisit les
   notes de chaque élève : le site calcule instantanément la
   moyenne de matière de chacun et permet d'exporter le relevé
   (PDF ou CSV).
   ========================================================= */
(function () {
  'use strict';

  const PROF_PASSWORD = 'LYNAQE2026';
  const PROF_AUTH_KEY = 'lynaqe_prof_auth';
  const PROF_ROWS_PREFIX = 'lynaqe_prof_rows';
  const NOTE_FIELDS = ['d1', 'd2', 'compo'];

  const $ = (id) => document.getElementById(id);

  const els = {
    screen: $('prof-screen'),
    loginCard: $('prof-login-card'),
    loginForm: $('prof-login-form'),
    password: $('prof-password'),
    loginError: $('prof-login-error'),
    console: $('prof-console'),
    logoutBtn: $('prof-logout-btn'),
    classe: $('prof-classe'),
    semestre: $('prof-semestre'),
    matiere: $('prof-matiere'),
    coefficient: $('prof-coefficient'),
    customGroup: $('prof-matiere-custom-group'),
    customInput: $('prof-matiere-custom'),
    dropzone: $('prof-dropzone'),
    fileInput: $('prof-file-input'),
    previewLabel: $('prof-preview-label'),
    filePreview: $('prof-file-preview'),
    fileImg: $('prof-file-img'),
    filePdf: $('prof-file-pdf'),
    fileName: $('prof-file-name'),
    fileRemove: $('prof-file-remove'),
    tbody: $('prof-tbody'),
    empty: $('prof-empty'),
    addStudent: $('prof-add-student'),
    thComposition: $('prof-th-composition'),
    summary: $('prof-summary'),
    summaryStats: $('prof-summary-stats'),
    exportPdf: $('prof-export-pdf'),
    exportCsv: $('prof-export-csv')
  };

  let rows = [];
  let fileObjectUrl = null;

  /* ----------------- Authentication ----------------- */

  function isAuthenticated() {
    try {
      return sessionStorage.getItem(PROF_AUTH_KEY) === '1';
    } catch {
      return false;
    }
  }

  function setAuthenticated(value) {
    try {
      if (value) sessionStorage.setItem(PROF_AUTH_KEY, '1');
      else sessionStorage.removeItem(PROF_AUTH_KEY);
    } catch {}
  }

  function showLogin() {
    if (!els.loginCard || !els.console) return;
    els.loginCard.hidden = false;
    els.console.hidden = true;
    els.password.value = '';
    els.loginError.hidden = true;
    window.setTimeout(() => els.password.focus(), prefersReducedMotion ? 0 : 200);
  }

  function showConsole() {
    if (!els.loginCard || !els.console) return;
    els.loginCard.hidden = true;
    els.console.hidden = false;
    refreshMatiereSelect();
  }

  /* -------------------- Context ---------------------- */

  function hasComposition() {
    return document.querySelector('input[name="prof-composition"]:checked')?.value === 'oui';
  }

  function getMatiereNom() {
    if (els.matiere.value === '__autre__') {
      return els.customInput.value.trim();
    }
    return els.matiere.value;
  }

  function validCoefficient() {
    const value = Number(els.coefficient.value);
    return Number.isInteger(value) && value >= 1 && value <= 8;
  }

  function getContextReady() {
    return Boolean(els.classe.value && getMatiereNom() && validCoefficient());
  }

  function getRowsStorageKey() {
    const classe = els.classe.value || 'none';
    const matiere = getMatiereNom() || 'none';
    return `${PROF_ROWS_PREFIX}_${classe}_${els.semestre.value}_${matiere.replace(/\s+/g, '_')}`;
  }

  function saveRows() {
    try {
      const key = getRowsStorageKey();
      if (rows.length) localStorage.setItem(key, JSON.stringify(rows));
      else localStorage.removeItem(key);
    } catch {}
  }

  function loadRows() {
    try {
      const key = getRowsStorageKey();
      const raw = localStorage.getItem(key);
      rows = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(rows)) rows = [];
      rows.forEach((row) => {
        ['nom', 'prenom', 'd1', 'd2', 'compo'].forEach((field) => {
          if (typeof row[field] !== 'string') row[field] = '';
        });
      });
    } catch {
      rows = [];
    }
    renderRows();
  }

  /* ------------------ Subject list ------------------- */

  function refreshMatiereSelect() {
    const previous = els.matiere.value;
    els.matiere.innerHTML = '';

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = t('option_matiere_default');
    els.matiere.appendChild(defaultOption);

    if (els.classe.value && typeof getMatieresPourClasse === 'function') {
      getMatieresPourClasse(els.classe.value).forEach((matiere) => {
        const option = document.createElement('option');
        option.value = matiere;
        option.textContent = typeof translateMatiere === 'function' ? translateMatiere(matiere) : matiere;
        els.matiere.appendChild(option);
      });
    }

    const autre = document.createElement('option');
    autre.value = '__autre__';
    autre.textContent = t('prof_matiere_custom_option');
    els.matiere.appendChild(autre);

    if (previous && [...els.matiere.options].some((option) => option.value === previous)) {
      els.matiere.value = previous;
    }
    updateCustomGroupVisibility();
    updateSummary();
  }

  function updateCustomGroupVisibility() {
    const isCustom = els.matiere.value === '__autre__';
    els.customGroup.hidden = !isCustom;
    if (isCustom) {
      window.setTimeout(() => els.customInput.focus(), prefersReducedMotion ? 0 : 200);
    }
  }

  /* ------------------- Calculation ------------------- */

  function parseNote(raw) {
    const value = String(raw ?? '').trim();
    if (value === '') return { empty: true, valid: true, value: null };
    const ok =
      typeof isValidDecimalNote === 'function'
        ? isValidDecimalNote(value)
        : /^(?:\d|1\d|20)(?:[.,](?:25|50|75))?$/.test(value);
    if (!ok) return { empty: false, valid: false, value: null };
    return { empty: false, valid: true, value: Number(value.replace(',', '.')) };
  }

  /* Moyenne de matière identique au mode élève :
     - sans composition : (d1 + d2) / 2
     - avec composition : ((d1 + d2) / 2 + compo) / 2   */
  function createAverage(row) {
    const d1 = parseNote(row.d1);
    const d2 = parseNote(row.d2);
    if (!d1.valid || !d2.valid || d1.empty || d2.empty) return null;
    const moyDevoirs = (d1.value + d2.value) / 2;
    if (!hasComposition()) return moyDevoirs;
    const compo = parseNote(row.compo);
    if (!compo.valid || compo.empty) return null;
    return (moyDevoirs + compo.value) / 2;
  }

  function noteFeedback(input) {
    const raw = input.value.trim();
    input.classList.remove('is-valid', 'is-invalid');
    if (!raw) return;
    input.classList.toggle('is-valid', parseNote(raw).valid);
    input.classList.toggle('is-invalid', !parseNote(raw).valid);
  }

  function refreshAverageCell(cell, row) {
    const avg = createAverage(row);
    if (avg === null) {
      cell.textContent = '—';
      cell.className = 'prof-moyenne-cell';
      return;
    }
    cell.textContent = avg.toFixed(2);
    cell.className = 'prof-moyenne-cell ' + (typeof gradeClass === 'function' ? gradeClass(avg) : '');
  }

  /* --------------------- Rendering -------------------- */

  function createTextInput(row, field, placeholder) {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'prof-text';
    input.value = row[field] || '';
    input.placeholder = placeholder || '';
    input.setAttribute('aria-label', placeholder || field);
    input.dataset.field = field;
    input.addEventListener('input', onCellInput);
    return input;
  }

  function createNoteInput(row, field) {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'note-input prof-note';
    input.inputMode = 'decimal';
    input.maxLength = 5;
    input.value = row[field] || '';
    input.dataset.field = field;
    input.addEventListener('input', onCellInput);
    noteFeedback(input);
    return input;
  }

  function onCellInput(event) {
    const input = event.currentTarget;
    const tr = input.closest('tr');
    const index = tr ? Array.prototype.indexOf.call(els.tbody.children, tr) : -1;
    if (index < 0 || index >= rows.length) return;
    const field = input.dataset.field;
    if (!field) return;
    rows[index][field] = input.value;
    if (NOTE_FIELDS.includes(field)) noteFeedback(input);
    const avgCell = tr.querySelector('.prof-moyenne-cell');
    if (avgCell) refreshAverageCell(avgCell, rows[index]);
    saveRows();
    updateSummary();
  }

  function renderRows() {
    if (!els.tbody) return;
    els.tbody.innerHTML = '';
    const showCompo = hasComposition();
    els.thComposition.hidden = !showCompo;
    els.empty.hidden = rows.length > 0;

    rows.forEach((row, index) => {
      const tr = document.createElement('tr');
      tr.className = 'prof-row';

      const rankCell = document.createElement('td');
      rankCell.className = 'prof-col-rank';
      rankCell.textContent = String(index + 1);

      const nameCell = document.createElement('td');
      nameCell.className = 'prof-col-name prof-name-cells';
      nameCell.appendChild(createTextInput(row, 'nom', t('prof_name_placeholder')));
      nameCell.appendChild(createTextInput(row, 'prenom', t('prof_prenom_placeholder')));

      const d1Cell = document.createElement('td');
      d1Cell.appendChild(createNoteInput(row, 'd1'));

      const d2Cell = document.createElement('td');
      d2Cell.appendChild(createNoteInput(row, 'd2'));

      const compoCell = document.createElement('td');
      compoCell.appendChild(createNoteInput(row, 'compo'));

      const avgCell = document.createElement('td');
      avgCell.className = 'prof-moyenne-cell';
      refreshAverageCell(avgCell, row);

      const delCell = document.createElement('td');
      delCell.className = 'prof-col-del';
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'prof-del-btn';
      delBtn.setAttribute('aria-label', t('prof_remove_student'));
      delBtn.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true"><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>';
      delBtn.addEventListener('click', () => {
        const i = Array.prototype.indexOf.call(els.tbody.children, tr);
        if (i >= 0) removeStudent(i);
      });
      delCell.appendChild(delBtn);

      tr.append(rankCell, nameCell, d1Cell, d2Cell, compoCell, avgCell, delCell);
      els.tbody.appendChild(tr);
    });

    updateSummary();
  }

  function addStudent() {
    rows.push({ nom: '', prenom: '', d1: '', d2: '', compo: '' });
    renderRows();
    saveRows();
    const lastRow = els.tbody.lastElementChild;
    const firstInput = lastRow ? lastRow.querySelector('.prof-text') : null;
    if (firstInput) firstInput.focus();
  }

  function removeStudent(index) {
    rows.splice(index, 1);
    renderRows();
    saveRows();
  }

  /* ---------------------- Summary --------------------- */

  function updateSummary() {
    const ready = getContextReady();
    const hasRows = rows.length > 0;
    const averages = rows.map(createAverage).filter((value) => value !== null);

    els.exportPdf.disabled = !ready || !hasRows;
    els.exportCsv.disabled = !ready || !hasRows;
    els.summary.hidden = false;

    if (!els.summaryStats) return;
    const hasData = averages.length > 0;
    const stats = [
      { label: 'prof_stat_effectifs', value: rows.length },
      { label: 'prof_stat_classe_avg', value: hasData ? (averages.reduce((sum, v) => sum + v, 0) / averages.length).toFixed(2) : '—' },
      { label: 'prof_stat_best', value: hasData ? Math.max(...averages).toFixed(2) : '—' },
      { label: 'prof_stat_worst', value: hasData ? Math.min(...averages).toFixed(2) : '—' }
    ];
    els.summaryStats.innerHTML = '';
    stats.forEach((stat) => {
      const div = document.createElement('div');
      div.className = 'prof-stat';
      const strong = document.createElement('strong');
      strong.textContent = stat.value;
      const span = document.createElement('span');
      span.textContent = t(stat.label);
      div.append(strong, span);
      els.summaryStats.appendChild(div);
    });
  }

  function exportCheck() {
    if (!els.classe.value) {
      if (typeof showInfoDialog === 'function') showInfoDialog(t('prof_msg_classe_requise'));
      return false;
    }
    if (!getMatiereNom()) {
      if (typeof showInfoDialog === 'function') showInfoDialog(t('prof_msg_matiere_requise'));
      return false;
    }
    if (!validCoefficient()) {
      if (typeof showInfoDialog === 'function') showInfoDialog(t('prof_msg_coefficient_requis'));
      return false;
    }
    if (!rows.length) {
      if (typeof showInfoDialog === 'function') showInfoDialog(t('prof_msg_aucun_eleve'));
      return false;
    }
    return true;
  }

  /* ------------------- File preview ------------------- */

  function handleFile(file) {
    if (!file) return;
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    const isImage = /^image\//.test(file.type) || /\.(png|jpe?g|webp|gif|bmp)$/i.test(file.name);
    if (!isPdf && !isImage) {
      if (typeof showInfoDialog === 'function') showInfoDialog(t('prof_file_type_error'));
      return;
    }
    clearFilePreview();
    fileObjectUrl = URL.createObjectURL(file);
    els.fileName.textContent = file.name;
    if (isImage) {
      els.fileImg.src = fileObjectUrl;
      els.fileImg.hidden = false;
      els.filePdf.hidden = true;
      els.filePdf.removeAttribute('src');
    } else {
      els.filePdf.src = fileObjectUrl;
      els.filePdf.hidden = false;
      els.fileImg.hidden = true;
      els.fileImg.removeAttribute('src');
    }
    els.filePreview.hidden = false;
    if (els.previewLabel) els.previewLabel.hidden = false;
    if (typeof els.filePreview.scrollIntoView === 'function') {
      els.filePreview.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'nearest' });
    }
  }

  function clearFilePreview() {
    if (fileObjectUrl) {
      URL.revokeObjectURL(fileObjectUrl);
      fileObjectUrl = null;
    }
    els.fileImg.hidden = true;
    els.fileImg.removeAttribute('src');
    els.filePdf.hidden = true;
    els.filePdf.removeAttribute('src');
    els.filePreview.hidden = true;
    if (els.previewLabel) els.previewLabel.hidden = true;
  }

  /* ---------------------- Exports --------------------- */

  function slugify(text) {
    return (
      String(text)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Za-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'releve'
    );
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function getStudentName(row) {
    return [row.prenom, row.nom].filter(Boolean).join(' ').trim() || '—';
  }

  function exportCsv() {
    if (!exportCheck()) return;
    const headers = ['N°', t('prof_th_eleve'), t('label_devoir1'), t('label_devoir2')];
    if (hasComposition()) headers.push(t('label_composition'));
    headers.push(t('th_moyenne'), t('prof_pdf_mention_col'));

    const lines = rows.map((row, index) => {
      const avg = createAverage(row);
      const cells = [index + 1, getStudentName(row), row.d1 || '', row.d2 || ''];
      if (hasComposition()) cells.push(row.compo || '');
      cells.push(avg === null ? '' : avg.toFixed(2));
      cells.push(avg === null ? '' : typeof getMention === 'function' ? getMention(avg).label : '');
      return cells.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';');
    });

    const csvRow = (arr) => arr.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';');
    const content = '\uFEFF' + [csvRow(headers), ...lines].join('\r\n');
    downloadBlob(new Blob([content], { type: 'text/csv;charset=utf-8;' }), `releve_${slugify(getMatiereNom())}_${els.classe.value}.csv`);
  }

  function exportPdf() {
    if (!exportCheck()) return;
    if (!window.jspdf) {
      if (typeof showInfoDialog === 'function') showInfoDialog(t('msg_jspdf_manquant'));
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40;
    const contentRight = pageWidth - margin;

    const matiere = getMatiereNom();
    const classe = els.classe.value;
    const semestreLabel = els.semestre.value === 'Semestre1' ? t('table_semestre1_full') : t('table_semestre2_full');
    const coefficient = Number(els.coefficient.value);
    const showCompo = hasComposition();

    const cols = [
      { label: '#', x: margin, width: 24, align: 'left' },
      { label: t('prof_th_eleve'), x: margin + 24, width: 192, align: 'left' },
      { label: t('pdf_th_devoir1'), x: margin + 216, width: 62, align: 'center' },
      { label: t('pdf_th_devoir2'), x: margin + 278, width: 62, align: 'center' }
    ];
    if (showCompo) cols.push({ label: t('pdf_th_compo'), x: margin + 340, width: 62, align: 'center' });
    const moyXBase = showCompo ? margin + 402 : margin + 340;
    cols.push({ label: t('pdf_th_moyenne'), x: moyXBase, width: 78, align: 'right' });
    const mentionX = moyXBase + 78;
    cols.push({ label: t('prof_pdf_mention_col'), x: mentionX, width: contentRight - mentionX, align: 'left' });

    const tableWidth = contentRight - margin;

    const BAND_HEIGHT = 76;
    const drawBrandBand = () => {
      doc.setFillColor(23, 43, 75);
      doc.rect(0, 0, pageWidth, BAND_HEIGHT, 'F');
      doc.setTextColor(255, 250, 240);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.text(t('pdf_etablissement'), margin, 32);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(t('pdf_app_name'), margin, 52);
      doc.setFont('helvetica', 'bold');
      doc.text(t('prof_pdf_title', { matiere }), contentRight, 32, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.text(
        `${t('pdf_classe', { classe })} • ${semestreLabel} • ${t('label_coefficient')} : ${coefficient}`,
        contentRight,
        52,
        { align: 'right' }
      );
      return BAND_HEIGHT;
    };

    const drawTableHeader = (y) => {
      doc.setFontSize(8.5);
      doc.setFillColor(231, 234, 239);
      doc.rect(margin, y, tableWidth, 20, 'F');
      doc.setTextColor(16, 23, 35);
      doc.setFont('helvetica', 'bold');
      cols.forEach((col) => {
        doc.text(col.label, col.align === 'right' ? col.x + col.width - 4 : col.x + 4, y + 13, { align: col.align });
      });
      return y + 20;
    };

    const rowHeight = 20;
    let y = drawBrandBand();
    y = drawTableHeader(y + 12);

    doc.setFontSize(9);
    rows.forEach((row, index) => {
      if (y > pageHeight - 64) {
        doc.addPage();
        y = drawBrandBand();
        y = drawTableHeader(y + 12);
      }
      doc.setDrawColor(214, 220, 228);
      doc.rect(margin, y, tableWidth, rowHeight, 'S');
      doc.setTextColor(51, 58, 68);
      doc.setFont('helvetica', 'normal');

      doc.text(String(index + 1), cols[0].x + 4, y + 13);
      doc.text(getStudentName(row).substring(0, 34), cols[1].x + 4, y + 13);
      const d1 = row.d1.trim() || '—';
      const d2 = row.d2.trim() || '—';
      const compo = row.compo.trim() || '—';
      doc.text(d1, cols[2].x + cols[2].width / 2, y + 13, { align: 'center' });
      doc.text(d2, cols[3].x + cols[3].width / 2, y + 13, { align: 'center' });
      let nextTextIndex = 4;
      if (showCompo) {
        doc.text(compo, cols[4].x + cols[4].width / 2, y + 13, { align: 'center' });
        nextTextIndex = 5;
      }
      const avg = createAverage(row);
      const avgCol = cols[nextTextIndex];
      doc.setFont('helvetica', 'bold');
      doc.text(avg === null ? '—' : avg.toFixed(2), avgCol.x + avgCol.width - 4, y + 13, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      if (avg !== null && typeof getMention === 'function') {
        doc.text(getMention(avg).label, cols[nextTextIndex + 1].x + 4, y + 13);
      }
      y += rowHeight;
    });

    doc.setFontSize(8);
    doc.setTextColor(113, 128, 120);
    doc.setFont('helvetica', 'normal');
    doc.text(t('pdf_footer_doc'), margin, pageHeight - 28);
    doc.text(`${t('pdf_app_name')} — ${t('pdf_etablissement')}`, contentRight, pageHeight - 28, { align: 'right' });

    doc.save(`releve_${slugify(matiere)}_${classe}.pdf`);
  }

  /* --------------------- Events ------------------------ */

  els.loginForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (els.password.value.trim() === PROF_PASSWORD) {
      setAuthenticated(true);
      showConsole();
    } else {
      els.loginError.hidden = false;
      els.loginError.classList.remove('shake');
      void els.loginError.offsetWidth;
      els.loginError.classList.add('shake');
      els.password.value = '';
      els.password.focus();
    }
  });

  els.logoutBtn.addEventListener('click', () => {
    setAuthenticated(false);
    showLogin();
  });

  els.classe.addEventListener('change', () => {
    refreshMatiereSelect();
    loadRows();
  });

  els.semestre.addEventListener('change', loadRows);

  els.matiere.addEventListener('change', () => {
    updateCustomGroupVisibility();
    loadRows();
  });

  els.customInput.addEventListener('input', updateSummary);

  els.coefficient.addEventListener('input', updateSummary);

  document.querySelectorAll('input[name="prof-composition"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      renderRows();
    });
  });

  els.dropzone.addEventListener('click', () => els.fileInput.click());
  els.dropzone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      els.fileInput.click();
    }
  });
  els.fileInput.addEventListener('change', (event) => {
    handleFile(event.target.files && event.target.files[0]);
  });
  els.dropzone.addEventListener('dragover', (event) => {
    event.preventDefault();
    els.dropzone.classList.add('is-dragging');
  });
  els.dropzone.addEventListener('dragleave', () => els.dropzone.classList.remove('is-dragging'));
  els.dropzone.addEventListener('drop', (event) => {
    event.preventDefault();
    els.dropzone.classList.remove('is-dragging');
    handleFile(event.dataTransfer.files && event.dataTransfer.files[0]);
  });
  els.fileRemove.addEventListener('click', () => {
    clearFilePreview();
    els.fileInput.value = '';
  });

  els.addStudent.addEventListener('click', addStudent);

  els.exportPdf.addEventListener('click', exportPdf);
  els.exportCsv.addEventListener('click', exportCsv);

  /* ------------- Initialisation / navigation ----------- */

  /* Met à jour les textes dynamiques quand la langue change. */
  window.refreshProfesseurTexts = function () {
    refreshMatiereSelect();
    renderRows();
  };

  function init() {
    if (!els.screen || !els.loginCard || !els.console) return;

    const isActiveScreen = els.screen.classList.contains('is-active');
    if (isAuthenticated()) {
      els.loginCard.hidden = true;
      els.console.hidden = false;
      if (isActiveScreen) refreshMatiereSelect();
    } else {
      els.loginCard.hidden = false;
      els.console.hidden = true;
    }

    if ('MutationObserver' in window) {
      const observer = new MutationObserver(() => {
        if (els.screen.classList.contains('is-active')) {
          if (isAuthenticated()) showConsole();
          else showLogin();
        }
      });
      observer.observe(els.screen, { attributes: true, attributeFilter: ['class'] });
    }
  }

  init();
})();