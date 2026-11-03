#!/usr/bin/env python3
with open('C:\\Users\\BSS_Ghost\\Documents\\CalculMoyenne\\server.js', 'r', encoding='utf8') as f:
    content = f.read()

# Remplacer la ligne "return handleAdminRoute(req, res);" par la logique de route inline
# Cette logique gérait : /me, /change-password, /users, /audit/logs, et le principalOnly check

old_line = "    return handleAdminRoute(req, res);"
new_code = '''    // Gestion des routes administration après authentification
    const routePath = url.pathname;
    
    // Route profil
    if (routePath === '/api/admin/me' && req.method === 'GET') {
      return handleMe(req, res);
    }
    
    // Route changement mot de passe
    if (routePath === '/api/admin/change-password' && req.method === 'POST') {
      return handleChangePassword(req, res);
    }
    
    // Vérifier que c'est un administrateur principal
    if (req.admin.role !== 1) {
      return json(res, 403, { error: 'droits_insuffisants', message: 'Seul l administrateur principal peut effectuer cette action' });
    }
    
    // Liste des administrateurs
    if (routePath === '/api/admin/users' && req.method === 'GET') {
      return handleListAdmins(req, res);
    }
    
    // Créer un administrateur
    if (routePath === '/api/admin/users' && req.method === 'POST') {
      return handleCreateAdmin(req, res);
    }
    
    // Modifier un administrateur
    if (routePath.match(/\/api\/admin\/users\/\d+/) && req.method === 'PUT') {
      return handleUpdateAdmin(req, res);
    }
    
    // Désactiver un administrateur
    if (routePath.match(/\/api\/admin\/users\/\d+\/disable/) && req.method === 'PUT') {
      return handleDisableAdmin(req, res);
    }
    
    // Réactiver un administrateur
    if (routePath.match(/\/api\/admin\/users\/\d+\/enable/) && req.method === 'PUT') {
      return handleEnableAdmin(req, res);
    }
    
    // Journal dactivité
    if (routePath === '/api/admin/audit/logs' && req.method === 'GET') {
      return handleAuditLogs(req, res);
    }
    
    // Route par défaut non trouvée
    return json(res, 404, { error: 'route_invalide', message: 'Route administration non trouvee' });'''

# Vérifier si l'ancienne ligne existe
if old_line in content:
    content = content.replace(old_line, new_code)
    with open('C:\\Users\\BSS_Ghost\\Documents\\CalculMoyenne\\server.js', 'w', encoding='utf8') as f:
        f.write(content)
    print("Routes corrigées avec succès !")
else:
    print("Ligne introuvable, contenu actuel autour de la ligne 500 :")
    # Afficher le contexte
    lines = content.split('\n')
    for i in range(495, min(510, len(lines))):
        print(f"{i}: {lines[i]}")