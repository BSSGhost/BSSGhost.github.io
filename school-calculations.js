/** Calculs officiels des résultats scolaires, partagés par les API serveur. */
export function calculateSubjectAverage({ devoir1, devoir2, composition, hasComposition }) {
  if (devoir1 === null || devoir1 === undefined || devoir2 === null || devoir2 === undefined) return null;
  if (hasComposition && (composition === null || composition === undefined)) return null;
  const averageOfTests = (Number(devoir1) + Number(devoir2)) / 2;
  return hasComposition ? (averageOfTests + Number(composition)) / 2 : averageOfTests;
}

export function calculateGeneralAverage(subjects) {
  if (!Array.isArray(subjects) || subjects.length === 0 || subjects.some((subject) => subject.average === null)) return null;
  const totalCoefficient = subjects.reduce((sum, subject) => sum + Number(subject.coefficient), 0);
  if (!(totalCoefficient > 0)) return null;
  const totalPoints = subjects.reduce((sum, subject) => sum + Number(subject.average) * Number(subject.coefficient), 0);
  return totalPoints / totalCoefficient;
}

export function parseGradeValue(raw) {
  if (raw === null || raw === undefined || String(raw).trim() === '') return null;
  const value = Number(String(raw).trim().replace(',', '.'));
  if (!Number.isFinite(value) || value < 0 || value > 20 || Math.abs(value * 4 - Math.round(value * 4)) > 1e-9) {
    throw new Error('note_invalide');
  }
  return value;
}

export function isValidCoefficient(value) {
  return Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 8;
}
