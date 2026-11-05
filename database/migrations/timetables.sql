-- SUNU MOYENNE — Module « Emplois du temps »
-- MySQL 8.0.16+ (contraintes CHECK appliquées) — compatible Aiven MySQL 8.
-- Migration ADDITIVE : aucune table ni donnée existante n'est modifiée ou supprimée.
-- Idempotente : CREATE TABLE IF NOT EXISTS / INSERT IGNORE.
-- Ne pas écrire de point-virgule dans les chaînes (le script d'installation découpe sur « ; »).

-- 1. Emploi du temps = un en-tête rattaché à une classe ET à son année scolaire.
--    kind GRID = grille saisie dans l'application, DOCUMENT = fichier PDF/image importé.
--    published_class_id est une colonne générée : non NULL uniquement quand status = PUBLISHED.
--    Son index UNIQUE interdit deux emplois du temps publiés pour la même classe
--    (une classe appartient à une seule année scolaire, donc classe + année).
CREATE TABLE IF NOT EXISTS timetables (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  school_year_id BIGINT UNSIGNED NOT NULL,
  class_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(150) NULL,
  kind ENUM('GRID','DOCUMENT') NOT NULL,
  status ENUM('DRAFT','PUBLISHED','ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  days VARCHAR(20) NOT NULL DEFAULT '1,2,3,4,5',
  published_at DATETIME NULL,
  created_by BIGINT UNSIGNED NULL,
  updated_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  published_class_id BIGINT UNSIGNED GENERATED ALWAYS AS (CASE WHEN status = 'PUBLISHED' THEN class_id ELSE NULL END) STORED,
  PRIMARY KEY (id),
  UNIQUE KEY uq_timetable_one_published_per_class (published_class_id),
  KEY idx_timetables_class (class_id, status),
  KEY idx_timetables_year (school_year_id, status),
  CONSTRAINT fk_timetables_class_year FOREIGN KEY (class_id, school_year_id) REFERENCES classes(id, school_year_id) ON DELETE RESTRICT,
  CONSTRAINT fk_timetables_created_by FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE SET NULL,
  CONSTRAINT fk_timetables_updated_by FOREIGN KEY (updated_by) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Séances d'une grille (cours ou pauses). Un créneau libre = absence de ligne.
CREATE TABLE IF NOT EXISTS timetable_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  timetable_id BIGINT UNSIGNED NOT NULL,
  day_of_week TINYINT UNSIGNED NOT NULL,
  starts_at TIME NOT NULL,
  ends_at TIME NOT NULL,
  kind ENUM('COURSE','BREAK') NOT NULL DEFAULT 'COURSE',
  subject_id BIGINT UNSIGNED NULL,
  teacher_id BIGINT UNSIGNED NULL,
  subject_label VARCHAR(100) NOT NULL DEFAULT '',
  teacher_label VARCHAR(140) NOT NULL DEFAULT '',
  room VARCHAR(40) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tt_sessions_timetable (timetable_id, day_of_week, starts_at),
  KEY idx_tt_sessions_teacher (teacher_id),
  CONSTRAINT chk_tt_sessions_day CHECK (day_of_week BETWEEN 1 AND 7),
  CONSTRAINT chk_tt_sessions_time CHECK (ends_at > starts_at),
  CONSTRAINT fk_tt_sessions_timetable FOREIGN KEY (timetable_id) REFERENCES timetables(id) ON DELETE CASCADE,
  CONSTRAINT fk_tt_sessions_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
  CONSTRAINT fk_tt_sessions_teacher FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Document importé (PDF/PNG/JPEG) conservé dans MySQL : persistant, sauvegardé avec la base,
--    jamais exposé par une URL publique (lecture uniquement via l'API après contrôle des droits).
--    Une seule version courante par emploi du temps : « remplacer » met à jour la ligne.
CREATE TABLE IF NOT EXISTS timetable_documents (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  timetable_id BIGINT UNSIGNED NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes INT UNSIGNED NOT NULL,
  sha256 CHAR(64) NOT NULL,
  content LONGBLOB NOT NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  uploaded_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tt_documents_timetable (timetable_id),
  CONSTRAINT fk_tt_documents_timetable FOREIGN KEY (timetable_id) REFERENCES timetables(id) ON DELETE CASCADE,
  CONSTRAINT fk_tt_documents_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Nouvelles permissions (les permissions existantes ne sont pas touchées).
INSERT IGNORE INTO permissions (name, description, category) VALUES
('timetable.view', 'Consulter les emplois du temps', 'timetable'),
('timetable.create', 'Créer un emploi du temps', 'timetable'),
('timetable.edit', 'Modifier un emploi du temps', 'timetable'),
('timetable.delete', 'Supprimer un emploi du temps', 'timetable'),
('timetable.publish', 'Publier ou dépublier un emploi du temps', 'timetable'),
('timetable.upload', 'Importer ou remplacer un document d''emploi du temps', 'timetable');

-- 5. Attribution : l'administrateur principal reçoit tout.
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'principal' AND p.name LIKE 'timetable.%';

-- 6. L'administrateur pédagogique reçoit tout SAUF la suppression (réservée au principal).
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'pedagogical'
  AND p.name IN ('timetable.view', 'timetable.create', 'timetable.edit', 'timetable.publish', 'timetable.upload');
