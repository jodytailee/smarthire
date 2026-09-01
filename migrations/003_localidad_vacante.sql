-- Localidades (sucursales/sedes) de una empresa, y vacantes.
-- Nota: EasyGo tenía columnas `habilitada_postulantes`/`vacantes_habilitadas`
-- en localidad, documentadas como no usadas por ningún código — no se portan.

create table if not exists localidad (
  id          serial primary key,
  fk_empresa  integer not null references empresa(id) on delete cascade,
  nombre      text not null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_localidad_fk_empresa on localidad(fk_empresa);

create table if not exists vacante (
  id                    serial primary key,
  fk_empresa            integer not null references empresa(id) on delete cascade,
  fk_plantilla_puesto   integer references plantilla_puesto(id),
  slug                  text not null,
  tipo_jornada          text not null default 'tiempo_completo'
                          check (tipo_jornada in ('tiempo_completo', 'medio_tiempo', 'temporada')),
  fk_localidades        integer[] not null default '{}',
  estado                text not null default 'borrador'
                          check (estado in ('borrador', 'publicada', 'pausada', 'cerrada')),
  creado_por            integer references usuario(id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (fk_empresa, slug)
);

create index if not exists idx_vacante_fk_empresa on vacante(fk_empresa);
create index if not exists idx_vacante_estado on vacante(estado);
