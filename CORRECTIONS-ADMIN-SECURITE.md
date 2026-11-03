# SUNU MOYENNE — Rapport de reprise technique

## Modifications de cette copie de travail

1. Authentification professeur déplacée côté serveur : comptes individuels, hash scrypt, sessions opaques en base, cookie HttpOnly, limitation des tentatives et changement obligatoire du mot de passe temporaire.
2. Raccordement de l'espace professeur au stockage MySQL central : chargement de l'espace, synchronisation transactionnelle des classes/élèves/matières/notes et contrôles des affectations.
3. Ajout d'un schéma MySQL métier : années scolaires, classes, élèves, inscriptions, professeurs, matières, semestres, affectations, notes et sessions.
4. Ajout d'API d'administration pour les années, classes, élèves, professeurs, matières, affectations et consultation des résultats calculés.
5. Refonte de `admin/index.html` pour appeler les API natives du serveur et afficher les données métier.
6. Ajout d'un lien discret vers `/admin/` dans le pied de page.
7. Ajout d'une politique de fichiers statiques qui bloque les fichiers cachés, `.env`, certificats, clés, SQL, sauvegardes et répertoires internes.
8. Ajout d'un installateur et d'un script de restauration réservés aux bases de test, ainsi que de contrôles en lecture seule des schémas.
9. Ajout d'une sauvegarde complète téléchargeable (données métier, comptes et journaux, sans sessions), d'un journal d'activité professeur et de deux mots de passe administrateurs distincts via variables temporaires.

## Tests exécutés

- `node --check server.js`
- `node --check prof.js`
- `node --check scripts/init-admins.mjs`
- `node --check scripts/check-school-schema.mjs`
- `node --check scripts/install-test-schema.mjs`
- `npm test` : 48 tests réussis, dont comparaison des calculs de moyennes centralisés avec les formules historiques.
- Test HTTP local : `/` et `/admin/` répondent 200 ; `/.env` et `/database/migrations/school-core.sql` répondent 404.

## Limites encore à lever avant production

- Le flux principal classes/élèves/matières/notes de l'espace professeur est raccordé à MySQL ; les préférences, notifications et outils secondaires restent locaux.
- Les formulaires d'édition détaillée, les tests visuels des bulletins PDF et les tests d'intégration sur un vrai serveur MySQL doivent encore être terminés.
- L'export complet et le script de restauration en base de test sont présents, mais la restauration réelle n'a pas encore été exécutée sur un serveur MySQL de test.
- Aucun test de connexion à Aiven ni déploiement Render n'a été réalisé ici.

## Sécurité

L'archive initiale contenait un `.env` renseigné et un certificat CA. Ils sont exclus de la copie livrable. Par précaution, changer le mot de passe MySQL Aiven si les identifiants de cette archive étaient actifs, puis actualiser `DB_PASSWORD` dans Render. Ne jamais transmettre `.env`, les mots de passe, jetons ou clés privées.

Aucune donnée de production n'a été modifiée.
