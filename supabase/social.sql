-- ============================================================
--  LOOKSMAX OS — couche sociale (amis)
--  À coller dans : Supabase → ton projet → SQL Editor → Run
--  (à exécuter APRÈS schema.sql)
-- ============================================================
--
--  Principe : on n'ouvre JAMAIS l'accès à la table user_data, qui reste
--  strictement privée. Chaque utilisateur publie un « instantané » choisi
--  dans public.profiles, et seuls ses amis acceptés peuvent le lire.
--  Ce qui n'est pas publié n'est visible de personne.

-- ─── Instantané public d'un utilisateur ──────────────────────
create table if not exists public.profiles (
  user_id    uuid        primary key references auth.users (id) on delete cascade,
  pseudo     text        not null default '',
  bio        text        not null default '',
  avatar     text,                       -- data URI, ~20 Ko
  stats      jsonb       not null default '{}'::jsonb,  -- score, rang, streak…
  habits     jsonb,                      -- null = non partagé
  goals      jsonb,                      -- null = non partagé
  photos     jsonb,                      -- null = non partagé (avant/après)
  updated_at timestamptz not null default now()
);

-- Recherche par pseudo (préfixe), insensible à la casse.
create index if not exists profiles_pseudo_idx
  on public.profiles (lower(pseudo) text_pattern_ops);

-- ─── Liens d'amitié ──────────────────────────────────────────
create table if not exists public.friendships (
  id         uuid        primary key default gen_random_uuid(),
  demandeur  uuid        not null references auth.users (id) on delete cascade,
  destinataire uuid      not null references auth.users (id) on delete cascade,
  statut     text        not null default 'en_attente'
             check (statut in ('en_attente', 'accepte')),
  created_at timestamptz not null default now(),
  constraint pas_soi_meme check (demandeur <> destinataire),
  constraint lien_unique unique (demandeur, destinataire)
);

create index if not exists friendships_demandeur_idx   on public.friendships (demandeur);
create index if not exists friendships_destinataire_idx on public.friendships (destinataire);

-- ─── Deux comptes sont-ils amis ? ────────────────────────────
create or replace function public.sont_amis(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.friendships f
    where f.statut = 'accepte'
      and ((f.demandeur = a and f.destinataire = b)
        or (f.demandeur = b and f.destinataire = a))
  );
$$;

-- ─── RLS : profils ───────────────────────────────────────────
alter table public.profiles enable row level security;

drop policy if exists "profil visible par soi et ses amis" on public.profiles;
drop policy if exists "creation de son propre profil"      on public.profiles;
drop policy if exists "mise a jour de son propre profil"   on public.profiles;
drop policy if exists "suppression de son propre profil"   on public.profiles;

create policy "profil visible par soi et ses amis"
  on public.profiles for select
  using (auth.uid() = user_id or public.sont_amis(auth.uid(), user_id));

create policy "creation de son propre profil"
  on public.profiles for insert
  with check (auth.uid() = user_id);

create policy "mise a jour de son propre profil"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "suppression de son propre profil"
  on public.profiles for delete
  using (auth.uid() = user_id);

-- ─── RLS : liens d'amitié ────────────────────────────────────
alter table public.friendships enable row level security;

drop policy if exists "voir ses propres liens"        on public.friendships;
drop policy if exists "envoyer une demande"           on public.friendships;
drop policy if exists "repondre a une demande recue"  on public.friendships;
drop policy if exists "retirer un lien"               on public.friendships;

create policy "voir ses propres liens"
  on public.friendships for select
  using (auth.uid() = demandeur or auth.uid() = destinataire);

-- On ne peut créer qu'une demande dont on est l'auteur, et seulement en attente.
create policy "envoyer une demande"
  on public.friendships for insert
  with check (auth.uid() = demandeur and statut = 'en_attente');

-- Seul le destinataire accepte.
create policy "repondre a une demande recue"
  on public.friendships for update
  using (auth.uid() = destinataire)
  with check (auth.uid() = destinataire);

-- Chacun des deux peut rompre le lien (ou annuler sa demande).
create policy "retirer un lien"
  on public.friendships for delete
  using (auth.uid() = demandeur or auth.uid() = destinataire);

-- ─── Recherche d'un compte par pseudo ────────────────────────
--  SECURITY DEFINER pour contourner la RLS des profils, mais ne renvoie que
--  l'identifiant, le pseudo et l'avatar — jamais les statistiques ni les
--  photos. Trois caractères minimum et dix résultats maximum : on peut
--  retrouver quelqu'un, pas aspirer l'annuaire.
create or replace function public.chercher_profils(recherche text)
returns table (user_id uuid, pseudo text, avatar text)
language sql
stable
security definer
set search_path = public
as $$
  select p.user_id, p.pseudo, p.avatar
  from public.profiles p
  where length(trim(recherche)) >= 3
    and p.user_id <> auth.uid()
    and lower(p.pseudo) like lower(trim(recherche)) || '%'
  order by p.pseudo
  limit 10;
$$;

grant execute on function public.chercher_profils(text) to authenticated;
grant execute on function public.sont_amis(uuid, uuid)  to authenticated;

-- Horodatage automatique du profil.
create or replace function public.touch_profiles()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch
  before update on public.profiles
  for each row execute function public.touch_profiles();

-- ─── Identités des comptes liés ──────────────────────────────
--  Une demande d'ami doit dire QUI la envoie. Or le profil complet reste
--  invisible tant que le lien n'est pas accepté, ce qui afficherait une
--  demande anonyme. On expose donc le strict minimum — pseudo et avatar,
--  déjà accessibles par la recherche — et uniquement pour les comptes ayant
--  déjà un lien avec l'appelant.
create or replace function public.identites_liees()
returns table (user_id uuid, pseudo text, avatar text)
language sql
stable
security definer
set search_path = public
as $$
  select p.user_id, p.pseudo, p.avatar
  from public.profiles p
  where exists (
    select 1 from public.friendships f
    where (f.demandeur = auth.uid()    and f.destinataire = p.user_id)
       or (f.destinataire = auth.uid() and f.demandeur    = p.user_id)
  );
$$;

grant execute on function public.identites_liees() to authenticated;
