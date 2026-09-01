-- Historial de correos puntuales enviados a postulantes desde el panel.
create table if not exists correo_enviado (
  id           serial primary key,
  fk_empresa   integer not null references empresa(id) on delete cascade,
  modulo       text not null,
  referencia   text not null,
  para         text not null,
  asunto       text not null,
  html         text not null,
  enviado      boolean not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists idx_correo_enviado_fk_empresa on correo_enviado(fk_empresa);
create index if not exists idx_correo_enviado_referencia on correo_enviado(referencia);
