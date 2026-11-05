-- Migration non destructive : ajoute le coefficient de référence à chaque matière.
-- La colonne historique subjects.code reste conservée pour les dépendances existantes.
-- class_subjects.coefficient reste conservée pour compatibilité, mais l'application lit
-- désormais subjects.coefficient comme source de vérité.

SET @subject_coefficient_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'subjects'
    AND COLUMN_NAME = 'coefficient'
);

SET @add_subject_coefficient = IF(
  @subject_coefficient_exists = 0,
  'ALTER TABLE subjects ADD COLUMN coefficient DECIMAL(5,2) NOT NULL DEFAULT 1.00 AFTER name',
  'SELECT 1'
);
PREPARE statement FROM @add_subject_coefficient;
EXECUTE statement;
DEALLOCATE PREPARE statement;

-- Réutiliser uniquement les coefficients affectés qui sont cohérents pour une matière.
-- Les matières sans consensus restent à la valeur neutre 1.00 afin de ne pas inventer
-- arbitrairement un coefficient pédagogique.
UPDATE subjects s
JOIN (
  SELECT cs.subject_id, MAX(cs.coefficient) AS coefficient
  FROM class_subjects cs
  GROUP BY cs.subject_id
  HAVING COUNT(DISTINCT cs.coefficient) = 1
) consistent ON consistent.subject_id = s.id
SET s.coefficient = consistent.coefficient
WHERE s.coefficient = 1.00;
