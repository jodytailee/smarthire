-- Logo de la empresa, mostrado en la página pública de postulación.
alter table empresa add column if not exists logo_url text;

-- Bucket público para logos (a diferencia de "postulaciones", este bucket
-- SÍ es público — el logo tiene que poder verse sin autenticación en
-- /{empresa}/vacantes y en el wizard de postulación).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'logos', 'logos', true, 2097152,
  array['image/png','image/jpeg','image/webp','image/svg+xml']
)
on conflict (id) do nothing;

-- Cualquiera puede leer (bucket público), pero solo service_role puede
-- escribir — la subida pasa por una ruta API autenticada que valida que
-- quien sube sea admin de esa empresa.
drop policy if exists "logos_lectura_publica" on storage.objects;
create policy "logos_lectura_publica"
  on storage.objects for select
  using (bucket_id = 'logos');

drop policy if exists "logos_escritura_service_role" on storage.objects;
create policy "logos_escritura_service_role"
  on storage.objects for insert
  with check (bucket_id = 'logos' and auth.role() = 'service_role');

drop policy if exists "logos_actualizacion_service_role" on storage.objects;
create policy "logos_actualizacion_service_role"
  on storage.objects for update
  using (bucket_id = 'logos' and auth.role() = 'service_role');
