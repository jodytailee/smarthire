-- Catálogo reutilizable de puestos de trabajo, por empresa.
-- Puerto de plantilla_puesto de EasyGo + fk_empresa.

create table if not exists plantilla_puesto (
  id                  serial primary key,
  fk_empresa          integer not null references empresa(id) on delete cascade,
  nombre              text not null default '',
  resumen             text,
  responsabilidades   jsonb not null default '[]',   -- string[]
  requisitos          jsonb not null default '[]',   -- string[]
  preguntas           jsonb not null default '[]',   -- [{id, texto}]
  escenarios          jsonb not null default '[]',   -- [{id, situacion, preguntas:[{id, texto}]}]
  tipos_documento     jsonb not null default '[]',   -- [{id, label, obligatorio}]
  color               text not null default 'rose',
  creado_por          integer references usuario(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_plantilla_puesto_fk_empresa on plantilla_puesto(fk_empresa);
