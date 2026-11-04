/*
   ADMIN — SUNU MOYENNE
   Gestion côté client de l'espace administration
   Gère l'authentification, la navigation et les appels API
*/

/* État global */
let adminUser = null;

/* Initialisation au chargement */
document.addEventListener('DOMContentLoaded', () => {
  initAdmin();
});

/*
 * Vérifier la session directement auprès du serveur.
 * Le cookie admin_session est envoyé automatiquement.
 */
async function initAdmin() {
  try {
    const response = await fetch('/api/admin/me', {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store'
    });

    const data = await response.json();

    if (response.status === 403 &&
        data.error === 'changement_mot_de_passe_requis') {
      adminUser = data.user;
      changePassword();
      return;
    }

    if (!response.ok || !data.ok) {
      adminUser = null;
      showLoginScreen();
      return;
    }

    adminUser = data.user;

    if (adminUser.must_change_password) {
      changePassword();
      return;
    }

    await loadAdminData();
    showAdminScreen();

  } catch (error) {
    console.error('Erreur de vérification de session :', error);
    adminUser = null;
    showLoginScreen();
  }
}

/*
 * Réinitialiser uniquement l'état local.
 * Le cookie HttpOnly est géré exclusivement par le serveur.
 */
function clearToken() {
  adminUser = null;
}

/*
   Gérer la soumission du formulaire de connexion
*/
async function handleLoginSubmit(event) {
  event.preventDefault();

  const email = document.getElementById('admin-login-email').value.trim();
  const password = document.getElementById('admin-login-password').value;

  const submitBtn = event.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;

  submitBtn.textContent = 'Connexion en cours...';
  submitBtn.disabled = true;

  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      showError('Connexion impossible : ' + (data.error || 'Erreur inconnue'));
      return;
    }

    adminUser = data.user;

    if (data.must_change_password) {
      changePassword();
      return;
    }

    await loadAdminData();
    showAdminScreen();

  } catch (error) {
    console.error('Erreur de connexion :', error);
    showError('Impossible de contacter le serveur.');
  } finally {
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
}

/*
   Afficher l'écran d'administration
*/
function showAdminScreen() {
  if (!adminUser) return;

  const wrapper = document.getElementById('admin-wrapper');
  if (!wrapper) return;

  // Déterminer quelles sections sont accessibles selon le rôle
  const isPrincipal = adminUser.role_name === 'principal';

  let sectionsHTML = `
    <!-- Sidebar -->
    <div class="admin-sidebar">
      <div class="admin-brand-small">
        <img src="LYNAQE.png" alt="Logo" width="28" height="28" style="margin-right: 8px;">
        SUNU MOYENNE
      </div>
      <div class="sidebar-nav">
  `;

  // Items de menu communs (accessibles aux deux rôles)
  const commonSections = [
    { id: 'dashboard', label: 'Tableau de bord', icon: '📊' },
    { id: 'students', label: 'Élèves', icon: '👥' },
    { id: 'classes', label: 'Classes', icon: '📋' }
  ];

  // Items supplémentaires seulement pour ladmin principal
  const principalSections = [
    { id: 'admin-users', label: 'Administrateurs', icon: '👑' },
    { id: 'roles', label: 'Rôles & permissions', icon: '🔐' },
    { id: 'settings', label: 'Paramètres', icon: '⚙️' }
  ];

  // Ajouter les sections communes
  commonSections.forEach(section => {
    const isAccessible = true; // Toutes les sections sont accessibles au minimum
    sectionsHTML += `
      <a href="#" class="sidebar-nav-link" data-section="${section.id}" 
         ${!isAccessible ? 'style="color: var(--muted)"' : ''}>
        <span>${section.icon} ${section.label}</span>
      </a>
    `;
  });

  // Ajouter les sections principales uniquement
  if (isPrincipal) {
    principalSections.forEach(section => {
      sectionsHTML += `
        <a href="#" class="sidebar-nav-link" data-section="${section.id}">
          <span>${section.icon} ${section.label}</span>
        </a>
      `;
    });
  }

  sectionsHTML += `</div></div>`;

  // Section principale - contenu
  const sectionMap = {
    dashboard: `
      <section id="admin-dashboard" class="admin-section is-active">
        <div class="admin-card">
          <div class="admin-card-header">
            <h3>Bienvenue à l'administration</h3>
          </div>
          <div class="admin-grid-view">
            <div class="admin-grid-card">
              <div class="admin-grid-icon">📊</div>
              <div class="admin-grid-label">Effectif</div>
              <div class="admin-grid-value" id="dashboard-stats-total">Chargement...</div>
              <a href="#admin-students" class="admin-grid-link">Voir les détails</a>
            </div>
            <div class="admin-grid-card">
              <div class="admin-grid-icon">👥</div>
              <div class="admin-grid-label">Professeurs</div>
              <div class="admin-grid-value" id="dashboard-stats-teachers">Chargement...</div>
            </div>
            <div class="admin-grid-card">
              <div class="admin-grid-icon">📚</div>
              <div class="admin-grid-label">Matières</div>
              <div class="admin-grid-value" id="dashboard-stats-subjects">Chargement...</div>
            </div>
          </div>
        </div>

        <div class="admin-card" style="margin-top: 24px;">
          <div class="admin-card-header">
            <h3>Activité récente</h3>
          </div>
          <div id="admin-activity-list" class="admin-activity-list">
            <p>Chargement de l'activité récente...</p>
          </div>
        </div>
      </section>
    `,
    students: `
      <section id="admin-students" class="admin-section">
        <div class="admin-card">
          <div class="admin-card-header">
            <h3>Gestion des Élèves</h3>
            <button type="button" class="admin-card-add-btn" onclick="showAddStudentForm()">Ajouter un élève</button>
          </div>
          <div class="admin-card-content">
            <div class="admin-table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Prénom</th>
                    <th>Classe</th>
                    <th>Email</th>
                    <th>Rôle</th>
                    <th style="width: 140px;">Actions</th>
                  </tr>
                </thead>
                <tbody id="admin-students-table">
                  <!-- Liste chargée dynamiquement -->
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    `,
    teachers: `
      <section id="admin-teachers" class="admin-section">
        <div class="admin-card">
          <div class="admin-card-header">
            <h3>Gestion des Professeurs</h3>
            <button type="button" class="admin-card-add-btn">Ajouter un professeur</button>
          </div>
          <div class="admin-card-content">
            <div class="admin-table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Prénom</th>
                    <th>Matière</th>
                    <th>Classe</th>
                    <th style="width: 140px;">Actions</th>
                  </tr>
                </thead>
                <tbody id="admin-teachers-table">
                  <!-- Liste chargée dynamiquement -->
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    `,
    classes: `
      <section id="admin-classes" class="admin-section">
        <div class="admin-card">
          <div class="admin-card-header">
            <h3>Gestion des Classes</h3>
            <button type="button" class="admin-card-add-btn">Créer une classe</button>
          </div>
          <div class="admin-card-content">
            <div class="admin-table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Niveau</th>
                    <th>Effectif</th>
                    <th style="width: 140px;">Actions</th>
                  </tr>
                </thead>
                <tbody id="admin-classes-table">
                  <!-- Liste chargée dynamiquement -->
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    `,
    'admin-users': `
      <section id="admin-users" class="admin-section">
        <div class="admin-card">
          <div class="admin-card-header">
            <h3>Gestion des Administrateurs</h3>
          </div>
          <div class="admin-card-content">
            <div class="admin-table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Email</th>
                    <th>Rôle</th>
                    <th>Statut</th>
                    <th>Dernière connexion</th>
                    <th style="width: 140px;">Actions</th>
                  </tr>
                </thead>
                <tbody id="admin-users-table">
                  <!-- Liste chargée dynamiquement -->
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    `,
    roles: `
      <section id="admin-roles" class="admin-section">
        <div class="admin-card">
          <div class="admin-card-header">
            <h3>Rôles & Permissions</h3>
          </div>
          <div class="admin-card-content">
            <p>Interface de gestion des rôles RBAC en cours de chargement...</p>
          </div>
        </div>
      </section>
    `,
    settings: `
      <section id="admin-settings" class="admin-section">
        <div class="admin-card">
          <div class="admin-card-header">
            <h3>Paramètres de l'établissement</h3>
          </div>
          <div class="admin-card-content">
            <form id="admin-settings-form">
              <div class="admin-form-group">
                <label>Nom de l'établissement</label>
                <input type="text" id="establishment-name" class="admin-input" value="LYNAQE Sédhiou" />
              </div>
              <div class="admin-form-group">
                <label>Adresse</label>
                <input type="text" id="establishment-address" class="admin-input" value="Sénégal" />
              </div>
              <div class="admin-form-group">
                <label>Téléphone</label>
                <input type="text" id="establishment-phone" class="admin-input" value="+221 ..." />
              </div>
              <div class="admin-form-group">
                <label>Email</label>
                <input type="text" id="establishment-email" class="admin-input" value="contact@sunu-moyenne.sn" />
              </div>
              <button type="submit" class="admin-btn-primary">Enregistrer</button>
            </form>
          </div>
        </div>
      </section>
    `
  };

  // Déterminer quelle section afficher (par défaut dashboard)
  const currentSection = window.location.hash.replace('#', '') || 'dashboard';
  const SectionComponent = sectionMap[currentSection] || sectionMap.dashboard;

  wrapper.innerHTML = `
    ${sectionsHTML}
    <main class="admin-main">
      <div class="admin-toolbar">
        <h2>SUNU MOYENNE Administration</h2>
        <div class="admin-user-tools">
          <span class="admin-user-greeting">Bonjour, ${adminUser.full_name}</span>
          <button type="button" class="admin-btn" onclick="changePassword()">Changer mot de passe</button>
          <button type="button" class="admin-btn admin-btn-danger" onclick="logoutAdmin()">Déconnexion</button>
        </div>
      </div>
      <div id="admin-content">${SectionComponent}</div>
    </main>
  `;

  // Attacher les événements de navigation sidebar
  attachSidebarNavigation();

  // Attacher les événements du formulaire de paramètres
  attachSettingsForm();

  // Charger les données selon la section
  loadSectionData(currentSection);
}

/*
   Attacher les événements de navigation dans la sidebar
*/
function attachSidebarNavigation() {
  const links = document.querySelectorAll('.sidebar-nav-link');

  links.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();

      // Mettre à jour l'état actif
      links.forEach(l => l.classList.remove('is-active'));
      link.classList.add('is-active');

      const sectionId = link.dataset.section;
      loadSectionData(sectionId);
    });
  });
}

/*
   Charger les données d'une section
*/


function escapeAdminHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

function renderAdminUsersContent(data) {
  const users = Array.isArray(data?.users) ? data.users : [];

  const rows = users.map(user => `
    <tr>
      <td>${escapeAdminHtml(user.full_name)}</td>
      <td>${escapeAdminHtml(user.email)}</td>
      <td>${escapeAdminHtml(user.role_name)}</td>
      <td>${user.is_active ? 'Actif' : 'Inactif'}</td>
      <td>${user.last_login ? escapeAdminHtml(new Date(user.last_login).toLocaleString('fr-FR')) : 'Jamais connecté'}</td>
      <td>${user.must_change_password ? 'À modifier' : 'Configuré'}</td>
    </tr>
  `).join('');

  return `
    <div class="admin-card">
      <div class="admin-card-header">
        <h3>Gestion des administrateurs</h3>
      </div>
      <div class="admin-card-content">
        <div class="admin-table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Email</th>
                <th>Rôle</th>
                <th>Statut</th>
                <th>Dernière connexion</th>
                <th>Mot de passe</th>
              </tr>
            </thead>
            <tbody>
              ${rows || '<tr><td colspan="6">Aucun administrateur trouvé.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}
function renderSectionContent(sectionId, data) {
  const contentArea = document.getElementById('admin-content');
  if (!contentArea) return;

  const sectionMap = {
    dashboard: renderDashboardContent,
    students: renderStudentsContent,
    classes: renderClassesContent,
    'admin-users': renderAdminUsersContent
  };

  const renderer = sectionMap[sectionId];

  if (renderer) {
    contentArea.innerHTML = renderer(data);
    return;
  }

  if (sectionId === 'roles') {
    contentArea.innerHTML = `
      <div class="admin-card">
        <div class="admin-card-header">
          <h3>Rôles et permissions</h3>
        </div>
        <div class="admin-card-content">
          <p>La gestion des rôles et permissions n'est pas encore disponible.</p>
        </div>
      </div>
    `;
    return;
  }

  if (sectionId === 'settings') {
    contentArea.innerHTML = `
      <div class="admin-card">
        <div class="admin-card-header">
          <h3>Paramètres de l'établissement</h3>
        </div>
        <div class="admin-card-content">
          <p>La gestion des paramètres n'est pas encore disponible.</p>
        </div>
      </div>
    `;
    return;
  }

  contentArea.innerHTML = '<p>Section introuvable.</p>';
}

/*
   Charger les données du tableau de bord
*/
async function fetchAdminData(endpoint) {
  const response = await fetch(endpoint, {
    method: 'GET',
    credentials: 'same-origin',
    cache: 'no-store'
  });

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('Vous ne disposez pas des permissions nécessaires.');
    }
    throw new Error(data.error || 'Erreur lors du chargement des données.');
  }

  return data;
}

async function loadDashboardData() {
  const data = await fetchAdminData('/api/admin/overview');

  return {
    totalStudents: Number(data.stats?.students || 0),
    totalTeachers: Number(data.stats?.teachers || 0),
    totalClasses: Number(data.stats?.classes || 0),
    totalSchoolYears: Number(data.stats?.school_years || 0)
  };
}

async function loadStudentsData() {
  const data = await fetchAdminData('/api/admin/students');
  return Array.isArray(data.students) ? data.students : [];
}

async function loadClassesData() {
  const data = await fetchAdminData('/api/admin/classes');
  return Array.isArray(data.classes) ? data.classes : [];
}

/*
   Rendre le contenu élèves
*/
function renderStudentsContent(data) {
  const rows = data.map(student => `
    <tr>
      <td>${student.matricule || '—'}</td>
      <td>${student.last_name || '—'}</td>
      <td>${student.first_name || '—'}</td>
      <td>${student.class_name || 'Non affecté'}</td>
      <td>${student.school_year || '—'}</td>
      <td>
        <span class="status-badge ${student.is_active ? 'active' : 'inactive'}">
          ${student.is_active ? 'Actif' : 'Inactif'}
        </span>
      </td>
    </tr>
  `).join('');

  return `
    <div class="admin-card">
      <div class="admin-card-header">
        <h3>Liste des élèves</h3>
        <span>${data.length} élève(s)</span>
      </div>

      <div class="admin-table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Matricule</th>
              <th>Nom</th>
              <th>Prénom</th>
              <th>Classe</th>
              <th>Année scolaire</th>
              <th>Statut</th>
            </tr>
          </thead>

          <tbody>
            ${rows}
            ${data.length === 0
              ? '<tr><td colspan="6" style="text-align:center;">Aucun élève enregistré.</td></tr>'
              : ''}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/*
   Rendre le contenu classes
*/
function renderClassesContent(data) {
  const rows = data.map(cls => `
    <tr>
      <td>${cls.name || '—'}</td>
      <td>${cls.level || '—'}</td>
      <td>${Number(cls.student_count || 0)}</td>
      <td>${cls.school_year || '—'}</td>
      <td>
        <span class="status-badge ${cls.is_active ? 'active' : 'inactive'}">
          ${cls.is_active ? 'Active' : 'Inactive'}
        </span>
      </td>
    </tr>
  `).join('');

  return `
    <div class="admin-card">
      <div class="admin-card-header">
        <h3>Liste des classes</h3>
        <span>${data.length} classe(s)</span>
      </div>

      <div class="admin-table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Nom de la classe</th>
              <th>Niveau</th>
              <th>Effectif</th>
              <th>Année scolaire</th>
              <th>Statut</th>
            </tr>
          </thead>

          <tbody>
            ${rows}
            ${data.length === 0
              ? '<tr><td colspan="5" style="text-align:center;">Aucune classe enregistrée.</td></tr>'
              : ''}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/*
   Afficher un message d'erreur
*/
function showError(message) {
  // Créer ou mettre à jour la zone d'erreur
  let errorDiv = document.getElementById('admin-error-message');
  if (!errorDiv) {
    errorDiv = document.createElement('div');
    errorDiv.id = 'admin-error-message';
    errorDiv.style.cssText = 'background: rgba(217, 60, 60, 0.1); border: 1px solid var(--red-600); border-radius: 8px; padding: 12px; margin-bottom: 20px; color: var(--red-600);';
    const toolbar = document.querySelector('.admin-toolbar');
    if (toolbar) toolbar.parentNode.insertBefore(errorDiv, toolbar.nextSibling);
  }
  errorDiv.textContent = message;

  // Supprimer après 5 secondes
  setTimeout(() => {
    if (errorDiv.parentNode) {
      errorDiv.parentNode.removeChild(errorDiv);
    }
  }, 5000);
}

/*
   Gérer le changement de mot de passe
*/
function changePassword() {
  if (!adminUser) return;

  const wrapper = document.getElementById('admin-wrapper');
  if (!wrapper) return;

  wrapper.innerHTML = `
    <div class="admin-change-password-screen">
      <div class="admin-login-card">
        <h2>Changer votre mot de passe</h2>
        <p>Bienvenue ${adminUser.full_name}</p>
        <p>Votre mot de passe initial doit être modifié.</p>
        <form id="admin-change-password-form">
          <div class="admin-form-group">
            <label>Ancien mot de passe</label>
            <input type="password" id="old-password" required />
          </div>
          <div class="admin-form-group">
            <label>Nouveau mot de passe</label>
            <input type="password" id="new-password" required minlength="12" maxlength="128" />
          </div>
          <div class="admin-form-group">
            <label>Confirmer le mot de passe</label>
            <input type="password" id="confirm-password" required minlength="12" />
          </div>
          <div style="margin: 20px 0;">
            <button type="submit" class="admin-btn-primary">Modifier mon mot de passe</button>
            <button type="button" class="admin-btn-secondary" onclick="initAdmin()">Annuler</button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Attacher l'événement de soumission
  const form = document.getElementById('admin-change-password-form');
  if (form) {
    form.addEventListener('submit', handleChangePasswordSubmit);
  }
}

/*
   Gérer la soumission du changement de mot de passe
*/
async function handleChangePasswordSubmit(event) {
  event.preventDefault();

  const oldPassword = document.getElementById('old-password').value;
  const newPassword = document.getElementById('new-password').value;
  const confirmPassword = document.getElementById('confirm-password').value;

  if (newPassword !== confirmPassword) {
    showError('Les nouveaux mots de passe ne correspondent pas.');
    return;
  }

  if (newPassword.length < 12 || newPassword.length > 128) {
    showError('Le nouveau mot de passe doit contenir entre 12 et 128 caractères.');
    return;
  }

  if (!oldPassword) {
    showError('Saisis ton ancien mot de passe.');
    return;
  }

  const submitBtn = event.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Modification en cours...';

  try {
    const response = await fetch('/api/admin/change-password', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ oldPassword, newPassword })
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      showError('Modification impossible : ' + (data.error || 'Erreur inconnue'));
      return;
    }

    alert('Ton mot de passe a été modifié avec succès.');
    await initAdmin();

  } catch (error) {
    console.error('Erreur changement mot de passe :', error);
    showError('Erreur serveur lors du changement de mot de passe.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}
/*
 * Déconnexion de l'administrateur
 */
async function logoutAdmin() {
  try {
    const response = await fetch('/api/admin/logout', {
      method: 'POST',
      credentials: 'same-origin'
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      showError('La déconnexion a échoué.');
      return;
    }

    adminUser = null;

    showLoginScreen();

  } catch (error) {
    console.error('Erreur de déconnexion :', error);
    showError('Impossible de contacter le serveur.');
  }
}

