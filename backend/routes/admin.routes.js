/*
  ADMIN ROUTES — SUNU MOYENNE
  Routes API pour l'espace administration.
  Toutes les routes sont préfixées par /api/admin.
  Chaque route vérifie : authentification + rôle + permission.
*/

import express from 'express';
import {
  loginAdmin,
  logoutAdmin,
  getMe,
  changePassword,
  createAdmin,
  updateAdmin,
  disableAdmin,
  enableAdmin,
  listAdmins
} from '../services/admin.service.js';
import {
  authenticate,
  checkPermission,
  checkRole,
  protectAdmin
} from '../middleware/adminAuth.js';

const router = express.Router();

// === AUTHENTIFICATION ===

// POST /api/admin/login
// Connexion administrateur
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'données_incompletes', message: 'Email et mot de passe requis' });
    }

    const result = await loginAdmin(email, password);

    if (result.must_change_password) {
      return res.status(200).json({
        must_change_password: true,
        user: {
          id: result.user.id,
          email: result.user.email,
          full_name: result.user.full_name
        }
      });
    }

    res.status(200).json({
      ok: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        full_name: result.user.full_name,
        role_id: result.user.role_id
      },
      token: result.token
    });
  } catch (error) {
    console.error('Erreur login admin:', error);
    const status = error.message === 'identifiants_invalides' ? 401 : 500;
    return res.status(status).json(status === 401
      ? { error: 'identifiants_invalides', message: 'Adresse ou mot de passe incorrect.' }
      : { error: 'serveur_indisponible' });
  }
});

// POST /api/admin/logout
// Déconnexion administrateur
router.post('/logout', authenticate, async (req, res) => {
  try {
    const result = await logoutAdmin();
    res.clearCookie('admin_token');
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: 'serveur_indisponible' });
  }
});

// GET /api/admin/me
// Récupérer le profil de ladmin connecté
router.get('/me', authenticate, async (req, res) => {
  try {
    const adminId = req.admin.id;
    const result = await getMe(adminId);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Erreur route administration:', error); return res.status(500).json({ error: 'serveur_indisponible' });
  }
});

// POST /api/admin/change-password
// Changer le mot de passe (première connexion ou changement)
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const adminId = req.admin.id;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'données_incompletes', message: 'Ancien et nouveau mot de passe requis' });
    }

    const result = await changePassword(adminId, oldPassword, newPassword);
    return res.status(200).json(result);
  } catch (error) {
    const status = error.message === 'ancien_mot_de_passe_invalide' ? 400 : 500;
    return res.status(status).json(status === 400 ? { error: 'ancien_mot_de_passe_invalide' } : { error: 'serveur_indisponible' });
  }
});

// === ADMINISTRATEURS (principal seulement) ===

// Vérification : seul ladmin principal peut accéder à ces routes
function principalOnly(req, res, next) {
  if (req.admin.role !== 'principal') {
    return res.status(403).json({ error: 'droits_insuffisants', message: 'Seul l’administrateur principal peut effectuer cette action' });
  }
  next();
}

// GET /api/admin/users
// Lister tous les administrateurs (principal seulement)
router.get('/users', authenticate, principalOnly, async (req, res) => {
  try {
    const result = await listAdmins();
    return res.status(200).json(result);
  } catch (error) {
    console.error('Erreur route administration:', error); return res.status(500).json({ error: 'serveur_indisponible' });
  }
});

// POST /api/admin/users
// Créer un nouvel administrateur (principal seulement)
router.post('/users', authenticate, principalOnly, async (req, res) => {
  try {
    const { email, full_name, role_id, password_initial } = req.body;
    const creatorId = req.admin.id;

    if (!email || !full_name || !role_id) {
      return res.status(400).json({ error: 'données_incompletes', message: 'Email, nom et rôle requis' });
    }

    const result = await createAdmin({ email, full_name, role_id, password_initial }, creatorId);
    return res.status(201).json(result);
  } catch (error) {
    const status = error.message === 'email_deja_pris' ? 409 : 
                   error.message === 'droits_insuffisants' ? 403 : 500;
    return res.status(status).json(status === 400 ? { error: 'ancien_mot_de_passe_invalide' } : { error: 'serveur_indisponible' });
  }
});

// PUT /api/admin/users/:id
// Modifier un administrateur (principal seulement)
router.put('/users/:id', authenticate, principalOnly, async (req, res) => {
  try {
    const adminId = parseInt(req.params.id, 10);
    const updates = req.body;
    const modifierId = req.admin.id;

    const result = await updateAdmin(adminId, updates, modifierId);
    return res.status(200).json(result);
  } catch (error) {
    const status = error.message === 'droits_insuffisants_modifier_principal' ? 403 : 500;
    return res.status(status).json(status === 400 ? { error: 'ancien_mot_de_passe_invalide' } : { error: 'serveur_indisponible' });
  }
});

// PUT /api/admin/users/:id/disable
// Désactiver un administrateur (principal seulement)
router.put('/users/:id/disable', authenticate, principalOnly, async (req, res) => {
  try {
    const adminId = parseInt(req.params.id, 10);
    const modifierId = req.admin.id;

    // Empêcher la désactivation du principal
    if (adminId === 1) {
      return res.status(403).json({ error: 'impossible_desactiver_principal', message: 'Impossible de désactiver ladministrateur principal' });
    }

    const result = await disableAdmin(adminId, modifierId);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Erreur route administration:', error); return res.status(500).json({ error: 'serveur_indisponible' });
  }
});

// PUT /api/admin/users/:id/enable
// Réactiver un administrateur désactivé (principal seulement)
router.put('/users/:id/enable', authenticate, principalOnly, async (req, res) => {
  try {
    const adminId = parseInt(req.params.id, 10);
    const modifierId = req.admin.id;

    const result = await enableAdmin(adminId, modifierId);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Erreur route administration:', error); return res.status(500).json({ error: 'serveur_indisponible' });
  }
});

// === SECURITÉ / AUDIT ===

// GET /api/admin/audit/logs
// Obtenir le journal dactivité (principal avec filtres)
router.get('/audit/logs', authenticate, principalOnly, async (req, res) => {
  try {
    const db = req.pool;
    const { admin, action, resource, startDate, endDate } = req.query;

    let query = 'SELECT al.*, u.full_name as admin_name FROM audit_logs al LEFT JOIN admin_users u ON al.admin_user_id = u.id WHERE 1=1';
    const params = [];

    if (admin) {
      query += ' AND al.admin_user_id = ?';
      params.push(admin);
    }
    if (action) {
      query += ' AND al.action = ?';
      params.push(action);
    }
    if (resource) {
      query += ' AND al.resource = ?';
      params.push(resource);
    }
    if (startDate) {
      query += ' AND al.created_at >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND al.created_at <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY al.created_at DESC LIMIT 100';

    const [logs] = await db.execute(query, params);
    return res.status(200).json(logs);
  } catch (error) {
    console.error('Erreur route administration:', error); return res.status(500).json({ error: 'serveur_indisponible' });
  }
});

// POST /api/admin/audit/clear
// Vider le journal dactivité (principal seulement - danger)
router.post('/audit/clear', authenticate, principalOnly, async (req, res) => {
  try {
    const db = req.pool;
    await db.execute('TRUNCATE TABLE audit_logs');
    return res.status(200).json({ ok: true, message: 'Journal dactivité vidé' });
  } catch (error) {
    console.error('Erreur route administration:', error); return res.status(500).json({ error: 'serveur_indisponible' });
  }
});

export default router;