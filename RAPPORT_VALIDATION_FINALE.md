# Rapport de validation finale — SUNU MOYENNE

Date : 2026-11-01

La validation utilise uniquement des données fictives et un environnement isolé. Aucune commande destructrice n’a été lancée sur Aiven/defaultdb ou sur une base de production.

## 1. Intégration MySQL réelle

### État initial
**PARTIELLEMENT VALIDÉ**

Le projet possède une base MySQL locale configurée mais la base configurée n’est pas nommée comme environnement de test/développement/local. Elle est donc considérée comme potentiellement de production et n’a pas été interrogée ni modifiée.

### Erreurs détectées
- Deux processus MySQL locaux sont présents, mais aucune base isolée nommée `test`, `dev` ou `local` n’a été découverte avec les paramètres disponibles.
- Les scripts de test utilisent des contrôles de sécurité qui empêchent l’installation sur `defaultdb` ou sur une base non identifiée comme isolée.
- La connexion locale standard utilisant root sans mot de passe est refusée ; aucun mot de passe n’a été demandé ni affiché.

### Fichiers corrigés
- Revue de toutes les connexions dans `server.js`, les scripts de migration, les scripts de contrôle et `db-ssl.js`.
- TLS vérifié avec validation stricte du certificat quand TLS est activé.
- Pool MySQL conservé et fermé correctement dans les scripts CLI.

### Tests exécutés
- Vérification locale de la présence d’un serveur MySQL : effectuée.
- Classification sans secrets de la base configurée : base configurée mais ni test, ni dev, ni local.
- Syntaxe et tests statiques SQL du dépôt : `48/48` réussis précédemment.
- Requêtes CRUD sur une base isolée vide : **non exécutées**, absence d’environnement MySQL isolé autorisé avec identifiants disponibles.
- Scénarios administrateur/professeur avec vraies données MySQL : **non exécutés** pour la même raison.

### Résultat
**NON VALIDÉ — intégration MySQL réelle.** Le code peut être préparé, mais le test de bout en bout exige une base de test séparée et ses identifiants privés via `.env`.

### Preuves disponibles
- Aucun journal ne contient de mot de passe ou secret.
- Les migrations restent additives et sont protégées contre `defaultdb`.
- Les commandes exactes sont fournies ci-dessous.

### Actions humaines restantes
1. Créer une base MySQL vide dont le nom contient `test`, par exemple `sunu_moyenne_test`.
2. Déposer les identifiants privés dans `.env` sans les committer.
3. Activer TLS et fournir uniquement le secret `DB_SSL_CA` sur Render si nécessaire.
4. Exécuter successivement les commandes documentées ci-dessous.

### Commandes
```powershell
Copy-Item .env.example .env
# Renseigner une base explicitement nommée *_test dans .env
$env:ALLOW_TEST_SCHEMA_INSTALL='YES'
npm run install-test-schema
Remove-Item Env:ALLOW_TEST_SCHEMA_INSTALL
npm run check-admin-schema
npm run check-school-schema
npm test
npm start
```

## 2. Sauvegarde et restauration MySQL

### État initial
**PARTIELLEMENT VALIDÉ**

La sauvegarde JSON HTTP est limitée aux administrateurs principaux et n’est pas exposée comme fichier statique. Elle vérifie une empreinte SHA-256 et exclut les sessions actives. Le script de restauration vérifie également les comptes et le caractère de la base cible, puis restaure dans une transaction.

### Erreurs détectées
- Une confirmation humaine d’intégration MySQL réelle n’était pas disponible.
- La restauration pouvait réussir sans rapport détaillé des nombres restaurés par table. Correction effectuée : comptage attendu/restauré après commit.
- Les sauvegardes anciennes ne contenaient pas de données détaillées de sessions ; les sessions ne sont volontairement pas restaurées et doivent être recréées.
- Une sauvegarde locale navigateur et une sauvegarde MySQL serveur coexistent ; elles ne doivent pas être confondues.

### Fichiers corrigés
- `scripts/restore-test-backup.mjs` : vérification post-restauration par table et message d’échec si les volumes diffèrent.
- Sauvegarde serveur conservée dans `server.js`, accessible uniquement au rôle principal.

### Tests exécutés
- Validation structurée de sauvegarde et checksum : implémentée dans le code.
- Test réel de sauvegarde MySQL : **NON VALIDÉ**, pas de base isolée accessible autorisée.
- Test réel de restauration : **NON VALIDÉ**, pas de base isolée accessible autorisée.
- Comparaison réelle des comptes, relations, notes, journaux : **NON VALIDÉ** pour la même raison.

### Résultat
**NON VALIDÉ — restauration MySQL réelle.**

### Procédure de sauvegarde
1. Se connecter avec l’administrateur principal.
2. Télécharger « Sauvegarde complète » depuis l’administration.
3. Vérifier l’application, la version et le checksum.
4. Stocker le fichier chiffré hors du serveur avec une copie indépendante.
5. Pour une sauvegarde physique, utiliser aussi le mécanisme d’Aiven avec point de restauration vérifié.

### Procédure de restauration
1. Créer une base totalement neuve contenant `test` dans le nom.
2. Installer les migrations administratives et scolaires.
3. Vérifier que les tables métier sont vides.
4. Vérifier le checksum du JSON localement ou par le script.
5. Lancer uniquement avec la confirmation explicite :

```powershell
$env:ALLOW_TEST_RESTORE='YES'
npm run restore-test-backup -- .\sunu-moyenne-backup.json
Remove-Item Env:ALLOW_TEST_RESTORE
```

Une restauration s’arrête si une table métier est déjà occupée, si le schéma est incomplet ou si les comptes sont déjà initialisés.

### Retour arrière
1. Arrêter les écritures applicatives.
2. Sauvegarder l’état actuel.
3. Restaurer uniquement sur une base de test neuve.
4. Vérifier les tables et le checksum.
5. Corriger les écarts avant de basculer l’application.
6. Réactiver les sessions et demander aux comptes concernés de se reconnecter.

## 3. Validation des bulletins PDF

### État initial
**PARTIELLEMENT VALIDÉ**

Le générateur PDF réel de `prof.js` utilise jsPDF, les calculs centralisés et prend en charge la pagination. Son PDF ne contenait pas de filigrane ni de zones explicites de signature.

### Erreurs détectées
- Ajout du filigrane subtil sur chaque page du bulletin réel dans `prof.js`.
- Ajout des lignes élève/responsable et professeur principal.
- Des démonstrations PDF automatisées ont été produites avec des données entièrement fictives.
- Le scénario multipage confirme maintenant une pagination sur deux pages avec 36 matières fictives.

### Fichiers corrigés
- `prof.js` : filigrane, pagination et espaces de signature du bulletin PDF.
- `scripts/generate-pdf-validation.mjs` : génération, ouverture, extraction textuelle et synthèse graphique.
- `package.json` : commande `validate-pdfs` et outils locaux de validation PDF.

### Tests exécutés
- `npm run validate-pdfs` : exécuté.
- 7 scénarios générés avec données fictives.
- Lecture et parsing PDF avec pdfjs.
- Vérification du nom élève, de l’ouverture du PDF, du nombre de pages et des caractères accentués.
- Comparaison mathématique avec `school-calculations.js` dans le générateur.

### Résultats
**PARTIELLEMENT VALIDÉ — generation et contrôles techniques.**

| Scénario | Pages | Moyenne | État |
|---|---:|---:|---|
| complete | 1 | 14.212 | Ouvert et vérifié |
| incomplete | 1 | — | Matière/semestre incomplet correctement masqué |
| multiple | 1 | 13.030 | Vérifié |
| coefficients | 1 | 13.196 | Vérifié |
| decimals | 1 | 14.625 | Vérifié |
| multipage | 2 | 12.062 | Vérifié |
| watermark | 1 | 14.781 | Vérifié |

Les démonstrations sont disponibles dans `validation-pdfs/`. Le rendu visuel complet dans Chrome et l’impression sur l’interface réelle restent à valider par l’utilisateur sur les navigateurs destinés aux professeurs.

### Preuves disponibles
- `validation-pdfs/*.pdf`
- `validation-pdfs/validation-results.json`
- `validation-pdfs/validation-synthese.png`
- `validation-pdfs/bulletin-complete-apercu.png`

### Fonctionnalités encore incomplètes
- Vérification sur navigateur réel avec le bouton PDF de l’espace professeur.
- Vérification de l’impression physique.
- Vérification du rendu PDF avec des polices intégrées spécifiques à la langue locale.
- Validation finale sur données réelles d’établissement effectuée uniquement par autorisation humaine.

## 4. Plan de mise en production existante

À soumettre à validation humaine, sans exécution automatisée :

1. Sauvegarder Aiven/defaultdb par le mécanisme Aiven.
2. Vérifier et enregistrer le checksum de la sauvegarde.
3. Installer les migrations sur une base de test conforme.
4. Exécuter le plan de tests MySQL et restaurations sur cette base.
5. Valider PDF visuel et signatures sur plusieurs navigateurs et tailles d’écran.
6. Examiner le diff Git et supprimer les archives de sauvegarde non nécessaires.
7. Configurer Render avec les variables `DB_*`, TLS, `PUBLIC_URL`, `ADMIN_SESSION_HOURS` et les secrets nécessaires.
8. Initialiser les deux administrateurs uniquement avec des mots de passe temporaires gérés hors du dépôt.
9. Déployer manuellement sur Render après validation humaine.
10. Exécuter les tests de fumée et surveiller les erreurs sans afficher de données personnelles ou secrets.

## 5. Tests automatisés finaux

Exécuter :

```powershell
npm test
npm run validate-pdfs
```

Résultats attendus à contrôler sur chaque machine ; dans cette session, les tests automatisés disponibles précédemment ont obtenu 48/48. Le statut de MySQL et des restaurations reste non validé tant qu’une base isolée autorisée ne produit pas un rapport réel.
