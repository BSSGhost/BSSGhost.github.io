/*
  AUTH SERVICE — SUNU MOYENNE Administration
  Gestion de l'authentification administrateur :
  - Hashage des mots de passe avec bcrypt/Argon2id
  - Connexion/déconnexion
  - Récupération de l'identité admin
  - Modification de mot de passe
  - Protection des routes
*/

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

function json(res, status, payload) {
  return res.status(status).json(payload);
}

let pool = null;
export function initAuthPool(mysqlPool) {
  pool = mysqlPool;
}

/**
 * Générer un hash SHA-256 d'une chaîne (utilisé pour comparer les tokens sessions)
 * @param {string} token - La chaîne à hasher
 * @returns {string} - Hash hexadécimal
 */
function hashCode(token) {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

const SALT_ROUNDS = 12; // ou Argon2id selon la configuration

/**
 * Hashage sécurisé du mot de passe
 * @param {string} plainPassword - Mot de passe en clair
 * @returns {Promise<string>} - Hash bcrypt/Argon2id
 */
export async function hashPassword(plainPassword) {
  try {
    const hash = await bcrypt.hash(plainPassword, SALT_ROUNDS);
    return hash;
  } catch (error) {
    console.error('Erreur hashage mot de passe:', error);
    throw new Error('Erreur_internal_hashing');
  }
}

/**
 * Comparaison mot de passe hashé
 * @param {string} plainPassword - Mot de passe en clair (saisie utilisateur)
 * @param {string} hashedPassword - Hash stocké en base
 * @returns {Promise<boolean>} - true si correspondance
 */
export async function comparePassword(plainPassword, hashedPassword) {
  try {
    const match = await bcrypt.compare(plainPassword, hashedPassword);
    return match;
  } catch (error) {
    console.error('Erreur comparaison mot de passe:', error);
    return false;
  }
}

/**
 * Génération du token JWT pour l'administration
 * @param {object} payload - Données à inclure dans le token
 * @param {string} secret - Clé secrète (depuis .env JWT_SECRET)
 * @param {string} expiresIn - Durée validité
 * @returns {string} - Token JWT
 */
export function generateToken(payload, secret, expiresIn = '24h') {
  try {
    const token = jwt.sign(payload, secret, { expiresIn });
    return token;
  } catch (error) {
    console.error('Erreur génération token:', error);
    throw new Error('Erreur_internal_token');
  }
}

/**
 * Vérification et décodage du token JWT
 * @param {string} token - Token JWT à vérifier
 * @param {string} secret - Clé secrète
 * @returns {object} - Payload décodé ou null invalide
 */
export function verifyToken(token, secret) {
  try {
    const payload = jwt.verify(token, secret);
    return payload;
  } catch (error) {
    console.error('Erreur vérification token:', error.message);
    return null;
  }
}

/**
 * Middleware d'authentification admin (à utiliser avec Express)
 * Vérifie :
 * 1. La présence du token dans les cookies ou en-tête Authorization
 * 2. La validité du token
 * 3. Que l'administrateur est actif
 * @param {object} req - Requête Express
 * @param {object} res - Réponse Express
 * @param {function} next - Fonction next Express
 * @returns {void}
 */
/**
 * Lire la valeur d'un cookie depuis l'en-tête Cookie (équivalent léger de cookie-parser)
 * @param {object} req - Requête Express
 * @param {string} name - Nom du cookie
 * @returns {string} - Valeur du cookie ou chaîne vide
 */
function readCookie(req, name) {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const index = part.indexOf('=');
    if (index > -1 && part.slice(0, index).trim() === name) {
      try { return decodeURIComponent(part.slice(index + 1).trim()); } catch { return ''; }
    }
  }
  return '';
}

/**
 * Middleware d'authentification admin utilisant les sessions cookie.
 * Lit le cookie admin_session, vérifie son existence en base
 * (table admin_sessions) et ajoute l'identité admin à req.admin.
 * Fonctionne sans cookie-parser, compatible HTTPS/Render.
 * @param {object} req - Requête Express
 * @param {object} res - Réponse Express
 * @param {function} next - Fonction next Express
 * @returns {void}
 */
export function adminAuthMiddleware(req, res, next) {
  try {
    // Récupérer le token depuis le cookie admin_session
    // (Le serveur le définit via setAdminCookie lors de la connexion)
    let token = readCookie(req, 'admin_session');

    // Fallback : tenter l'en-tête Authorization Bearer pour compatibilité
    if (!token) {
      const authHeader = req.headers['authorization'];
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return res.status(401).json({ error: 'non_authentifie', message: 'Aucun token d\'authentification trouvé (cookie admin_session manquant)' });
    }

    const db = await getDb();

    // Vérifier que le token existe en base et n'a pas expiré
    const [sessions] = await db.execute(
      'SELECT token_hash, expires_at, admin_user_id FROM admin_sessions WHERE token_hash = ? AND expires_at > NOW() LIMIT 1',
      [hashCode(token)]
    );

    if (!sessions.length) {
      // Token invalide ou expiré - essayer tout de même la vérification du compte
      // pour ne pas révéler si le cookie est simplement expiré
      const [users] = await db.execute(
        'SELECT id, email, full_name, role_id, is_active, must_change_password FROM admin_users WHERE is_active = TRUE LIMIT 1'
      );
      if (!users.length) {
        return res.status(401).json({ error: 'compte_desactive', message: 'Aucun administrateur actif trouvé' });
      }
      return res.status(401).json({ error: 'session_expiree', message: 'Votre session a expiré. Veuillez vous reconnecter.' });
    }

    const session = sessions[0];

    // Récupérer les infos de l administrateur
    const [users] = await db.execute(
      'SELECT id, email, full_name, role_id, is_active, must_change_password FROM admin_users WHERE id = ? AND is_active = TRUE',
      [session.admin_user_id]
    );

    if (!users.length) {
      // Compte désactivé - nettoyer les sessions orphelines
      await db.execute('DELETE FROM admin_sessions WHERE admin_user_id = ?', [session.admin_user_id]);
      return res.status(401).json({ error: 'compte_desactive', message: 'Votre compte est désactivé' });
    }

    const user = users[0];

    // Vérifier si le mot de passe doit être changé
    if (user.must_change_password) {
      return res.status(403).json({
        must_change_password: true,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name
        }
      });
    }

    // Récupérer les permissions
    const [rolePermissions] = await db.execute(
      'SELECT permission_id FROM role_permissions WHERE role_id = ?',
      [user.role_id]
    );

    const permissionIds = rolePermissions.map(rp => rp.permission_id);

    const [permissions] = await db.execute(
      'SELECT name, category FROM permissions WHERE id IN (?)',
      [permissionIds]
    );

    // Construire l identité admin
    req.admin = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role_id: user.role_id,
      permissions: permissions.map(p => p.name)
    };

    next();
  } catch (error) {
    console.error('Erreur middleware adminAuth:', error);
    return res.status(500).json({ error: 'serveur_indisponible', message: 'Erreur interne lors de la vérification d\'authentification' });
  }
}

/**
 * Vérifier si un administrateur a une permission donnée
 * @param {string|string[]} requiredPermission - Nom de la permission ou tableau
 * @returns {function} - Middleware Express
 */
export function checkPermission(requiredPermission) {
  return async function(req, res, next) {
    try {
      const admin = req.admin;
      if (!admin || !admin.permissions) {
        return res.status(403).json({ error: 'permission_refusee', message: 'Permissions insuffisantes' });
      }

      const needed = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];
      const hasPermission = needed.some(perm => admin.permissions.includes(perm));

      if (!hasPermission) {
        if (req.admin && req.admin.id) {
          recordAuditAction(req, 'permission_denied', 'admin_action', req.admin.id, { requiredPermission, adminRole: admin.role });
        }
        return res.status(403).json({ error: 'permission_refusee', message: 'Vous n\'avez pas la permission requise' });
      }

      next();
    } catch (error) {
      console.error('Erreur checkPermission:', error);
      return res.status(500).json({ error: 'serveur_indisponible' });
    }
  };
}

/**
 * Middleware de vérification de rôle admin.
 * @param {string|string[]} allowedRoles - Rôle ou tableau de rôles autorisés
 * @returns {function} - Middleware Express
 */
export function checkRole(allowedRoles) {
  return async function(req, res, next) {
    try {
      const admin = req.admin;
      if (!admin || !admin.role) {
        return res.status(403).json({ error: 'role_refusee', message: 'Rôle requis' });
      }

      const allowed = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
      const hasRole = allowed.includes(admin.role);

      if (!hasRole) {
        return res.status(403).json({ error: 'role_refusee', message: 'Rôle requis' });
      }

      next();
    } catch (error) {
      console.error('Erreur checkRole:', error);
      return res.status(500).json({ error: 'serveur_indisponible' });
    }
  };
}

/**
 * Obtenir les permissions de ladmin connecté
 * @returns {Promise<Array<string>>} - Liste des noms de permissions
 */
export function getAdminPermissions() {
  if (!req || !req.admin || !req.admin.permissions) {
    return [];
  }
  return req.admin.permissions;
}

export default {
  adminAuthMiddleware,
  checkPermission,
  checkRole,
  getAdminPermissions
};

/**
 * Middleware de vérification de permission
 * Vérifie que l'administrateur connecté possède la permission requête
 * @param {string|string[]} requiredPermission - Nom de la permission ou tableau de permissions
 * @returns {function} - Middleware Express
 */
export function permissionMiddleware(requiredPermission) {
  return async function(req, res, next) {
    try {
      const admin = req.admin;
      if (!admin || !admin.permissions) {
        return json(res, 403, { error: 'permission_refusee', message: 'Permissions insuffisantes' });
      }

      const needed = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];
      const hasPermission = needed.some(perm => admin.permissions.includes(perm));

      if (!hasPermission) {
        // Enregistrer dans le journal d'activité
        recordAuditAction(req, 'permission_denied', 'admin', admin.id, {
          requiredPermission,
          adminRole: admin.role
        });

        return json(res, 403, { error: 'permission_refusee', message: 'Vous n\'avez pas la permission requise' });
      }

      next();
    } catch (error) {
      console.error('Erreur middleware permission:', error);
      return json(res, 500, { error: 'serveur_indisponible' });
    }
  };
}

/**
 * Enregistrement d'une action dans le journal d'activité
 * @param {object} req - Requête Express
 * @param {string} action - Action effectuée
 * @param {string} resource - Ressource affectée
 * @param {number} resourceId - ID de la ressource
 * @param {object} details - Détails additionnels
 */
export async function recordAuditAction(req, action, resource, resourceId, details = {}) {
  try {
    const adminId = req.admin?.id;
    const ipAddress = req.ip || req.socket?.remoteAddress;
    const userAgent = req.get('User-Agent') || '';

    const pool = await getDb();
    await pool.execute(
      `INSERT INTO audit_logs 
       (admin_user_id, action, resource, resource_id, details, ip_address, user_agent, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [adminId, action, resource, resourceId, JSON.stringify(details), ipAddress, userAgent]
    );
  } catch (error) {
    console.error('Erreur enregistrement audit:', error);
    // On ne fait pas planter l'application en cas d'erreur d'audit
  }
}

/**
 * Obtenir la connexion MySQL (réutilise la configuration existante)
 */
function getDb() {
  if (!pool) throw new Error('MySQL pool non initialisé');
  return pool;
}

export default {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  adminAuthMiddleware,
  permissionMiddleware,
  recordAuditAction
};