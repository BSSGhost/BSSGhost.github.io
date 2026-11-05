-- ============================================================
-- SUNU MOYENNE — Migration Système Administration
-- ============================================================
-- Cette migration ajoute les tables nécessaires au système d'administration
-- RBAC (Role-Based Access Control) sans modifier les tables existantes.
-- ============================================================

-- Utilisation : mysql -u root sunu_moyenne < database/migrations/admin-system.sql

-- ----------------------------------------------------------------------------
-- 1. Table des rôles (RBAC)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL,
  description VARCHAR(255),
  is_system_role BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_roles_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2. Table des permissions (RBAC)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS permissions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255),
  category VARCHAR(50) NOT NULL DEFAULT 'general',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_permissions_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 3. Table de liaison rôles -> permissions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NOT NULL,
  granted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (role_id, permission_id),
  KEY FK_role_permissions_permission (permission_id),
  CONSTRAINT FK_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE,
  CONSTRAINT FK_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 4. Table des administrateurs
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(150) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255),
  role_id BIGINT UNSIGNED NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  last_login DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_admin_users_email (email),
  KEY FK_admin_users_role (role_id),
  CONSTRAINT FK_admin_users_role FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 5. Sessions administrateurs (jetons opaques stockés sous forme de hash)
CREATE TABLE IF NOT EXISTS admin_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  admin_user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_admin_sessions_token_hash (token_hash),
  KEY idx_admin_sessions_admin (admin_user_id),
  KEY idx_admin_sessions_expiry (expires_at),
  CONSTRAINT FK_admin_sessions_admin FOREIGN KEY (admin_user_id) REFERENCES admin_users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Table du journal d'activité (audit)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  admin_user_id BIGINT UNSIGNED NOT NULL,
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(100) NOT NULL,
  resource_id BIGINT UNSIGNED NULL,
  details LONGTEXT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY FK_audit_logs_admin (admin_user_id),
  KEY idx_audit_logs_created_at (created_at),
  KEY idx_audit_logs_resource (resource, resource_id),
  CONSTRAINT FK_audit_logs_admin FOREIGN KEY (admin_user_id) REFERENCES admin_users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 6. Insertion des rôles initiaux
-- ----------------------------------------------------------------------------

-- Rôle 1 : Administrateur principal (tous les droits)
INSERT IGNORE INTO roles (name, description, is_system_role) VALUES
('principal', 'Administrateur principal - tous les droits', TRUE);

-- Rôle 2 : Administrateur pédagogique
INSERT IGNORE INTO roles (name, description, is_system_role) VALUES
('pedagogical', 'Administrateur pédagogique - droits restreints', TRUE);

-- ----------------------------------------------------------------------------
-- 7. Insertion des permissions initiaux
-- ----------------------------------------------------------------------------

-- Permissions Élèves
INSERT IGNORE INTO permissions (name, description, category) VALUES
('students.view', 'Consulter les élèves', 'students'),
('students.create', 'Ajouter un élève', 'students'),
('students.edit', 'Modifier un élève', 'students'),
('students.delete', 'Supprimer un élève', 'students');

-- Permissions Professeurs
INSERT IGNORE INTO permissions (name, description, category) VALUES
('teachers.view', 'Consulter les professeurs', 'teachers'),
('teachers.create', 'Ajouter un professeur', 'teachers'),
('teachers.edit', 'Modifier un professeur', 'teachers'),
('teachers.delete', 'Supprimer un professeur', 'teachers');

-- Permissions Classes
INSERT IGNORE INTO permissions (name, description, category) VALUES
('classes.view', 'Consulter les classes', 'classes'),
('classes.create', 'Créer une classe', 'classes'),
('classes.edit', 'Modifier une classe', 'classes'),
('classes.delete', 'Supprimer une classe', 'classes');

-- Permissions Matières
INSERT IGNORE INTO permissions (name, description, category) VALUES
('subjects.view', 'Consulter les matières', 'subjects'),
('subjects.create', 'Créer une matière', 'subjects'),
('subjects.edit', 'Modifier une matière', 'subjects'),
('subjects.delete', 'Supprimer une matière', 'subjects');

-- Permissions Notes
INSERT IGNORE INTO permissions (name, description, category) VALUES
('grades.view', 'Consulter les notes', 'grades'),
('grades.create', 'Créer une note', 'grades'),
('grades.edit', 'Modifier une note', 'grades'),
('grades.delete', 'Supprimer une note', 'grades');

-- Permissions Rapports
INSERT IGNORE INTO permissions (name, description, category) VALUES
('reports.view', 'Consulter les résultats', 'reports'),
('reports.generate', 'Générer un bulletin', 'reports'),
('reports.delete', 'Supprimer un bulletin', 'reports');

-- Permissions Emplois du temps
INSERT IGNORE INTO permissions (name, description, category) VALUES
('timetable.view', 'Consulter les emplois du temps', 'timetable'),
('timetable.create', 'Créer un emploi du temps', 'timetable'),
('timetable.edit', 'Modifier un emploi du temps', 'timetable'),
('timetable.delete', 'Supprimer un emploi du temps', 'timetable'),
('timetable.publish', 'Publier ou dépublier un emploi du temps', 'timetable'),
('timetable.upload', 'Importer ou remplacer un document emploi du temps', 'timetable');

-- Permissions Administrateurs
INSERT IGNORE INTO permissions (name, description, category) VALUES
('admins.view', 'Consulter les administrateurs', 'admins'),
('admins.create', 'Créer un administrateur', 'admins'),
('admins.edit', 'Modifier un administrateur', 'admins'),
('admins.delete', 'Supprimer un administrateur', 'admins');

-- Permissions Rôles
INSERT IGNORE INTO permissions (name, description, category) VALUES
('roles.view', 'Consulter les rôles', 'roles'),
('roles.edit', 'Modifier les rôles', 'roles');

-- Permissions Paramètres
INSERT IGNORE INTO permissions (name, description, category) VALUES
('settings.view', 'Consulter les paramètres', 'settings'),
('settings.edit', 'Modifier les paramètres', 'settings');

-- Permission Journal d'activité
INSERT IGNORE INTO permissions (name, description, category) VALUES
('audit_logs.view', 'Consulter le journal d''activité', 'audit');

-- Permission Sessions
INSERT IGNORE INTO permissions (name, description, category) VALUES
('sessions.view', 'Voir les sessions actives', 'sessions'),
('sessions.revoke', 'Révoker une session', 'sessions');

-- ----------------------------------------------------------------------------
-- 8. Association des permissions aux rôles
-- ----------------------------------------------------------------------------

-- Rôle Administrateur principal : TOUTES les permissions
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'principal';

-- Rôle Administrateur pédagogique : permissions strictement pédagogiques
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'pedagogical'
  AND p.name IN (
    -- Élèves
    'students.view', 'students.create', 'students.edit',
    -- Professeurs (consultation seulement)
    'teachers.view',
    -- Classes
    'classes.view', 'classes.create', 'classes.edit',
    -- Matières
    'subjects.view', 'subjects.create', 'subjects.edit',
    -- Notes
    'grades.view', 'grades.edit',
    -- Rapports
    'reports.view', 'reports.generate',
    -- Emplois du temps
    'timetable.view', 'timetable.create', 'timetable.edit',
    'timetable.publish', 'timetable.upload'
  );

-- ----------------------------------------------------------------------------
-- 9. Insertion des administrateurs initiaux
-- ----------------------------------------------------------------------------
-- Les mots de passe sont initialisés par le script sécurisé `npm run init-admins`.
-- Les hash ne sont jamais créés à partir d’une saisie libre lors de la connexion.

-- Administrateur principal
INSERT IGNORE INTO admin_users (email, full_name, password_hash, role_id, is_active, must_change_password)
SELECT 'DEthiam@sunu-moyenne.com', 'DEthiam', NULL, r.id, TRUE, TRUE
FROM roles r WHERE r.name = 'principal';

-- Deuxième administrateur
INSERT IGNORE INTO admin_users (email, full_name, password_hash, role_id, is_active, must_change_password)
SELECT 'Colonelgueye@sunu-moyenne.com', 'Colonelgueye', NULL, r.id, TRUE, TRUE
FROM roles r WHERE r.name = 'pedagogical';

-- ----------------------------------------------------------------------------
-- Fin de la migration
-- ----------------------------------------------------------------------------
-- Résumé :
-- - Tables créées : roles, permissions, role_permissions, admin_users, admin_sessions, audit_logs
-- - 2 rôles système créés : principal, pedagogical
-- - 34 permissions système définies couvrant les domaines d’administration
-- - 2 administrateurs initiaux créés avec must_change_password = true
-- - Les mots de passe restent NULL jusqu’à l’exécution contrôlée de `npm run init-admins`.
-- - La migration est safe : IF NOT EXISTS / INSERT IGNORE pour ne jamais casser
--   les données existantes.