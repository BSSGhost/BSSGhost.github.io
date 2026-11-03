/*
  PERMISSIONS MIDDLEWARE — SUNU MOYENNE
  Middleware spécifique pour la vérification fine des permissions RBAC.
  Chaque route API doit vérifier : authentification + rôle + permission.
*/

function json(res, status, payload) {
  return res.status(status).json(payload);
}

let pool = null;

function setPool(myPool) {
  pool = myPool;
}

/**
 * Initialiser la middleware avec la pool MySQL
 * @param {object} mysqlPool - Pool MySQL depuis server.js
 */
export function init(myPool) {
  setPool(myPool);
}

/**
 * Vérifier qu'un administrateur a une permission spécifique.
 * Ce middleware est destiné à être utilisé sur les routes API protégées.
 * Il vérifie dans l'ordre :
 * 1. Authentification (doit être appelé après authenticate)
 * 2. Rôle de ladmin
 * 3. Permission spécifique requise
 *
 * @param {string} permissionName - Nom de la permission (ex: 'students.create')
 * @returns {function} - Middleware Express
 */
export function verifyPermission(permissionName) {
  return async function(req, res, next) {
    try {
      if (!pool) {
        return json(res, 503, { error: 'mysql_unavailable' });
      }

      const adminId = req.admin?.id;
      if (!adminId) {
        return json(res, 401, { error: 'non_authentifie' });
      }

      // Récupérer le rôle de ladmin
      const [admin] = await pool.execute(
        'SELECT role_id FROM admin_users WHERE id = ?',
        [adminId]
      );

      if (admin.length === 0) {
        return json(res, 404, { error: 'admin_not_found' });
      }

      // Récupérer les permissions accordées à ce rôle
      const [rolePermissions] = await pool.execute(
        'SELECT permission_id FROM role_permissions WHERE role_id = ?',
        [admin[0].role_id]
      );

      const grantedPermissionIds = rolePermissions.map(rp => rp.permission_id);

      // Récupérer les noms de ces permissions
      const [permissions] = await pool.execute(
        'SELECT name, category FROM permissions WHERE id IN (?)',
        [grantedPermissionIds]
      );

      const grantedPermissions = new Set(permissions.map(p => p.name));

      // Vérifier si la permission demandée est dans le set accordé
      if (!grantedPermissions.has(permissionName)) {
        // Enregistrer dans le journal d'activité
        await pool.execute(
          'INSERT INTO audit_logs (admin_user_id, action, resource, resource_id, details, ip_address, user_agent, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
          [adminId, 'permission_denied', 'api_endpoint', null, { required: permissionName }, req.ip || 'unknown', req.get('User-Agent') || 'unknown']
        );

        return json(res, 403, {
          error: 'permission_refusee',
          message: `Vous n'avez pas la permission "${permissionName}"`,
          grantedPermissions: Array.from(grantedPermissions)
        });
      }

      // Permission accordée, continuer
      next();
    } catch (error) {
      console.error('Erreur verifyPermission:', error);
      return json(res, 500, { error: 'serveur_indisponible' });
    }
  };
}

/**
 * Vérifier qu'un administrateur a AU MOINS UNE des permissions d'une liste.
 * Utilisé quand plusieurs permissions sont possibles pour une action.
 * @param {Array<string>} allowedPermissions - Liste des permissions acceptées
 * @returns {function} - Middleware Express
 */
export function verifyAnyPermission(allowedPermissions) {
  return async function(req, res, next) {
    try {
      if (!pool) {
        return json(res, 503, { error: 'mysql_unavailable' });
      }

      const adminId = req.admin?.id;
      if (!adminId) {
        return json(res, 401, { error: 'non_authentifie' });
      }

      // Récupérer les permissions accordées
      const [admin] = await pool.execute(
        'SELECT role_id FROM admin_users WHERE id = ?',
        [adminId]
      );

      if (admin.length === 0) {
        return json(res, 404, { error: 'admin_not_found' });
      }

      const [rolePermissions] = await pool.execute(
        'SELECT permission_id FROM role_permissions WHERE role_id = ?',
        [admin[0].role_id]
      );

      const grantedPermissionIds = rolePermissions.map(rp => rp.permission_id);

      const [permissions] = await pool.execute(
        'SELECT name FROM permissions WHERE id IN (?)',
        [grantedPermissionIds]
      );

      const grantedPermissions = new Set(permissions.map(p => p.name));

      // Vérifier si au moins une permission correspond
      const hasPermission = [...grantedPermissions].some(p => allowedPermissions.includes(p));

      if (!hasPermission) {
        return json(res, 403, {
          error: 'permission_refusee',
          message: 'Aucune des permissions requises n\'est disponible',
          grantedPermissions: Array.from(grantedPermissions),
          required: allowedPermissions
        });
      }

      next();
    } catch (error) {
      console.error('Erreur verifyAnyPermission:', error);
      return json(res, 500, { error: 'serveur_indisponible' });
    }
  };
}

/**
 * Obtenir toutes les permissions de ladmin connecté
 * @param {number} adminId - ID de ladministrateur
 * @returns {Promise<Array<object>>} - Liste {name, category}
 */
export function getUserPermissions(adminId) {
  return new Promise((resolve, reject) => {
    if (!pool) {
      return reject(new Error('MySQL non disponible'));
    }

    if (!adminId) {
      return reject(new Error('Admin non authentifié'));
    }

    pool.execute(
      'SELECT p.name, p.category FROM role_permissions rp JOIN permissions p ON rp.permission_id = p.id WHERE rp.role_id = ?',
      [adminId]
    )
      .then(([rows]) => resolve(rows))
      .catch(reject);
  });
}

export default {
  verifyPermission,
  verifyAnyPermission,
  getUserPermissions
};