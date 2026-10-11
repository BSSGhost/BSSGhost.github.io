CREATE DATABASE IF NOT EXISTS sunu_moyenne CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sunu_moyenne;

CREATE TABLE IF NOT EXISTS migrations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  migration_code_hash CHAR(64) NOT NULL,
  data LONGTEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  imported_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_migration_code_hash (migration_code_hash),
  KEY idx_migration_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
