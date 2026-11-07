/*
  ADMIN AUTH MIDDLEWARE — SUNU MOYENNE
  Middleware d'authentification pour les routes administration.
  Vérifie :
  1. La présence d'un token valide (en-tête Authorization ou cookie)
  2. Que l'administrateur est actif
  3. Ajoute l'identité admin à req.admin
*/

import { adminAuthMiddleware, verifyToken, recordAuditAction } from '../services/auth.service.js';

function json(res, status, payload) {
  return res.status(status).json(payload);
}

// Récupération de la pool MySQL (initialisée depuis server.js)
let pool = null;

function setPool(myPool) {
  pool = myPool;
}

/**
 * Point d'entrée : initializer la middleware avec le pool MySQL
 * @param {object} mysqlPool - Pool MySQL depuis server.js
 */
export function init(myPool) {
  setPool(myPool);
}

/**
 * Middleware complet d'authentification admin.
 * Doit être appelé après le body parser et le cookie parser d'Express.
 * @param {object} req - Requête Express
 * @param {object} res - Réponse Express
 * @param {function} next - Fonction next Express
 * @returns {void}
 */
export function authenticate(req, res, next) {
  try {
    // Utiliser le middleware du service auth
    adminAuthMiddleware(req, res, async () => {
      // Vérification DB supplémentaire via le pool
      if (!pool) {
        return json(res, 500, { error: 'mysql_not_configured' });
      }

      const adminId = req.admin.id;

      // Vérifier que l'administrateur est actif
      const [users] = await pool.execute(
        'SELECT id, email, full_name, role_id, is_active, must_change_password FROM admin_users WHERE id = ? AND is_active = TRUE',
        [adminId]
      );

      if (users.length === 0) {
        // Session invalide (admin désactivé)
        // Supprimer le cookie session
        res.clearCookie('admin_session');
        return json(res, 401, { error: 'compte_desactive', message: 'Votre compte est désactivé' });
      }

      // Vérifier si le mot de passe doit être changé au premier accès
      if (users[0].must_change_password && req.path !== '/change-password') {
        return json(res, 403, {
          must_change_password: true,
          user: {
            id: users[0].id,
            email: users[0].email,
            full_name: users[0].full_name
          }
        });
      }

      // Récupérer les permissions complètes
      const [rolePermissions] = await pool.execute(
        'SELECT permission_id FROM role_permissions WHERE role_id = ?',
        [users[0].role_id]
      );

      const permissionIds = rolePermissions.map(rp => rp.permission_id);

      const [permissions] = await pool.execute(
        'SELECT name, category FROM permissions WHERE id IN (?)',
        [permissionIds]
      );

      req.admin.permissions = permissions.map(p => p.name);

      // Enregistrer l'heure de connexion si ce n'est pas déjà fait
      await pool.execute(
        'UPDATE admin_users SET last_login = NOW() WHERE id = ?',
        [adminId]
      );

      next();
    });
  } catch (error) {
    console.error('Erreur authenticate admin:', error);
    return json(res, 500, { error: 'serveur_indisponible' });
  }
}

/**
 * Middleware de vérification de permission admin.
 * Vérifie que ladmin connecté possède la permission nécessaire.
 * @param {string|string[]} requiredPermission - Nom de la permission ou tableau
 * @returns {function} - Middleware Express
 */
export function checkPermission(requiredPermission) {
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
        if (req.admin && req.admin.id) {
          recordAuditAction(
            req,
            'permission_denied',
            'admin_action',
            req.admin.id,
            { requiredPermission, adminRole: admin.role }
          );
        }

        return json(res, 403, { error: 'permission_refusee', message: 'Vous n\'avez pas la permission requise' });
      }

      next();
    } catch (error) {
      console.error('Erreur checkPermission:', error);
      return json(res, 500, { error: 'serveur_indisponible' });
    }
  };
}

/**
 * Middleware de vérification de rôle admin.
 * Vérifie que ladmin a l'un des rôles spécifiés.
 * @param {string|string[]} allowedRoles - Rôle ou tableau de rôles autorisés
 * @returns {function} - Middleware Express
 */
export function checkRole(allowedRoles) {
  return async function(req, res, next) {
    try {
      const admin = req.admin;
      if (!admin || !admin.role) {
        return json(res, 403, { error: 'role_refusee', message: 'Rôle requis' });
      }

      const allowed = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
      const hasRole = allowed.includes(admin.role);

      if (!hasRole) {
        return json(res, 403, { error: 'role_refusee', message: 'Rôle requis' });
      }

      next();
    } catch (error) {
      console.error('Erreur checkRole:', error);
      return json(res, 500, { error: 'serveur_indisponible' });
    }
  };
}

/**
 * Vérifier que ladmin n'est pas la cible de restrictions spécifiques
 * @param {number} protectedAdminId - ID de ladmin à protéger (ex: l'admin principal ID=1)
 * @returns {function} - Middleware Express
 */
export function protectAdmin(protectedAdminId = 1) {
  return async function(req, res, next) {
    try {
      const admin = req.admin;
      if (!admin || !admin.id) {
        return next();
      }

      // Empêcher de modifier/désactiver/lire les données de l'admin protégé
      if (admin.id === protectedAdminId) {
        // Vérifier si l'utilisateur actuel essaie d'agir sur cet admin protégé
        // Cela dépendra du contexte de la route appelée
        req.protectedAdminId = protectedAdminId;
      }

      next();
    } catch (error) {
      console.error('Erreur protectAdmin:', error);
      return json(res, 500, { error: 'serveur_indisponible' });
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
  authenticate,
  checkPermission,
  checkRole,
  protectAdmin,
  getAdminPermissions
};