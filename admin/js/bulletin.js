function formatNumber(value) {
  return Number(value).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function escapeHtml(value) {
  const span = document.createElement('span');
  span.textContent = value == null ? '' : String(value);
  return span.innerHTML;
}

function mentionForAverage(value) {
  if (value === null) return { label: 'À compléter', cls: 'neutral' };
  if (value < 10) return { label: 'Insuffisant', cls: 'low' };
  if (value < 14) return { label: 'Peut mieux faire', cls: 'mid' };
  if (value < 16) return { label: 'Bon travail', cls: 'good' };
  if (value < 18) return { label: 'Très bon travail', cls: 'good' };
  return { label: 'Travail excellent', cls: 'top' };
}

function downloadPdf(data, studentName, modal) {
  const jsPDF = window.jspdf?.jsPDF;
  if (!jsPDF) {
    window.print();
    return;
  }
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const margin = 18;
  let y = 20;
  doc.setDrawColor(29, 106, 82);
  doc.setLineWidth(0.08);
  for (let py = 4; py < 290; py += 58 / 3.9) {
    for (let px = 4; px < 210; px += 58 / 3.9) {
      doc.lines([[4, 0], [0, 4], [-4, 0], [0, -4]], px - 4, py - 4, [1, 1], 'S', true);
    }
  }
  doc.setProperties({ title: `Bulletin de ${studentName}` });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('SUNU MOYENNE', margin, y);
  doc.setFontSize(12);
  doc.text(studentName, margin, y + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`${data.class} - ${data.term}`, margin, y + 14);
  y += 24;
  doc.text('Matiere', margin, y);
  doc.text('Coef.', 125, y);
  doc.text('Moyenne', 145, y);
  y += 5;
  doc.line(margin, y, 195, y);
  y += 7;
  const selected = data.results.find((row) => String(row.student_id || row.enrollment_id) === String(modal.dataset.studentId));
  for (const subject of selected?.subjects || []) {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.text(String(subject.name).slice(0, 55), margin, y);
    doc.text(String(subject.coefficient), 130, y);
    doc.text(subject.average === null ? '-' : formatNumber(subject.average), 155, y);
    y += 7;
  }
  y += 3;
  doc.setFont('helvetica', 'bold');
  doc.text(`Moyenne generale : ${selected?.general_average === null || selected?.general_average === undefined ? '-' : formatNumber(selected.general_average)}`, margin, y);
  doc.setTextColor(130);
  doc.setFontSize(9);
  doc.text('Document non officiel, à vérifier auprès de l\'administration', 105, 287, { align: 'center' });
  doc.save(`bulletin_${studentName.replace(/[^a-z0-9]+/gi, '_')}.pdf`);
}

export async function showAdminBulletin({ student, classId, termId, api }) {
  if (document.querySelector('.bltn-modal')) return;
  const data = await api(`/api/admin/results?class_id=${encodeURIComponent(classId)}&term_id=${encodeURIComponent(termId)}`);
  const selected = data.results.find((row) => String(row.student_id) === String(student.id));
  if (!selected) throw new Error('Les résultats de cet élève sont introuvables.');

  const average = selected.general_average === null ? null : Number(selected.general_average);
  const rankable = data.results.map((row) => Number(row.general_average)).filter((value) => Number.isFinite(value)).sort((a, b) => b - a);
  const rank = average === null ? null : rankable.indexOf(average) + 1;
  const mention = mentionForAverage(average);
  const studentName = `${student.first_name} ${student.last_name}`;
  const modal = document.createElement('div');
  modal.className = 'bltn-modal';
  modal.dataset.studentId = String(selected.student_id);
  modal.innerHTML = `
    <div class="bltn-overlay" data-close></div>
    <section class="bltn-card" role="dialog" aria-modal="true" aria-labelledby="admin-bltn-title" tabindex="-1">
      <header class="bltn-head">
        <img class="bltn-logo" src="/LYNAQE.png" alt="" height="44">
        <div class="bltn-head-text">
          <p class="bltn-eyebrow">Bulletin scolaire</p>
          <h3 id="admin-bltn-title">${escapeHtml(studentName)}</h3>
          <p class="bltn-meta">${escapeHtml(student.class_name || data.class)} · ${escapeHtml(data.term)} · ${escapeHtml(student.school_year || '')}</p>
        </div>
        <button type="button" class="bltn-x" data-close aria-label="Fermer">×</button>
      </header>
      <div class="bltn-body">
        <section class="bltn-summary bltn-tone-${mention.cls}" aria-label="Moyenne générale">
          <div class="bltn-summary-main">
            <p class="bltn-summary-label">Moyenne générale</p>
            <p class="bltn-summary-value"><strong>${average === null ? '—' : formatNumber(average)}</strong>${average === null ? '' : '<span>/20</span>'}</p>
          </div>
          <div class="bltn-appreciation">
            <span class="bltn-appreciation-label">Rang</span>
            <span class="bltn-appreciation-chip">${rank === null ? '—' : `${rank}${rank === 1 ? 'er' : 'e'}`}</span>
            <span class="bltn-appreciation-label">Appréciation</span>
            <span class="bltn-appreciation-chip">${escapeHtml(mention.label)}</span>
          </div>
        </section>
        <div class="bltn-table-wrap" tabindex="0" role="region" aria-label="Notes du bulletin">
          <table class="bltn-table">
            <thead><tr><th class="bltn-col-subject">Matière</th><th class="bltn-col-num">Coefficient</th><th class="bltn-col-num">Moyenne</th></tr></thead>
            <tbody>${selected.subjects.map((subject) => `<tr><th scope="row">${escapeHtml(subject.name)}</th><td class="bltn-col-num">${escapeHtml(subject.coefficient)}</td><td class="bltn-col-num">${subject.average === null ? '—' : formatNumber(subject.average)}</td></tr>`).join('')}</tbody>
          </table>
        </div>
      </div>
      <p class="bltn-watermark">Document non officiel, à vérifier auprès de l'administration</p>
      <footer class="bltn-foot">
        <button type="button" class="bltn-btn bltn-btn-text" data-close>Fermer</button>
        <div class="bltn-foot-main">
          <button type="button" class="bltn-btn bltn-btn-secondary" data-pdf>Télécharger le PDF</button>
          <button type="button" class="bltn-btn bltn-btn-primary" data-print>Imprimer</button>
        </div>
      </footer>
    </section>`;
  document.body.appendChild(modal);
  const card = modal.querySelector('.bltn-card');
  const previousOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  const close = () => { modal.remove(); document.body.style.overflow = previousOverflow; };
  modal.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', close));
  modal.querySelector('[data-pdf]').addEventListener('click', () => downloadPdf(data, studentName, modal));
  modal.querySelector('[data-print]').addEventListener('click', () => {
    document.body.classList.add('bltn-printing');
    window.addEventListener('afterprint', () => document.body.classList.remove('bltn-printing'), { once: true });
    window.print();
  });
  modal.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); });
  card.focus();
}
