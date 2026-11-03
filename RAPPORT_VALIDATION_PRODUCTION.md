# Rapport final de validation de production — SUNU MOYENNE

Date : 2026-11-01

## A. MySQL

### Résultat

**PARTIELLEMENT VALIDÉ** : la configuration, les scripts protecteurs, les migrations et les tests automatisés ont été vérifiés ; les scénarios CRUD réels ne sont pas encore validés.

### Commandes exécutées

```powershell
Get-Service MySQL80
Get-CimInstance Win32_Service -Filter "Name='MySQL80'"
'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe' --protocol=TCP --host=127.0.0.1 --port=3306 --user=root --execute="SELECT VERSION() AS version"
```

Résultats exacts :
- Le service Windows `MySQL80` est en état `Running` et démarrage `Automatic`.
- La connexion TCP locale sans mot de passe avec l'utilisateur root a échoué avec `ERROR 1045 (28000): Access denied for root using password: NO`.
- Aucun profil `mysql_config_editor` utilisable n'a été trouvé.
- La configuration `.env` du projet pointe vers l'environnement Aiven externe et ne doit pas être utilisée pour ces tests locaux.

Cause de l’absence de validation réelle : les identifiants locaux MySQL ne sont pas disponibles et aucun mot de passe ne peut être demandé ou écrit dans le dépôt. La création de `sunu_moyenne_test` n'a donc pas été tentée. Aucun fichier de secret ni `defaultdb` n'ont été utilisés ou modifiés.

### Fichiers de protection vérifiés/corrigés

- [scripts/install-test-schema.mjs](scripts/install-test-schema.mjs)
- [scripts/restore-test-backup.mjs](scripts/restore-test-backup.mjs)
- [database/migrations/admin-system.sql](database/migrations/admin-system.sql)
- [database/migrations/school-core.sql](database/migrations/school-core.sql)
- [db-ssl.js](db-ssl.js)

Les scripts refusent une base Aiven, `defaultdb`, ainsi que toute base qui ne contient pas explicitement `test`, `dev` ou `local`. Aucune modification destructrice de schema n'a été utilisée.

### Intervention humaine indispensable et commandes exactes

À partir de l'outil configuré par l'administrateur local, fournir les identifiants à une session PowerShell isolée sans les afficher ni les conserver dans le dépôt :

```powershell
$env:DB_HOST='127.0.0.1'
$env:DB_PORT='3306'
$env:DB_USER='<utilisateur-local-autorise>'
Read-Host -AsSecureString 'Mot de passe' | ConvertFrom-SecureString | Set-Content $env:TEMP\sunu-password.txt
```

Le mot de passe doit ensuite être fourni au processus par la méthode approuvée par l'administrateur Windows/MySQL, sans écrire sa valeur dans ce rapport ni dans un fichier du dépôt. Une fois l'accès local confirmé, créer uniquement la base dédiée et vérifier son identité :

```sql
CREATE DATABASE sunu_moyenne_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = 'sunu_moyenne_test';
```

Puis, après validation humaine, installer les migrations :

```powershell
$env:DB_NAME='sunu_moyenne_test'
$env:ALLOW_TEST_SCHEMA_INSTALL='YES'
npm run install-test-schema
```

## B. Sauvegarde et restauration

### Résultat

**NON VALIDÉ** : le mécanisme a été examiné, mais aucune sauvegarde ni restauration MySQL réelle n'a pu être exécutée sans une base isolée accessible.

Le script de restauration vérifie le format, la version, le checksum SHA-256, le nom de la base, la présence du schéma, la vacuité des tables métier, les comptes initiaux et les nombres restaurés table par table. Il refuse toute écrasement et annule la transaction en cas d'erreur.

### Commandes préparées mais non exécutées

Après création humaine de `sunu_moyenne_test` :

```powershell
$env:DB_NAME='sunu_moyenne_test'
$env:ALLOW_TEST_SCHEMA_INSTALL='YES'
npm run install-test-schema
# Générer la sauvegarde via l'API du serveur, réservée à l'administrateur principal.
$env:ALLOW_TEST_RESTORE='YES'
npm run restore-test-backup -- chemin\vers\sauvegarde.json
```

La restauration doit viser une seconde base neuve explicitement nommée de test/dev/local, jamais `defaultdb` ni Aiven.

### Preuves disponibles

- Implémentation de sauvegarde [server.js](server.js)
- Implémentation de restauration [scripts/restore-test-backup.mjs](scripts/restore-test-backup.mjs)
- Aucune base isolée autorisée n'a été disponible ; aucun dump ni checksum n'est donc déclaré réussi.

## C. Bulletins PDF

### Résultat

**PARTIELLEMENT VALIDÉ** : génération, ouverture technique, extraction du texte, 7 scénarios, moyennes centralisées et pagination ont été exécutés dans Playwright/Chromium. Le téléchargement réel depuis le bouton de l'application en navigateur Chrome, l'impression physique et une validation visuelle humaine de toutes les pages restent à compléter.

### Commandes exécutées

```powershell
npm run validate-pdfs
node scripts/generate-pdf-validation.mjs
npm test
```

Résultats :
- 48 tests automatisés réussis, 0 échec.
- 7 PDF générés sous `validation-pdfs`.
- Tous les PDF ont été lus par pdfjs-dist.
- Accents, présence du nom de l'élève et ouverture vérifiées pour chaque démonstration.
- Le scénario multipage contient 36 matières et produit 2 pages.

### Résultats mathématiques

| Démonstration | Moyenne générale | Résultat attendu par moteur centralisé |
|---|---:|---:|
| complete | 14,212 | Conforme |
| incomplete | masquée | Conforme |
| multiple | 13,030 | Conforme |
| coefficients | 13,195714285714287 | Conforme |
| decimals | 14,625 | Conforme |
| multipage | 12,062444444444443 | Conforme |
| watermark | 14,78125 | Conforme |

### Preuves

- [validation-pdfs/complete.pdf](validation-pdfs/complete.pdf)
- [validation-pdfs/incomplete.pdf](validation-pdfs/incomplete.pdf)
- [validation-pdfs/multiple.pdf](validation-pdfs/multiple.pdf)
- [validation-pdfs/coefficients.pdf](validation-pdfs/coefficients.pdf)
- [validation-pdfs/decimals.pdf](validation-pdfs/decimals.pdf)
- [validation-pdfs/multipage.pdf](validation-pdfs/multipage.pdf)
- [validation-pdfs/watermark.pdf](validation-pdfs/watermark.pdf)
- Capture Chrome réelle de l'écran professeur : [validation-pdfs/prof-login-chrome.png](validation-pdfs/prof-login-chrome.png)

Le script a été corrigé pour fournir à pdfjs un serveur local HTTP temporaire servant les polices standard. Le moteur centralisé reste inchangé. Une dernière relance enregistre encore des avertissements de chargement des polices LiberationSans par pdfjs-dist en Node; malgré ces avertissements, les 7 PDF sont ouverts, le texte est extrait et les moyennes sont analysées. L'embedding/rendu visuel des polices dans les PDF doit donc être confirmé manuellement dans Chrome. Ce point ne doit pas être confondu avec un échec visuel du PDF lui-même.

## Validation navigateur réelle

Commande : lancement local `node server.js`, puis navigateur Chrome sur `http://127.0.0.1:3000/#professeur`.

Résultats exacts :
- Page principale HTTP 200.
- Page professeur affichée avec adresse e-mail, mot de passe et bouton « Se connecter ».
- Capture conservée.
- Connexion administrateur/professeur réelle : NON VALIDÉE faute de base isolée et de compte fictif autorisé.
- Téléchargement PDF depuis l'application réelle : NON VALIDÉ.
- Impression navigateur réelle : NON VALIDÉE.
- Aucune intervention n'a été faite sur une donnée réelle, sur Aiven ni sur Render.

## Corrections réalisées dans cette phase

- Ajout du paramètre `standardFontDataUrl` dans le générateur PDF.
- Régénération des 7 démonstrations PDF.
- Capture Chrome de l'espace professeur.

## Interventions humaines restantes

1. Autoriser un utilisateur MySQL local sans secret partagé dans le chat.
2. Confirmer la création isolée de `sunu_moyenne_test`.
3. Fournir temporairement des identifiants locaux au processus de validation, hors dépôt et sans impression.
4. Valider un jeu de données fictives pour les tests admin/professeur.
5. Effectuer la restauration sur une seconde base de test neuve avec sauvegarde réelle et checksum.
6. Tester le bouton PDF réel et l'impression dans Chrome sur un compte fictif.
7. Valider explicitement chaque PDF visualisé, puis préparer un plan de production séparé.
