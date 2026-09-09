-- ============================================================
--  LOOKSMAX OS — schéma Supabase
--  À coller dans : Supabase → ton projet → SQL Editor → Run
-- ============================================================

-- Une seule table : un magasin clé/valeur par utilisateur.
-- L'app manipule des blocs JSON entiers (habitudes, historique,
-- objectifs, photos, stats) et ne fait jamais de requête
-- relationnelle dessus : un KV par utilisateur suffit et évite
-- une migration lourde de tous les écrans.
create table if not exists public.user_data (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  key        text        not null,
  value      jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

-- Chacun ne voit et n'écrit que ses propres lignes.
alter table public.user_data enable row level security;

drop policy if exists "lecture de ses propres données"     on public.user_data;
drop policy if exists "insertion de ses propres données"   on public.user_data;
drop policy if exists "mise à jour de ses propres données" on public.user_data;
drop policy if exists "suppression de ses propres données" on public.user_data;

create policy "lecture de ses propres données"
  on public.user_data for select
  using (auth.uid() = user_id);

create policy "insertion de ses propres données"
  on public.user_data for insert
  with check (auth.uid() = user_id);

create policy "mise à jour de ses propres données"
  on public.user_data for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "suppression de ses propres données"
  on public.user_data for delete
  using (auth.uid() = user_id);

-- Horodatage automatique : sert d'arbitre lors de la synchro
-- entre deux appareils (la écriture la plus récente gagne).
create or replace function public.touch_user_data()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_data_touch on public.user_data;
create trigger user_data_touch
  before update on public.user_data
  for each row execute function public.touch_user_data();

-- ─── Suppression de son propre compte ────────────────────────
--  La clé anon ne peut pas toucher à auth.users : il faut passer par une
--  fonction SECURITY DEFINER. Elle ne supprime que l'appelant, jamais un
--  identifiant reçu en paramètre — sinon n'importe qui pourrait effacer
--  n'importe quel compte en devinant un UUID.
--
--  Toutes les tables de l'app référencent auth.users en « on delete cascade » :
--  user_data, profiles et les deux côtés de friendships partent avec.
create or replace function public.supprimer_mon_compte()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  moi uuid := auth.uid();
begin
  if moi is null then
    raise exception 'Aucune session' using errcode = '28000';
  end if;
  delete from auth.users where id = moi;
end;
$$;

revoke all on function public.supprimer_mon_compte() from public, anon;
grant execute on function public.supprimer_mon_compte() to authenticated;
