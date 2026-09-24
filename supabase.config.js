/*
   CONFIGURATION SUPABASE — SUNU MOYENNE (Espace professeur)
   La corbeille de l'espace professeur peut être synchronisée
   sur un projet Supabase (table « lynaqe_prof_trash »).

   Tant que url/anonKey sont vides, le site fonctionne 100 %
   en local (localStorage) : aucune requête n'est envoyée.

   Pour activer :
   1. Crée un projet sur https://supabase.com
   2. Dans le SQL Editor, exécute supabase-schema.sql
   3. Copie l'URL du projet et la clé « anon » (Settings →
      API) dans les deux champs ci-dessous.

   La clé anon est publique (côté navigateur) ; la sécurité
   réelle repose sur les Row Level Security policies de ta
   table (voir supabase-schema.sql).
*/
window.SUPABASE_CONFIG = {
  /* URL du projet, ex : "https://abcdefgh.supabase.co" */
  url: "",

  /* Clé API « anon » (publique), ex : "eyJhbGciOi..." */
  anonKey: "",

  /* Nombre maximum d'éléments gardés en corbeille. */
  trashLimit: 30,

  /* Durée de rétention (en jours) avant purge automatique. */
  trashRetentionDays: 30
};