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
import {
  checkStudentExists,
  buildStudentFromRow,
  autoMapColumns,
  getAvailableClasses,
  getSchoolYears,
  processImportRow
} from '../services/student.service.js';

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
    return res.status(status) === 400 ? json(res, 400, { error: 'ancien_mot_de_passe_invalide' }) : json(res, 500, { error: 'serveur_indisponible' });
  }
});

// === ADMINISTRATEURS (principal seulement) ===

function principalOnly(req, res, next) {
  if (req.admin.role !== 'principal') {
    return res.status(403).json({ error: 'droits_insuffisants', message: 'Seul l administrateur principal peut effectuer cette action' });
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
    const status = error.message === 'email_deja_pris' ? 409 : error.message === 'droits_insuffisants' ? 403 : 500;
    return res.status(status) === 400 ? json(res, 400, { error: 'ancien_mot_de_passe_invalide' }) : res.status(status) === 403 ? json(res, 403, { error: 'droits_insuffisants' }) : json(res, 500, { error: 'serveur_indisponible' });
  }
};

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
    return res.status(status) === 400 ? json(res, 400, { error: 'ancien_mot_de_passe_invalide' }) : json(res, 500, { error: 'serveur_indisponible' });
  }
});

// PUT /api/admin/users/:id/disable
// Désactiver un administrateur (principal seulement)
router.put('/users/:id/disable', authenticate, principalOnly, async (req, res) => {
  try {
    const adminId = parseInt(req.params.id, 10);
    const modifierId = req.admin.id;

    if (adminId === 1) {
      return res.status(403).json({ error: 'impossible_desactiver_principal', message: 'Impossible de désactiver l administrateur principal' });
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

// === IMPORT GROUPÉ D'ÉLÈVES ===

// POST /api/admin/students/import
// Import groupé d'élèves depuis données déjà analysées (JSON)
// Le client analyse le fichier côté navigateur et envoie les données structurées
router.post('/students/import', authenticate, checkPermission('students.create'), async (req, res) => {
  try {
    const db = req.pool;
    const adminId = req.admin.id;
    const { rows, columnMapping, targetClassId, schoolYearId, fileName } = req.body;

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'aucune_donnée', message: 'Aucune donnée fournie' });
    }

    // Vérifier la taille des données envoyées
    const dataSize = JSON.stringify(req.body).length;
    const MAX_DATA_BYTES = 5 * 1024 * 1024; // 5Mo de données JSON
    if (dataSize > MAX_DATA_BYTES) {
      return res.status(413).json({ error: 'donnees_trop_volumineuses', message: 'Les données envoyées dépassent la limite de 5Mo' });
    }

    // Première ligne = en-têtes (déjà présentes dans rows[0]), les données commencent à la ligne 2
    const headers = rows[0];
    const dataRows = rows.slice(1).filter((row) => row.length > 0);

    if (dataRows.length === 0) {
      return res.status(400).json({ error: 'aucune_donnée', message: 'Aucune ligne de données trouvé' });
    }

    // Mapping automatique des colonnes en se basant sur les en-têtes si non fourni
    let mapping = columnMapping;
    if (!mapping || Object.keys(mapping).length === 0) {
      const knownFields = {
        firstName: ['prénom', 'first_name', 'prenom'],
        lastName: ['nom', 'last_name', 'surname'],
        matricule: ['matricule', 'id_étudiant', 'student_id'],
        gender: ['sexe', 'gender', 'genre'],
        birthDate: ['date de naissance', 'birth_date', 'né(e) le'],
        birthPlace: ['lieu de naissance', 'birth_place', 'lieu_né'],
        classId: ['classe', 'class', 'classe_affectation']
      };
      mapping = autoMapColumns(headers, knownFields);
    }

    // Récupérer les classes disponibles
    const availableClasses = await getAvailableClasses(db);
    const schoolYears = await getSchoolYears(db);

    // Construire une map d'identification de classe par nom
    const classNameMap = new Map();
    availableClasses.forEach(cls => {
      classNameMap.set(cls.name.toLowerCase(), cls.id);
      if (cls.level) {
        classNameMap.set(`${cls.name.toLowerCase()} ${cls.level.toLowerCase()}`, cls.id);
      }
    });

    // Traiter chaque ligne
    const results = {
      total: dataRows.length,
      created: 0,
      ignored: 0, // doublons
      errors: 0,
      duplicates: 0,
      lines: []
    };

    const importPromises = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];

      // Construire les données élève depuis la ligne et le mapping
      const studentData = buildStudentFromRow(row, mapping);

      if (!studentData) {
        results.lines.push({
          row: i + 2, // +2 car row 0 = en-têtes, +1 pour le numéro de ligne humain
          status: 'error',
          reason: 'données_incomplètes',
          message: 'Ligne incomplète : prénom et nom sont requis'
        });
        results.errors++;
        continue;
      }

      // Normaliser la classe si c'est un nom de classe plutôt qu'un ID
      let classId = targetClassId;
      if (classId && typeof classId === 'string' && !Number(classId)) {
        // C'est probablement un nom de classe
        const foundClassId = classNameMap.get(classId.toLowerCase());
        if (foundClassId) {
          classId = foundClassId;
        } else {
          // Classe non trouvée - marquer comme erreur
          results.lines.push({
            row: i + 2,
            status: 'error',
            reason: 'classe_inconnue',
            message: `Classe "${classId}" introuvable. Veuillez sélectionner une classe existante.`
          });
          results.errors++;
          continue;
        }
      }

      // Traiter la ligne (vérifier doublons, créer l'élève)
      const processResult = await processImportRow(db, {
        ...studentData,
        classId
      }, availableClasses);

      importPromises.push(
        new Promise(async (resolve) => {
          try {
            if (processResult.status === 'duplicate') {
              results.duplicates++;
              results.ignored++;
              results.lines.push({
                row: i + 2,
                status: 'duplicate',
                reason: 'élève_existant',
                matricule: processResult.matricule,
                message: `Élève déjà existant (matricule: ${processResult.matricule})`
              });
              resolve();
            } else if (processResult.status === 'error') {
              results.errors++;
              results.lines.push({
                row: i + 2,
                status: 'error',
                reason: processResult.reason,
                message: processResult.message || 'Erreur lors du traitement'
              });
              resolve();
            } else if (processResult.status === 'valid') {
              // Créer l'élève dans la base de données
              const [studentResult] = await db.execute(
                `INSERT INTO students (matricule, first_name, last_name, gender, birth_date, guardian_name, guardian_phone, is_active)
                 VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)`,
                [
                  processResult.student.matricule || null,
                  processResult.student.first_name,
                  processResult.student.last_name,
                  processResult.student.gender || 'UNSPECIFIED',
                  processResult.student.birth_date || null,
                  processResult.student.guardian_name || null,
                  processResult.student.guardian_phone || null
                ]
              );

              // Si une classe cible est spécifiée, créer l'inscription
              if (targetClassId && processResult.student.matricule) {
                const enrollmentYearId = schoolYearId || 1;
                await db.execute(
                  `INSERT INTO enrollments (student_id, class_id, school_year_id, status)
                   VALUES (?, ?, ?, 'ACTIVE')
                   ON DUPLICATE KEY UPDATE class_id = VALUES(class_id), status = 'ACTIVE'`,
                  [studentResult.insertId, targetClassId, enrollmentYearId]
                );
              }

              results.created++;
              results.lines.push({
                row: i + 2,
                status: 'created',
                message: `Élève créé avec succès : ${processResult.student.first_name} ${processResult.student.last_name}`
              });
              resolve();
            }
          } catch (error) {
            console.error(`Erreur ligne ${i + 2}:`, error);
            results.errors++;
            results.lines.push({
              row: i + 2,
              status: 'error',
              reason: 'erreur_connexion',
              message: error.message || 'Erreur lors de l\'enregistrement en base de données'
            });
            resolve();
          }
        })
      );
    }

    // Attendre que toutes les lignes soient traitées
    await Promise.all(importPromises);

    // Enregistrer dans le journal d'activité
    await db.execute(
      `INSERT INTO audit_logs (admin_user_id, action, resource, resource_id, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [adminId, 'students_import', 'students', null,
        JSON.stringify({
          total: results.total,
          created: results.created,
          duplicates: results.duplicates,
          errors: results.errors,
          targetClassId: targetClassId,
          fileName: fileName || 'import inconnue'
        }),
        req.ip || 'unknown']
    );

    // Retourner le bilan
    return res.status(200).json({
      ok: true,
      bilan: results,
      message: `Import terminé : ${results.created} créés, ${results.duplicates} doublons, ${results.errors} erreurs sur ${results.total} lignes`
    });

  } catch (error) {
    console.error('Erreur import élèves:', error);
    return res.status(500).json({ error: 'serveur_indisponible', message: error.message || 'Erreur serveur lors de l'import' });
  }
});

export default router;