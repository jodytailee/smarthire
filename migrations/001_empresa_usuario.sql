-- Empresas (tenants) y usuarios de SmartHire.
-- Sin RLS: todas las rutas API usan service_role y filtran manualmente por
-- fk_empresa (ver lib/auth-server.ts). auth_user_id referencia a
-- auth.users, poblado por Supabase Auth (login con Google).

create table if not exists empresa (
  id           serial primary key,
  nombre       text not null,
  slug         text unique not null,
  descripcion  text,               -- rubro/industria; alimenta los prompts de IA
  color        text not null default 'rose',
  created_at   timestamptz not null default now()
);

create table if not exists usuario (
  id            serial primary key,
  fk_empresa    integer not null references empresa(id) on delete cascade,
  auth_user_id  uuid unique,
  nombre        text,
  email         text,
  rol           text not null default 'reclutador' check (rol in ('admin', 'reclutador')),
  created_at    timestamptz not null default now()
);

create index if not exists idx_usuario_fk_empresa on usuario(fk_empresa);
