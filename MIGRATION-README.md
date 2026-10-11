# Migration de notes — SUNU MOYENNE

## 1. Installer les dépendances

```bash
npm install
```

## 2. Créer la base MySQL

Exécuter `migration.sql` dans MySQL.

Le serveur peut aussi créer automatiquement la table `migrations` si la base existe déjà.

## 3. Configurer les variables

Copier `.env.example` vers `.env`, puis renseigner le mot de passe MySQL.

```text
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=VOTRE_MOT_DE_PASSE
DB_NAME=sunu_moyenne
```

Ne jamais publier `.env` sur GitHub.

## 4. Lancer

```bash
npm start
```

## 5. Fonctionnement

- Les notes existantes restent dans `localStorage`.
- « Créer mon lien de migration » envoie une copie des notes au serveur.
- Le serveur crée un code aléatoire, stocké uniquement sous forme de hash SHA-256.
- Le lien expire après 24 h par défaut.
- L'importation est à usage unique : la migration est supprimée après récupération.
- Le profil élève et l'objectif personnel sont également transférés.

## 6. Render

Sur Render, garder `npm start` comme Start Command et renseigner les variables MySQL dans Environment Variables : `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.

La base MySQL doit être hébergée sur un serveur accessible depuis Render ; le MySQL installé sur votre PC ne doit pas servir de base de production.
