#!/usr/bin/env python3
import re

with open('C:\\Users\\BSS_Ghost\\Documents\\CalculMoyenne\\server.js', 'r', encoding='utf8') as f:
    content = f.read()

# Trouver et remplacer la fonction authenticateAdmin
old_func_start = '// Middleware d\'authentification admin (à appeler dans les routes)'
old_func_end_marker = '// --- Serveur principal ---'

# Trouver la position de départ
pos_start = content.find(old_func_start)
if pos_start == -1:
    print("Marker not found!")
else:
    # Trouver la position de fin (avant le commentaire --- Serveur principal ---)
    pos_end = content.find(old_func_end_marker, pos_start)
    if pos_end == -1:
        print("End marker not found!")
    else:
        # Extraire ce qui se trouve entre les deux marqueurs
        old_text = content[pos_start:pos_end]
        
        # Nouveau texte à insérer
        new_text = '''// Payload JWT decodé (utilisé par plusieurs fonctions)
function getJwtPayload(token, secret) {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    return null;
  }
}

/** Vérifie l authentification admin et retourne les infos utilisateur.
 * Cette fonction est la source unique de vérification d authentification.
 * Retourne un objet { success, user, must_change_password, error }.
 * n envoie aucune réponse HTTP - c est au gestionnaire de route de décider.
 */
function verifyAdminAuth(req) {
  const results = { success: false, user: null, must_change_password: false, error: null };

  // Définir la secret par défaut si absent en production
  const jwtSecret = process.env.JWT_SECRET || 'sunu-moyenne-admin-secret-change-in-production';
  
  // Si JWT_SECRET est la valeur par défaut en production, avertir
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction && process.env.JWT_SECRET === undefined) {
    results.error = 'jwt_secret_manquant_production';
    return results;
  }

  // 1. Extraire le token
  let token = null;
  
  // En-tête Authorization
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }
  
  // Cookie admin_token
  if (!token && req.cookies) {
    token = req.cookies.admin_token;
  }

  if (!token) {
    results.error = 'non_authentifie';
    return results;
  }

  // 2. Vérifier le token JWT
  const payload = getJwtPayload(token, jwtSecret);
  if (!payload) {
    results.error = 'token_invalide';
    return results;
  }

  // 3. Vérifier que la pool MySQL est disponible
  if (!pool) {
    results.error = 'mysql_not_configured';
    return results;
  }

  // 4. Récupérer l administrateur depuis la base
  return new Promise((resolve) => {
    pool.execute(
      'SELECT id, email, full_name, role_id, is_active, must_change_password FROM admin_users WHERE id = ? AND is_active = TRUE',
      [payload.id]
    )
    .then(([users]) => {
      if (users.length === 0) {
        // Compte désactivé
        results.error = 'compte_desactive';
        results.success = false;
        return resolve(results);
      }

      const user = users[0];

      // 5. Vérifier si le mot de passe doit être changé
      if (user.must_change_password) {
        results.success = true;
        results.user = {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role_id,
          must_change_password: true
        };
        results.must_change_password = true;
        return resolve(results);
      }

      // 6. Récupérer les permissions
      pool.execute(
        'SELECT permission_id FROM role_permissions WHERE role_id = ?',
        [user.role_id]
      )
      .then(([rolePermissions]) => {
        const permissionIds = rolePermissions.map(rp => rp.permission_id);
        
        pool.execute(
          'SELECT name FROM permissions WHERE id IN (?)',
          [permissionIds]
        )
        .then(([permissions]) => {
          results.success = true;
          results.user = {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            role: user.role_id,
            permissions: permissions.map(p => p.name)
          };
          results.must_change_password = false;
          resolve(results);
        })
        .catch(() => {
          results.error = 'permission_load_failed';
          resolve(results);
        });
      })
      .catch(() => {
        results.error = 'role_permissions_load_failed';
        resolve(results);
      });
    })
    .catch(() => {
      results.error = 'db_error';
      resolve(results);
    });
  });
});'''

        # Remplacer
        new_content = content[:pos_start] + new_text + content[pos_end:]
        
        with open('C:\\Users\\BSS_Ghost\\Documents\\CalculMoyenne\\server.js', 'w', encoding='utf8') as f:
            f.write(new_content)
        print("Remplacement réussi !")