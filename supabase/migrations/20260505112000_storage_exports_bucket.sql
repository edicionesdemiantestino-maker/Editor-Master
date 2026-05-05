-- Bucket para exports de impresión (PDF CMYK). Privado, acceso por RLS.

-- Crea bucket si no existe.
insert into storage.buckets (id, name, public)
values ('exports', 'exports', false)
on conflict (id) do nothing;

-- Políticas: cada usuario accede solo a objetos bajo `auth.uid()/...` en bucket exports.
-- Nota: storage.objects tiene RLS habilitado por defecto en Supabase Storage.

drop policy if exists "exports_select_own" on storage.objects;
create policy "exports_select_own"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'exports'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "exports_insert_own" on storage.objects;
create policy "exports_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'exports'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "exports_update_own" on storage.objects;
create policy "exports_update_own"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'exports'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'exports'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "exports_delete_own" on storage.objects;
create policy "exports_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'exports'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

