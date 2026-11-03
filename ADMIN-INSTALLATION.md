# SUNU MOYENNE — Installation de l'administration et du socle scolaire

## État de cette version

Cette version contient :
- une authentification administrateur par sessions opaques stockées côté serveur ;
- un changement obligatoire du mot de passe initial ;
- un système de permissions par rôle ;
- une authentification professeur individuelle, avec sessions serveur, journal d'activité et changement obligatoire du mot de passe temporaire ;
- les premières API métier pour créer les années scolaires, classes, élèves, matières, professeurs et affectations ;
- le chargement et la synchronisation MySQL des classes, élèves, matières et notes de l'espace professeur ;
- un schéma SQL métier sans suppression de données, avec affectations par semestre et journal des actions professeur ;
- une consultation des moyennes centralisées et une sauvegarde complète téléchargeable réservée à l'administrateur principal ;
- un contrôle en lecture seule du schéma.

**Important :** le flux principal de classes/élèves/matières/notes est maintenant centralisé dans MySQL. Les préférences, notifications et outils secondaires restent locaux. Les bulletins PDF doivent encore être vérifiés visuellement et fonctionnellement sur une vraie base de test avant la production.

## 1. Préparer le projet

Dans PowerShell, depuis la racine du projet :

```powershell
npm install
Copy-Item .env.example .env
```

Renseigner uniquement les paramètres d'une base MySQL de TEST dans `.env` : `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.

Pour Aiven, activer TLS avec `DB_SSL=true`. En local, `DB_SSL_CA_PATH=certs/aiven-ca.pem` peut pointer vers le certificat CA. Sur Render, mettre le contenu PEM dans la variable secrète `DB_SSL_CA`. Ne jamais committer `.env` ni les certificats.

## 2. Créer une base de test

Créer une base séparée dont le nom contient `test`, `dev` ou `local` (par exemple `sunu_moyenne_test`). Ne pas utiliser `defaultdb` ni la base de production.

Dans PowerShell, après avoir configuré `.env` vers cette base de test :

```powershell
$env:ALLOW_TEST_SCHEMA_INSTALL = 'YES'
npm run install-test-schema
Remove-Item Env:ALLOW_TEST_SCHEMA_INSTALL
```

Le script refuse de s'exécuter sans confirmation explicite et refuse les bases dont le nom ne désigne pas clairement un environnement de test. Il crée le schéma administratif et le schéma scolaire. Les instructions SQL sont additives (`CREATE TABLE IF NOT EXISTS`, insertions initiales) et ne contiennent pas de `DROP`, `TRUNCATE` ou `DELETE`.

Attention : le DDL MySQL peut effectuer des validations/commits implicites. Le script n'est pas un mécanisme de rollback. Il faut toujours utiliser une base de test neuve.

## 3. Vérifier les tables

```powershell
npm run check-admin-schema
npm run check-school-schema
```

Ces deux commandes sont en lecture seule.

## 4. Initialiser les administrateurs

Choisir deux mots de passe temporaires distincts, de 12 caractères minimum. Ne pas les mettre dans un fichier ni les envoyer dans une conversation.

```powershell
$securePrincipal = Read-Host 'Mot de passe temporaire administrateur principal' -AsSecureString
$securePedagogical = Read-Host 'Mot de passe temporaire administrateur pédagogique' -AsSecureString
$ptrPrincipal = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePrincipal)
$ptrPedagogical = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePedagogical)
try {
  $env:ADMIN_PRINCIPAL_INITIAL_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptrPrincipal)
  $env:ADMIN_PEDAGOGICAL_INITIAL_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptrPedagogical)
  $env:ALLOW_ADMIN_INIT_TEST = 'YES'
  npm run init-admins
} finally {
  Remove-Item Env:ALLOW_ADMIN_INIT_TEST -ErrorAction SilentlyContinue
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptrPrincipal)
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptrPedagogical)
  Remove-Item Env:ADMIN_PRINCIPAL_INITIAL_PASSWORD -ErrorAction SilentlyContinue
  Remove-Item Env:ADMIN_PEDAGOGICAL_INITIAL_PASSWORD -ErrorAction SilentlyContinue
  $securePrincipal.Dispose(); $securePedagogical.Dispose()
}
```

Les deux mots de passe doivent être différents. Le script exige 12 à 128 caractères pour chacun. Il refuse toute base qui n'est pas explicitement nommée comme base de test et exige `ALLOW_ADMIN_INIT_TEST=YES`. Ne les inscris pas directement dans une commande PowerShell, un fichier ou un dépôt Git.

Comptes créés :
- `DEthiam@sunu-moyenne.com` — administrateur principal ;
- `Colonelgueye@sunu-moyenne.com` — administrateur pédagogique.

Le changement de mot de passe est obligatoire à la première connexion. Le script ne remplace jamais le hash d'un compte déjà initialisé.

## 5. Tester localement

```powershell
npm test
npm start
```

Ouvrir :
- `http://localhost:3000/admin/` pour l'administration ;
- `http://localhost:3000/` puis l'espace professeur pour vérifier la connexion individuelle.

Depuis l'administration, créer une année scolaire, une classe, des matières, un professeur, des élèves et les affectations classe/matière/professeur. Le mot de passe temporaire du professeur n'est affiché qu'au moment de la création ; le transmettre par un canal sécurisé. Le professeur devra le remplacer à sa première connexion.

## 6. Avant la production

Ne pas déployer tant que les tests d'intégration MySQL, la saisie réelle des notes dans l'espace professeur, les calculs de bulletins, les permissions et les sauvegardes/restaurations n'ont pas été validés sur la base de test.

Aucune migration ne doit être lancée sur Aiven `defaultdb` depuis cette procédure. Le passage en production fera l'objet d'une étape distincte après sauvegarde indépendante vérifiée.


## 7. Sauvegarde et restauration de test

Depuis l'administration avec le compte principal, utiliser **Télécharger une sauvegarde complète**. Le fichier contient les tables administratives et scolaires, y compris les hash des mots de passe, mais pas les sessions actives. Conserver le fichier dans un emplacement privé et chiffré.

Pour tester une restauration, utiliser une base de test neuve dont le nom contient `_test`, après installation du schéma. Puis :

```powershell
$env:ALLOW_TEST_RESTORE = 'YES'
npm run restore-test-backup -- .\sunu-moyenne-backup.json
Remove-Item Env:ALLOW_TEST_RESTORE
```

Le script refuse une base qui contient déjà des données scolaires, des sessions ou des administrateurs déjà initialisés. Il n'est pas destiné à une restauration directe en production. Aucune restauration en production ne doit être faite sans procédure spécifique et sauvegarde préalable.
