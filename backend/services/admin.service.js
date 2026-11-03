/*
  ADMIN SERVICE — SUNU MOYENNE Administration
  Couche de service pour la gestion administrative :
  - Gestion des utilisateurs admin
  - Gestion des rôles et permissions
  - Journal d'activité
  - Paramètres de l'établissement
*/

import { hashPassword, comparePassword, generateToken, verifyToken, adminAuthMiddleware, permissionMiddleware, recordAuditAction } from './auth.service.js';
import mysql from 'mysql2/promise';

// Protection contre les attaques par force brute
// Nombre maximum de tentatives échouées avant blocage
const MAX_FAILED_ATTEMPTS = 5;
// Durée de blocage en minutes
const BLOCK_DURATION_MINUTES = 15;

// Stockage en mémoire des tentatives échouées par email
// Format: { email: { attempts: number, firstAttempt: timestamp } }
const failedAttempts = new Map();

function isEmailBlocked(email) {
  const attemptData = failedAttempts.get(email);
  if (!attemptData) return false;

  const now = Date.now();
  const blockTime = (BLOCK_DURATION_MINUTES * 60 * 1000);

  // Si le nombre de tentatives dépasse la limite et que le blocage n'est pas expiré
  if (attemptData.attempts >= MAX_FAILED_ATTEMPTS && now - attemptData.firstAttempt < blockTime) {
    return true; // Toujours en cours de blocage
  }

  // Si le blocage a expiré, réinitialiser
  if (now - attemptData.firstAttempt >= blockTime) {
    failedAttempts.delete(email);
  }

  return false;
}

function recordFailedAttempt(email) {
  const now = Date.now();
  const attemptData = failedAttempts.get(email);

  if (attemptData) {
    attemptData.attempts += 1;
    attemptData.firstAttempt = Math.min(attemptData.firstAttempt, now);
  } else {
    failedAttempts.set(email, { attempts: 1, firstAttempt: now });
  }
}

function resetFailedAttempts(email) {
  failedAttempts.delete(email);
}

// Récupération de la pool MySQL (à adapter selon l'existant)
let pool = null;

function getPool() {
  if (!pool) {
    throw new Error('MySQL pool non initialisé');
  }
  return pool;
}

/**
 * Initialiser la pool MySQL
 * @param {object} mysqlPool - Pool MySQL depuis server.js
 */
export function initPool(mysqlPool) {
  pool = mysqlPool;
}

/**
 * Connexion administrateur
 * Vérifie email/mot de passe, retourne l'identité avec permissions
 * @param {string} email - Email de l'administrateur
 * @param {string} plainPassword - Mot de passe en clair
 * @returns {Promise<object>} - Identité admin avec permissions
 */
export async function loginAdmin(email, plainPassword) {
  // Vérifier si l'email est bloqué suite à trop de tentatives échouées
  if (isEmailBlocked(email)) {
    throw new Error('trop_de_tentatives');
  }

  const db = await getPool();
  
  // Récupérer l'administrateur par email
  const [users] = await db.execute(
    `SELECT id, email, full_name, password_hash, role_id, is_active, must_change_password 
     FROM admin_users WHERE email = ? AND is_active = TRUE`,
    [email]
  );

  if (users.length === 0) {
    // Aucun utilisateur trouvé - on quand même incrémente le compteur pour ne pas révéler si l'email existe
    recordFailedAttempt(email);
    throw new Error('identifiants_invalides');
  }

  const user = users[0];

  // === SÉCURITÉ: Refuser la connexion si le mot de passe n'est pas initialisé ===
  // Si password_hash est NULL ou vide, le compte n'a pas été initialisé en sécurité.
  // La connexion doit être refusée. Aucun utilisateur ne doit pouvoir choisir le
  // premier mot de passe d'un compte simplement en connaissant son adresse électronique.
  if (!user.password_hash || user.password_hash.trim() === '') {
    // Incrémenter le compteur d'échecs (sans révéler si l'email existe)
    recordFailedAttempt(email);
    throw new Error('mot_de_passe_non_initialise');
  }

  // Vérifier le mot de passe
  const passwordValid = await comparePassword(plainPassword, user.password_hash);

  if (!passwordValid) {
    // Mot de passe incorrect - incrémenter le compteur d'échecs
    recordFailedAttempt(email);
    throw new Error('identifiants_invalides');
  }

  // Vérifier si le mot de passe doit être changé
  if (user.must_change_password) {
    resetFailedAttempts(email);
    return {
      must_change_password: true,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role_id: user.role_id
      }
    };
  }

  // Récupérer les permissions basées sur le rôle
  const [rolePermissions] = await db.execute(
    `SELECT permission_id FROM role_permissions WHERE role_id = ?`,
    [user.role_id]
  );

  const permissionIds = rolePermissions.map(rp => rp.permission_id);

  // Récupérer les noms de permissions
  const [permissions] = await db.execute(
    `SELECT name, category FROM permissions WHERE id IN (?)`,
    [permissionIds]
  );

  const permissionNames = permissions.map(p => p.name);

  // Générer le token
  const secret = process.env.JWT_SECRET || 'sunu-moyenne-admin-secret-change-in-production';
  const token = generateToken({
    id: user.id,
    email: user.email,
    role: user.role_id,
    permissions: permissionNames
  }, secret);

  return {
    must_change_password: false,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role_id: user.role_id
    },
    token
  };
}

/**
 * Déconnexion administrateur
 * Invalide le token (côté serveur, le token JWT est sans état)
 * @returns {Promise<object>} - Message de déconnexion
 */
export async function logoutAdmin() {
  // JWT étant sans état, la déconnexion côté client consiste à supprimer le token
  return { ok: true, message: 'Déconnecté avec succès' };
}

/**
 * Récupérer le profil de l'administrateur connecté
 * @param {number} adminId - ID de l'administrateur
 * @returns {Promise<object>} - Profil admin
 */
export async function getMe(adminId) {
  const db = await getPool();
  
  const [users] = await db.execute(
    `SELECT id, email, full_name, role_id, is_active, must_change_password, last_login, created_at 
     FROM admin_users WHERE id = ?`,
    [adminId]
  );

  if (users.length === 0) {
    throw new Error('admin_introuvable');
  }

  const user = users[0];

  // Mettre à jour la dernière connexion
  await db.execute(
    `UPDATE admin_users SET last_login = NOW() WHERE id = ?`,
    [adminId]
  );

  // Récupérer les permissions
  const [rolePermissions] = await db.execute(
    `SELECT permission_id FROM role_permissions WHERE role_id = ?`,
    [user.role_id]
  );

  const permissionIds = rolePermissions.map(rp => rp.permission_id);

  const [permissions] = await db.execute(
    `SELECT name, category FROM permissions WHERE id IN (?)`,
    [permissionIds]
  );

  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role_id: user.role_id,
    is_active: user.is_active,
    must_change_password: user.must_change_password,
    last_login: user.last_login,
    created_at: user.created_at,
    permissions: permissions.map(p => p.name)
  };
}

/**
 * Changer le mot de passe de l'administrateur
 * @param {number} adminId - ID de l'administrateur
 * @param {string} oldPassword - Ancien mot de passe
 * @param {string} newPassword - Nouveau mot de passe
 * @returns {Promise<object>} - Résultat
 */
export async function changePassword(adminId, oldPassword, newPassword) {
  const db = await getPool();
  
  // Récupérer l'administrateur actuel
  const [users] = await db.execute(
    `SELECT password_hash FROM admin_users WHERE id = ?`,
    [adminId]
  );

  if (users.length === 0) {
    throw new Error('admin_introuvable');
  }

  const user = users[0];

  // Vérifier l'ancien mot de passe
  const passwordValid = await comparePassword(oldPassword, user.password_hash);

  if (!passwordValid) {
    throw new Error('ancien_mot_de_passe_invalide');
  }

  // Hashager le nouveau mot de passe
  const newHash = await hashPassword(newPassword);

  // Mettre à jour le hash en base
  await db.execute(
    `UPDATE admin_users SET password_hash = ?, must_change_password = FALSE WHERE id = ?`,
    [newHash, adminId]
  );

  // Enregistrer dans le journal d'activité
  await recordAuditAction(
    { admin: { id: adminId } },
    'password_changed',
    'admin_profile',
    adminId,
    { type: 'password_change' }
  );

  return { ok: true, message: 'Mot de passe modifié avec succès' };
}

/**
 * Créer un nouvel administrateur (uniquement pour l'administrateur principal)
 * @param {object} adminData - Données de l'administrateur à créer
 * @param {number} creatorId - ID de l'administrateur créateur
 * @returns {Promise<object>} - Résultat
 */
export async function createAdmin(adminData, creatorId) {
  const db = await getPool();
  
  // Vérifier que l'administrateur créateur a le droit
  const [creator] = await db.execute(
    `SELECT id, role_id FROM admin_users WHERE id = ?`,
    [creatorId]
  );

  if (creator.length === 0) {
    throw new Error('admin_introuvable');
  }

  // Seuls les admins principaux peuvent créer d'autres admins
  if (creator[0].role_id !== 1) { // role_id 1 = principal
    throw new Error('droits_insuffisants');
  }

  // Vérifier que l'email n'existe pas déjà
  const [existing] = await db.execute(
    `SELECT id FROM admin_users WHERE email = ?`,
    [adminData.email]
  );

  if (existing.length > 0) {
    throw new Error('email_deja_pris');
  }

  // Hashager le mot de passe
  const passwordHash = await hashPassword(adminData.password_initial || 'LYNAQE123@');

  // Créer l'administrateur
  const [result] = await db.execute(
    `INSERT INTO admin_users (email, full_name, password_hash, role_id, is_active, must_change_password)
     VALUES (?, ?, ?, ?, TRUE, TRUE)`,
    [adminData.email, adminData.full_name, passwordHash, adminData.role_id]
  );

  // Enregistrer les permissions pour ce nouvel administrateur
  if (adminData.permissionIds && adminData.permissionIds.length > 0) {
    const permissionValues = adminData.permissionIds.map(id => [result.insertId, id]);
    await db.execute(
      `INSERT INTO role_permissions (role_id, permission_id) VALUES ?`,
      [permissionValues]
    );
  }

  // Enregistrer dans le journal d'activité
  await recordAuditAction(
    { admin: { id: creatorId } },
    'admin_created',
    'admin_users',
    result.insertId,
    { created_by: creatorId, new_admin_email: adminData.email }
  );

  return {
    ok: true,
    adminId: result.insertId,
    message: 'Administrateur créé avec succès'
  };
}

/**
 * Modifier un administrateur (informations, rôle, permissions)
 * @param {number} adminId - ID de l'administrateur à modifier
 * @param {object} updates - Mises à jour à appliquer
 * @param {number} modifierId - ID de l'administrateur qui modifie
 * @returns {Promise<object>} - Résultat
 */
export async function updateAdmin(adminId, updates, modifierId) {
  const db = await getPool();
  
  // Vérifier les droits de l'administrateur modificateur
  const [modifier] = await db.execute(
    `SELECT role_id FROM admin_users WHERE id = ?`,
    [modifierId]
  );

  if (modifier.length === 0) {
    throw new Error('admin_introuvable');
  }

  // L'administrateur principal peut modifier tous les admins
  // L'administrateur pédagogique ne peut pas modifier l'administrateur principal
  if (modifier[0].role_id === 2 && adminId === 1) { // admin_id 1 = DEthiam principal
    throw new Error('droits_insuffisants_modifier_principal');
  }

  // Construire la requête de mise à jour dynamique
  const updatesList = [];
  const values = [];

  if (updates.full_name !== undefined) {
    updatesList.push('full_name = ?');
    values.push(updates.full_name);
  }
  if (updates.role_id !== undefined) {
    // Vérifier que le rôle existe
    const [role] = await db.execute('SELECT id, name FROM roles WHERE id = ?', [updates.role_id]);
    if (role.length === 0) {
      throw new Error('role_invalide');
    }
    updatesList.push('role_id = ?');
    values.push(updates.role_id);
  }
  if (updates.is_active !== undefined) {
    updatesList.push('is_active = ?');
    values.push(updates.is_active);
  }

  if (updatesList.length === 0) {
    return { ok: true, message: 'Aucune modification à appliquer' };
  }

  values.push(adminId);

  await db.execute(
    `UPDATE admin_users SET ${updatesList.join(', ')} WHERE id = ?`,
    values
  );

  // Gérer les permissions si modifiées
  if (updates.permissionIds !== undefined) {
    // Supprimer les anciennes permissions
    await db.execute(
      `DELETE FROM role_permissions WHERE role_id = ?`,
      [modifier[0].role_id]
    );

    // Ajouter les nouvelles permissions
    if (updates.permissionIds.length > 0) {
      const permissionValues = updates.permissionIds.map(id => [modifier[0].role_id, id]);
      await db.execute(
        `INSERT INTO role_permissions (role_id, permission_id) VALUES ?`,
        [permissionValues]
      );
    }
  }

  // Enregistrer dans le journal d'activité
  await recordAuditAction(
    { admin: { id: modifierId } },
    'admin_updated',
    'admin_users',
    adminId,
    { updated_by: modifierId, changes: updates }
  );

  return { ok: true, message: 'Administrateur mis à jour avec succès' };
}

/**
 * Désactiver un administrateur (ne pas supprimer pour préserver les données)
 * @param {number} adminId - ID de l'administrateur à désactiver
 * @param {number} modifierId - ID de l'administrateur qui désactive
 * @returns {Promise<object>} - Résultat
 */
export async function disableAdmin(adminId, modifierId) {
  const db = await getPool();
  
  // Empêcher la désactivation de l'administrateur principal
  if (adminId === 1) { // ID du principal
    throw new Error('impossible_desactiver_principal');
  }

  await db.execute(
    `UPDATE admin_users SET is_active = FALSE WHERE id = ?`,
    [adminId]
  );

  // Enregistrer dans le journal d'activité
  await recordAuditAction(
    { admin: { id: modifierId } },
    'admin_disabled',
    'admin_users',
    adminId,
    { disabled_by: modifierId }
  );

  return { ok: true, message: 'Administrateur désactivé avec succès' };
}

/**
 * Réactiver un administrateur désactivé
 * @param {number} adminId - ID de l'administrateur à réactiver
 * @param {number} modifierId - ID de l'administrateur qui réactive
 * @returns {Promise<object>} - Résultat
 */
export async function enableAdmin(adminId, modifierId) {
  const db = await getPool();
  
  await db.execute(
    `UPDATE admin_users SET is_active = TRUE WHERE id = ?`,
    [adminId]
  );

  // Enregistrer dans le journal d'activité
  await recordAuditAction(
    { admin: { id: modifierId } },
    'admin_enabled',
    'admin_users',
    adminId,
    { enabled_by: modifierId }
  );

  return { ok: true, message: 'Administrateur réactivé avec succès' };
}

/**
 * Obtenir la liste des administrateurs avec leurs rôles et permissions
 * @returns {Promise<Array>} - Liste des administrateurs
 */
export async function listAdmins() {
  const db = await getPool();
  
  const [admins] = await db.execute(
    `SELECT id, email, full_name, role_id, is_active, must_change_password, created_at 
     FROM admin_users ORDER BY is_active DESC, full_name`
  );

  // Pour chaque admin, récupérer le rôle et les permissions
  const adminsWithDetails = await Promise.all(admins.map(async (admin) => {
    const [role] = await db.execute('SELECT id, name, description FROM roles WHERE id = ?', [admin.role_id]);
    
    const [rolePermissions] = await db.execute(
      `SELECT permission_id FROM role_permissions WHERE role_id = ?`,
      [admin.role_id]
    );

    const permissionIds = rolePermissions.map(rp => rp.permission_id);
    const [permissions] = await db.execute(
      `SELECT name, category FROM permissions WHERE id IN (?)`,
      [permissionIds]
    );

    return {
      id: admin.id,
      email: admin.email,
      full_name: admin.full_name,
      role: role[0] || { name: 'inconnu' },
      is_active: admin.is_active,
      must_change_password: admin.must_change_password,
      created_at: admin.created_at,
      permissions: permissions.map(p => p.name)
    };
  }));

  return adminsWithDetails;
}

export default {
  initPool,
  loginAdmin,
  logoutAdmin,
  getMe,
  changePassword,
  createAdmin,
  updateAdmin,
  disableAdmin,
  enableAdmin,
  listAdmins
};