-- =========================================================
-- SUNU MOYENNE — Schéma Supabase (Espace professeur / Corbeille)
-- ----------------------------------------------------------
-- Table : lynaqe_prof_trash
--   Corbeille synchronisée de l'espace professeur.
--   Chaque appareil (owner_id) possède SA propre corbeille,
--   dans la limite de 30 éléments et 30 jours de rétention
--   (purge effectuée côté client ET côté serveur ci-dessous).
--
-- ⚠️ Le site est hébergé en statique, avec une clé « anon »
-- publique : l'isolation par appareil repose sur l'en-tête
-- personnalisé « X-Owner-Id » envoyé par le client. Ce n'est
-- PAS une authentification — pour un usage multi-professeurs
-- sécurisé, branchez Supabase Auth (auth.uid()) et remplacez
-- le current_setting(...) par auth.uid()::text.
-- =========================================================

-- --------------------------------------------------------------------
-- 1. Table principale
-- --------------------------------------------------------------------
create table if not exists public.lynaqe_prof_trash (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,              -- identifiant de l'appareil (généré côté client)
  payload jsonb not null,              -- instantané complet de l'élément corbeille
  deleted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Index : lecture rapide par appareil, tri par date de suppression
create index if not exists lynaqe_prof_trash_owner_idx
  on public.lynaqe_prof_trash (owner_id, deleted_at desc);

-- --------------------------------------------------------------------
-- 2. Row Level Security
-- --------------------------------------------------------------------
alter table public.lynaqe_prof_trash enable row level security;

-- Référence à l'en-tête « X-Owner-Id » envoyé par le site (voir
-- supabase.config.js / prof.js). En production, remplacer par auth.uid().
create or replace function public.required_prof_owner()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.headers', true)::jsonb ->> 'x-owner-id', ''),
    'public'
  );
$$;

-- Lecture : chaque appareil ne voit que ses propres éléments.
create policy "lynaqe_prof_trash_select_own"
  on public.lynaqe_prof_trash
  for select
  using (owner_id = public.required_prof_owner());

-- Insertion : autorisée pour la clé anon (prototype scolaire).
create policy "lynaqe_prof_trash_insert_any"
  on public.lynaqe_prof_trash
  for insert
  with check (owner_id is not null);

-- Suppression : l'appareil ne supprime que ses éléments.
create policy "lynaqe_prof_trash_delete_own"
  on public.lynaqe_prof_trash
  for delete
  using (owner_id = public.required_prof_owner());

-- --------------------------------------------------------------------
-- 3. Purge automatique du serveur (30 jours)
--    Exécutée toutes les heures par le scheduler de Supabase
--    (point 4 ci-dessous).
-- --------------------------------------------------------------------
create or replace function public.purge_expired_trash()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.lynaqe_prof_trash
  where deleted_at < now() - interval '30 days';
end;
$$;

-- --------------------------------------------------------------------
-- 4. Planification (si tu utilises l'onglet "Database → Scheduling" :
--    crée un scheduled job qui appelle public.purge_expired_trash()
--    toutes les heures). Exemple de requête ONCE/CRON :
--
--    select cron.schedule('purge-corbeille', '0 * * * *',
--      $$select public.purge_expired_trash()$$);
-- --------------------------------------------------------------------