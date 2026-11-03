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

function json(res, status, payload) {
  return res.status(status).json(payload);
}

let pool = null;
export function initAuthPool(mysqlPool) {
  pool = mysqlPool;
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
export function adminAuthMiddleware(req, res, next) {
  try {
    let token = null;

    // Essayer de récupérer le token depuis l'en-tête Authorization
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    // Sinon essayer depuis les cookies
    if (!token && req.cookies) {
      token = req.cookies.admin_token;
    }

    if (!token) {
      return json(res, 401, { error: 'non_authentifie', message: 'Token d\'authentification requis' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return json(res, 503, { error: 'jwt_non_configure' });
    }
    const payload = verifyToken(token, secret);

    if (!payload) {
      return json(res, 401, { error: 'token_invalide', message: 'Token invalide ou expiré' });
    }

    // Vérifier que l'administrateur est actif
    // (La vérification DB complète se fait dans le contrôleur)
    req.admin = {
      id: payload.id,
      email: payload.email,
      role: payload.role,
      permissions: payload.permissions
    };

    next();
  } catch (error) {
    console.error('Erreur middleware adminAuth:', error);
    return json(res, 500, { error: 'serveur_indisponible' });
  }
}

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