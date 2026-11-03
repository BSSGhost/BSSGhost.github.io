# Rapport final de validation — SUNU MOYENNE

Date : 2026-11-01

## Règles appliquées

- Aucune modification Aiven/defaultdb.
- Aucun mot de passe demandé, affiché, journalisé ou écrit dans le dépôt.
- Aucun script SQL non lié à une base test isolée exécuté.

## 1. Accès MySQL local

### Statut : NON VALIDÉ

Commandes exécutées :

```powershell
Get-Service MySQL80
'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe' --protocol=TCP --host=127.0.0.1 --port=3306 --user=root --execute="SELECT VERSION() AS version"
'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe' --protocol=PIPE --execute="SELECT CURRENT_USER() AS current_user, VERSION() AS version"
```

Résultats :
- Le service Windows MySQL80 est actif.
- L'accès TCP root sans mot de passe retourne `ERROR 1045 (28000): Access denied for user 'root'@'localhost' (using password: NO)`.
- Aucune tentative de contournement ou de réinitialisation n'a été effectuée.
- Aucun canal local autorisé n'a été identifié dans les profils automatiquement accessibles.
- Le seul profil Windows lié à MySQL trouvé concerne Aiven et n'a pas été consulté ni utilisé.

### Compte dédié recommandé

Après intervention humaine par l'administrateur local disposant déjà des droits MySQL :

```sql
CREATE USER IF NOT EXISTS 'sunu_test_runner'@'localhost' IDENTIFIED BY '<mot de passe défini hors dépôt>'; 
CREATE DATABASE IF NOT EXISTS sunu_moyenne_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON sunu_moyenne_test.* TO 'sunu_test_runner'@'localhost';
REVOKE ALL PRIVILEGES ON sunu_moyenne_test.* FROM 'sunu_test_runner'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP, REFERENCES ON sunu_moyenne_test.* TO 'sunu_test_runner'@'localhost';
FLUSH PRIVILEGES;
SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = 'sunu_moyenne_test';
```

Le compte local ne doit pas recevoir de droits sur `mysql`, `defaultdb`, ou toute autre base. Le mot de passe réel ne doit pas apparaître dans cette procédure, dans Git ou dans le rapport.

## 2. Tests MySQL et CRUD

### Statut : NON VALIDÉ

Impossible tant que l'administrateur MySQL local n'a pas créé le compte dédié. Aucun scénario MySQL réel n'a été exécuté. Aucun essai n'a été porté sur Aiven/defaultdb. Intervention humaine autorisée par l'utilisateur, en attente d'exécution locale.

Commandes préparées après autorisation humaine :

```powershell
$env:DB_HOST='127.0.0.1'
$env:DB_PORT='3306'
$env:DB_USER='sunu_test_runner'
$env:DB_NAME='sunu_moyenne_test'
$env:ALLOW_TEST_SCHEMA_INSTALL='YES'
npm run install-test-schema
npm test
```

Vérifications attendues :
18 tables métier prévues, clés étrangères, CRUD admin/professeur, persistance des notes et calcul centralisé.

## 3. Sauvegarde et restauration réelle

### Statut : NON VALIDÉ

Aucune base isolée accessible et aucune sauvegarde/restauration réelle exécutée.

Sauvegarde prévue après tests réussis :

```powershell
$env:DB_NAME='sunu_moyenne_test'
# Sauvegarde via l'API HTTP réservée à l'administrateur principal.
Get-FileHash -Algorithm SHA256 chemin\sauvegarde.json
```

Restauration prévue uniquement sur une base vide créée explicitement :

```sql
CREATE DATABASE sunu_moyenne_restore_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME='sunu_moyenne_restore_test';
```

Puis :

```powershell
$env:DB_NAME='sunu_moyenne_restore_test'
$env:ALLOW_TEST_RESTORE='YES'
npm run restore-test-backup -- chemin\sauvegarde.json
```

## 4. PDF dans Chrome

### Statut : PARTIELLEMENT VALIDÉ

Tests réellement exécutés :
- Les 7 PDF ont été régénérés et ouverts.
- Les textes et noms d'élèves ont été extraits avec pdfjs.
- La pagination, les accents et les moyennes ont été analysés.
- Le site local a été lancé et la page professeur ouverte dans Chrome.

Commande réellement exécutée :

```powershell
npm run validate-pdfs
npm test
node server.js
```

Résultats :
- 48 tests réussis, 0 échec.
- 7 PDF présents dans `validation-pdfs`.
- Le scénario multipage produit 2 pages sur 36 matières.
- Capture Chrome de la connexion professeur disponible.

Non validés dans Chrome réel :
- Connexion professeur avec compte fictif, faute de base isolée.
- Bouton réel de téléchargement du bulletin.
- Ouverture complète et inspection visuelle finale du PDF téléchargé.
- Aperçu impression et impression physique.

## 5. Corrections de cette phase

Aucune donnée ni formule scolaire modifiée.
- Le générateur PDF a été corrigé pour fournir des polices standard locales à pdfjs.
- Les démonstrations PDF ont été régénérées.

## 6. Interventions humaines restantes

1. Utiliser une session administrateur MySQL locale déjà autorisée pour créer `sunu_moyenne_test` et un compte limité.
   L'administrateur doit exécuter les instructions SQL de la section 1, puis communiquer le mot de passe au processus via un mécanisme sécurisé, sans le saisir dans le chat ni l'écrire dans Git.
2. Après cette création, relancer les validations locales ; aucune Aiven/defaultdb ne sera consultée.
3. Valider les données fictives admin/professeur.
4. Confirmer les PDF téléchargés depuis l'application réelle dans Chrome.
