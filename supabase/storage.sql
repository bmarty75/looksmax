-- ============================================================
--  LOOKSMAX OS — stockage des photos de progression
--  À coller dans : Supabase → ton projet → SQL Editor → Run
--  (à exécuter APRÈS schema.sql et social.sql)
-- ============================================================
--
--  Les photos vivaient en base64 dans une seule ligne jsonb : tout le lot
--  repartait sur le réseau à chaque ajout et redescendait à chaque
--  connexion. Elles passent dans un bucket, une requête par image.
--
--  Le bucket est PRIVÉ. Un bucket public rendrait l'URL seule gardienne de
--  photos de visage : il suffirait qu'un lien fuite. Ici c'est la RLS qui
--  décide, et le client demande une URL signée à durée limitée.

-- ─── Le bucket ───────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public             = false,
      file_size_limit    = 5242880,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- ─── Conversion tolérante en uuid ────────────────────────────
--  Les règles ci-dessous comparent le premier dossier du chemin à un uuid.
--  Un « or » n'est pas garanti court-circuité en SQL : sur un nom de fichier
--  mal formé, un cast direct ferait échouer la requête entière au lieu de
--  refuser l'accès. Cette fonction renvoie null plutôt que de lever.
create or replace function public.uuid_ou_null(t text)
returns uuid
language plpgsql
immutable
as $$
begin
  return t::uuid;
exception when others then
  return null;
end;
$$;

grant execute on function public.uuid_ou_null(text) to authenticated;

-- ─── Règles d'accès ──────────────────────────────────────────
--  Convention de chemin : « <user_id>/<id photo>.jpg ». Le premier dossier
--  est donc le propriétaire, et c'est sur lui que tout se décide.

drop policy if exists "photos: lecture par soi et ses amis" on storage.objects;
drop policy if exists "photos: depot dans son dossier"      on storage.objects;
drop policy if exists "photos: remplacement des siennes"    on storage.objects;
drop policy if exists "photos: suppression des siennes"     on storage.objects;

-- Un ami accepté voit les photos, parce que l'app propose l'avant/après.
-- Ce que la personne ne partage pas n'est de toute façon jamais publié :
-- son profil ne contient alors aucun chemin, donc rien à demander.
create policy "photos: lecture par soi et ses amis"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'photos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.sont_amis(auth.uid(), public.uuid_ou_null((storage.foldername(name))[1]))
    )
  );

create policy "photos: depot dans son dossier"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "photos: remplacement des siennes"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "photos: suppression des siennes"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Note : storage.objects ne référence pas auth.users, donc la cascade de
-- supprimer_mon_compte() ne l'atteindrait pas et les fichiers resteraient
-- stockés indéfiniment. C'est cette fonction, dans schema.sql, qui les
-- efface elle-même — d'où l'intérêt de relancer schema.sql aussi.
