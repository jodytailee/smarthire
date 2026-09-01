-- Entrevistas: disponibilidad del reclutador + agendamiento por token
-- público, igual a EasyGo pero fk_empleado -> fk_usuario.

create table if not exists entrevista_disponibilidad (
  id                  serial primary key,
  fk_usuario          integer not null references usuario(id) on delete cascade,
  dia_semana          integer not null check (dia_semana between 0 and 6),
  hora_inicio         time not null,
  hora_fin            time not null,
  duracion_minutos    integer not null default 15,
  activo              boolean not null default true,
  created_at          timestamptz not null default now()
);

create index if not exists idx_entrevista_disponibilidad_fk_usuario on entrevista_disponibilidad(fk_usuario);

create table if not exists entrevista (
  id                serial primary key,
  fk_postulacion    integer not null references vacante_postulacion(id) on delete cascade,
  fk_usuario        integer references usuario(id),   -- el entrevistador
  token             uuid not null default gen_random_uuid() unique,
  fecha             date,
  hora_inicio       time,
  hora_fin          time,
  estado            text not null default 'pendiente' check (estado in ('pendiente', 'confirmada', 'cancelada')),
  google_event_id   text,
  meet_link         text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create unique index if not exists idx_entrevista_slot_unico
  on entrevista(fk_usuario, fecha, hora_inicio)
  where estado = 'confirmada';

-- Credenciales OAuth de Google Calendar por usuario (entrevistador). Igual a
-- reunion_google_config de EasyGo, pero SmartHire no tiene módulo de
-- Reuniones internas, así que es exclusiva de Entrevistas.
create table if not exists google_config (
  fk_usuario            integer primary key references usuario(id) on delete cascade,
  refresh_token         text,
  access_token          text,
  access_token_expira   timestamptz,
  email                 text,
  updated_at            timestamptz not null default now()
);
