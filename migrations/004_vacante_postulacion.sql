-- Postulaciones recibidas. Los postulantes NO se insertan como "usuario" —
-- viven únicamente en esta tabla, incluso una vez contratados (SmartHire no
-- tiene módulo de empleados/planilla propio; "contratado" es solo un estado).

create table if not exists vacante_postulacion (
  id                          serial primary key,
  fk_empresa                  integer not null references empresa(id) on delete cascade,
  fk_vacante                  integer references vacante(id),
  tipo_identificacion         text,
  numero_identificacion       text,
  primer_nombre               text not null,
  primer_apellido             text not null,
  correo_electronico          text,
  telefono                    text,
  archivos                    jsonb not null default '[]',   -- [{tipo, nombre, path}]
  respuestas                  jsonb not null default '[]',   -- [{pregunta, respuesta}]
  lugares                     jsonb not null default '[]',   -- string[]
  jornada                     text,
  puesto                      text,
  pretension_monto            numeric(14,2),
  canton_residencia           text,
  puntaje                     integer,
  analisis_ia                 text,
  sugerencias_ia               text,
  texto_rechazo                text,
  rechazo_enviado_at           timestamptz,
  texto_futuro_candidato       text,
  futuro_candidato_enviado_at  timestamptz,
  estado                       text not null default 'pendiente'
                                  check (estado in ('pendiente', 'en_revision', 'entrevista', 'contratado', 'rechazado', 'futuro_candidato')),
  notas_admin                  text,
  created_at                   timestamptz not null default now()
);

create index if not exists idx_vacante_postulacion_fk_empresa on vacante_postulacion(fk_empresa);
create index if not exists idx_vacante_postulacion_fk_vacante on vacante_postulacion(fk_vacante);
create index if not exists idx_vacante_postulacion_estado on vacante_postulacion(estado);

-- Bucket de Storage para los documentos adjuntos de postulantes: privado,
-- 10 MB máx por archivo. Correlo en el SQL editor de Supabase (o creá el
-- bucket "postulaciones" a mano desde el dashboard con estas mismas opciones).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'postulaciones', 'postulaciones', false, 10485760,
  array['application/pdf','image/jpeg','image/png','image/webp',
        'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
on conflict (id) do nothing;

-- Solo service_role puede leer/escribir — todo acceso desde el cliente pasa
-- por rutas API que generan URLs firmadas de corta duración.
-- Postgres no soporta "CREATE POLICY IF NOT EXISTS" — se dropea primero
-- para que este script se pueda correr más de una vez sin error.
drop policy if exists "postulaciones_service_role" on storage.objects;
create policy "postulaciones_service_role"
  on storage.objects for all
  using (bucket_id = 'postulaciones' and auth.role() = 'service_role')
  with check (bucket_id = 'postulaciones' and auth.role() = 'service_role');
