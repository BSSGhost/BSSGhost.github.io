# SUNU MOYENNE — Rapport final d’audit

Date : 2026-11-01

## 1. État général

Audit réalisé sur les fichiers JavaScript, SQL, tests, interfaces, scripts et configuration du dépôt. Les modifications préexistantes ont été conservées. Les calculs scolaires et les bulletins PDF existants n’ont pas été remplacés.

## 2. Erreurs détectées et corrections

### Critiques
- La synchronisation espace professeur désactivait globalement les accès et affectations, puis réinscrivait/désinscrivait des élèves depuis le client. **Corrigé :** suppression des désactivations globales, synchronisation limitée aux classes autorisées côté serveur et refus des classes non attribuées.
- Certaines installations pouvaient démarrer sans MySQL en production ; la vérification de configuration RESTE active pour l’environnement production.
- Les modules Express du backend référenceient des dépendances absentes du manifeste. **Corrigé :** dépendances ajoutées au package.

### Élevées
- Plusieurs routes administratives Express renvoyaient `error.message`, pouvant exposer des détails SQL/serveur. **Corrigé :** réponses génériques et journalisation serveur.
- Le service JWT utilisait un secret par défaut en dur. **Corrigé :** `JWT_SECRET` devient obligatoire lorsqu’il est utilisé ; aucun fallback secret.
- `json`, `pool` et l’initialisation de la couche Express étaient incomplets dans le backend parallèle. **Corrigé partiellement/complètement :** fonctions utilitaires et injection de pool ajoutées.
- Contrôle principal Express basé sur `role !== 1` au lieu du nom de rôle. **Corrigé :** contrôle sur `principal`.

### Moyennes/faibles
- Le chemin changement de mot de passe pouvait être bloqué par le middleware Express. **Corrigé :** `/change-password` autorisé pendant le changement obligatoire.
- Les scripts, migrations et documentation distinguent les bases de test des bases de production.

## 3. Fichiers corrigés pendant cet audit

- `server.js` : synchronisation professeur sécurisée.
- `package.json`, `package-lock.json` : dépendances backend déclarées.
- `backend/routes/admin.routes.js` : rôles et erreurs internes sécurisés.
- `backend/services/auth.service.js` : secret JWT obligatoire et pool explicite.
- `backend/middleware/adminAuth.js` : réponse JSON, pool et changement obligatoire.
- `backend/middleware/permissions.js` : réponse JSON.

Les fichiers et modifications déjà présents avant l’audit ont été conservés.

## 4. Fonctionnalités vérifiées dans les tests

- Authentification professeur et sessions opaques ;
- synchronisation professeur et API administrateur ;
- gestion additive des référentiels ;
- sauvegarde réservée à l’administrateur principal ;
- calcul centralisé, coefficients, quarts de point et matière incomplète ;
- relations SQL et absence d’instructions destructives dans les migrations ;
- protection statique des chemins sensibles ;
- simulation d’élève sans modification du stockage ;
- génération locale des listes, tendances et notifications.

## 5. Tests exécutés

- `npm test` : **48 tests réussis, 0 échec**.
- Vérifications `node --check` de `server.js` et des modules backend : **succès**.
- Démarrage `npm start` puis `HEAD /` et `HEAD /admin/` : **HTTP 200**.
- Intégration MySQL réelle : **non exécutée**, conformément à l’interdiction de modifier une base Aiven/defaultdb ou une base de production.
- Tests de restauration MySQL réelle : **non exécutés sans base de test approuvée**.

## 6. Scripts SQL à examiner

Ordre recommandé sur une base de TEST neuve et sauvegardée :

1. `database/migrations/admin-system.sql` ;
2. `database/migrations/school-core.sql`.

Consulter également les scripts de test dans `scripts/install-test-schema.mjs` et `scripts/check-*-schema.mjs`. Aucun script SQL ou migration n’a été exécuté sur Aiven/defaultdb.

## 7. Configuration Render

Variables obligatoires :

- `NODE_ENV=production`
- `PORT` : gérer par Render
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `DB_SSL=true`
- `DB_SSL_CA` ou `DB_SSL_CA_PATH`
- `PUBLIC_URL`
- `ADMIN_SESSION_HOURS`
- `JWT_SECRET` si les modules Express JWT sont réellement utilisés

Ne jamais placer les secrets dans les fichiers commités. `DB_SSL_CA` peut contenir le PEM ; ne pas l’afficher dans les journaux ou les rapports.

Commande Render : `npm install && npm start` ou simplement le build Render suivi de `npm start`. Aucun déploiement automatique n’a été lancé par cet audit.

## 8. Initialisation des deux administrateurs

Utiliser seulement une base explicitement nommée de test et le script sécurisé `scripts/init-admins.mjs` décrit dans `ADMIN-INSTALLATION.md`. Les comptes visés sont :

- `DEthiam@sunu-moyenne.com` — principal ;
- `Colonelgueye@sunu-moyenne.com` — pédagogique.

Fournir les mots de passe temporaires uniquement par variables d’environnement locales, les transmettre par un canal sécurisé et supprimer les variables après exécution. Ne pas les inscrire dans le dépôt ni dans le rapport. Le script exige deux mots de passe différents et impose le changement à la première connexion.

## 9. Sauvegarde et restauration

Avant toute migration ou déploiement, effectuer une sauvegarde via l’administration principale et vérifier indépendamment le fichier hors ligne, puis :

1. sauvegarder toute la base avec `mysqldump --single-transaction --routines --events` ;
2. chiffrer le fichier ;
3. conserver au moins une copie hors du serveur ;
4. tester la restauration sur une base de test neuve ;
5. confirmer les comptes, classes, élèves, notes, affectations et journaux ;
6. seulement après validation humaine, autoriser le déploiement de l’application.

La restauration doit s’arrêter sur toute table ou donnée déjà existante non prévue, et ne doit jamais écraser defaultdb.

## 10. Déploiement sécurisé

1. Sauvegarder la base actuelle.
2. Appliquer les migrations sur une base de test conforme.
3. Vérifier les permissions, le changement de mot de passe, les bulletins, les notes et la synchronisation professeur.
4. Revoir le diff Git et les secrets.
5. Configurer Render sur les variables ci-dessus.
6. Déployer manuellement.
7. Tester `/`, `/admin/`, les sessions, les API, puis les opérations métier principales.
8. Surveiller les journaux sans conserver de mots de passe ou contenus sensibles.
9. Ne pas déployer tant que l’intégration MySQL humaine sur test n’est pas validée.

## 11. Interventions humaines requises

- Fournir un accès contrôlé à une base MySQL de test, sans exposer les mots de passe.
- Fournir le PEM Aiven par secret Render uniquement si nécessaire.
- Définir `JWT_SECRET` dans Render si les composants Express legacy sont montés ultérieurement.
- Examiner le DDL SQL sur la base de test avant toute application en production.
- Valider visuellement les PDF, les filigranes et les bulletins sur données de test représentatives.
- Valider les procédures de sauvegarde/restauration, puis sauvegarder Aiven avant une future migration.
- Valider les droits du professeur avec les affectations réelles.

## 12. Fonctionnalités encore incomplètes

- Intégration MySQL de bout en bout et restauration réelles non exécutées ici.
- Validation visuelle des PDF sur environnements de navigateur réels.
- Les modules Express parallèles ne sont pas montés par le serveur natif et doivent être conservés comme alternative à intégrer ou comme couche legacy à documenter.
- L’initialisation de production des administrateurs reste une opération humaine explicite sur la base validée.

## 13. Conclusion

Le dépôt est syntaxiquement valide et les 48 tests automatisés disponibles passent. Les corrections de sécurité et de synchronisation appliquées protègent mieux les données. Une mise en production est possible uniquement après validation humaine sur une base de test, sauvegarde indépendante et tests PDF/MySQL supplémentaires.
