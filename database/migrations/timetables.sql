-- SUNU MOYENNE — Emplois du temps
-- Migration additive compatible MySQL 8. Ne supprime aucune donnée existante.

CREATE TABLE IF NOT EXISTS timetables (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  school_year_id BIGINT UNSIGNED NOT NULL,
  class_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(160) NULL,
  status ENUM('DRAFT','PUBLISHED','ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  published_at DATETIME NULL,
  published_key VARCHAR(96) GENERATED ALWAYS AS
    (CASE WHEN status = 'PUBLISHED' THEN CONCAT(class_id, '-', school_year_id) ELSE NULL END) STORED,
  created_by_admin_id BIGINT UNSIGNED NULL,
  updated_by_admin_id BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_timetable_class_year (school_year_id, class_id),
  UNIQUE KEY uq_timetable_one_published (published_key),
  KEY idx_timetables_class_status (class_id, status),
  KEY idx_timetables_year_status (school_year_id, status),
  CONSTRAINT fk_timetable_year FOREIGN KEY (school_year_id) REFERENCES school_years(id) ON DELETE RESTRICT,
  CONSTRAINT fk_timetable_class_year FOREIGN KEY (class_id, school_year_id) REFERENCES classes(id, school_year_id) ON DELETE RESTRICT,
  CONSTRAINT fk_timetable_created_admin FOREIGN KEY (created_by_admin_id) REFERENCES admin_users(id) ON DELETE SET NULL,
  CONSTRAINT fk_timetable_updated_admin FOREIGN KEY (updated_by_admin_id) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS timetable_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  timetable_id BIGINT UNSIGNED NOT NULL,
  weekday ENUM('MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY') NOT NULL,
  starts_at TIME NOT NULL,
  ends_at TIME NOT NULL,
  session_type ENUM('LESSON','BREAK','FREE') NOT NULL DEFAULT 'LESSON',
  subject_id BIGINT UNSIGNED NULL,
  teacher_id BIGINT UNSIGNED NULL,
  room VARCHAR(80) NULL,
  note VARCHAR(255) NULL,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_timetable_slot (timetable_id, weekday, starts_at, ends_at),
  KEY idx_timetable_sessions_day (timetable_id, weekday, starts_at),
  CONSTRAINT fk_tt_session_timetable FOREIGN KEY (timetable_id) REFERENCES timetables(id) ON DELETE CASCADE,
  CONSTRAINT fk_tt_session_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
  CONSTRAINT fk_tt_session_teacher FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL,
  CONSTRAINT chk_tt_session_time CHECK (ends_at > starts_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS timetable_documents (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  timetable_id BIGINT UNSIGNED NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size BIGINT UNSIGNED NOT NULL,
  sha256 CHAR(64) NOT NULL,
  cloudinary_public_id VARCHAR(255) NOT NULL,
  cloudinary_resource_type VARCHAR(30) NOT NULL DEFAULT 'image',
  created_by_admin_id BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_timetable_document (timetable_id),
  KEY idx_timetable_documents_public_id (cloudinary_public_id),
  CONSTRAINT fk_tt_document_timetable FOREIGN KEY (timetable_id) REFERENCES timetables(id) ON DELETE CASCADE,
  CONSTRAINT fk_tt_document_admin FOREIGN KEY (created_by_admin_id) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
