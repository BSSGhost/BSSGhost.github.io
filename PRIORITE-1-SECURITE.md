# Priorité 1 — authentification serveur (préparation staging)

## Changements préparés
- Le mot de passe professeur n'est plus vérifié par un hash SHA-256 embarqué dans `prof.js`.
- `POST /api/auth/login`, `GET /api/auth/me` et `POST /api/auth/logout` sont traités côté serveur.
- Mot de passe vérifié avec `scrypt` et comparaison à temps constant.
- Cookie de session HttpOnly, SameSite=Lax, Secure en production, expiration côté serveur.
- Limitation basique des tentatives de connexion par adresse IP.
- Aucune table ni donnée MySQL existante n'est modifiée par cette fonctionnalité.

## Configuration Render — staging uniquement
1. Dans un terminal local, exécuter `node scripts/generate-prof-password-hash.js`.
2. Copier la valeur produite directement dans la variable `PROF_PASSWORD_HASH` du service Render de staging. Ne pas la mettre dans Git, dans le code ou dans un message.
3. Vérifier que `NODE_ENV=production` est défini sur le service Render (HTTPS requis).
4. Le déploiement doit pointer vers une base de test, jamais vers la base de production lors des premiers essais.

## Limites à traiter avant de déclarer la priorité 1 entièrement terminée
- Cette première implémentation utilise un compte professeur partagé configuré par variable d'environnement : elle ne fournit pas encore des comptes individuels, ni les rôles administrateur/élève/parent.
- Les notes de l'espace professeur restent dans `localStorage`. Le serveur protège le formulaire de connexion, mais les données locales ne sont pas encore centralisées ni isolées par utilisateur. La protection complète des données exige les API et permissions côté serveur de la priorité suivante.
- Les sessions sont conservées en mémoire et seront invalidées au redémarrage/redéploiement. C'est volontaire pour ce premier palier; un stockage durable partagé est nécessaire si plusieurs instances sont utilisées.
- Le service actuel est un serveur HTTP Node natif. Le présent patch n'ajoute pas encore de protection CSRF par jeton, journaux d'audit, comptes individuels ou gestion de réinitialisation de mot de passe.
- Ne déployez pas en production avant validation complète en staging et revue du flux de données.

## Tests manuels de staging
- Sans `PROF_PASSWORD_HASH`, la connexion doit échouer avec un message de configuration.
- Un mot de passe incorrect doit retourner HTTP 401.
- Après 8 tentatives dans la fenêtre de 15 minutes, les tentatives suivantes doivent être limitées.
- Un mot de passe correct doit créer une session et `GET /api/auth/me` doit retourner `authenticated: true`.
- Après déconnexion, `GET /api/auth/me` doit retourner HTTP 401.
- Après redémarrage du serveur, l'ancienne session doit être invalide.
- Vérifier que le calculateur et les données locales existantes sont toujours présents dans le navigateur.
