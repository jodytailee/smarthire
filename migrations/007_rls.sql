-- A diferencia de EasyGo (single-tenant, donde la mayoría de tablas no tiene
-- RLS y confía en que el cliente nunca hace SELECT directo con la anon key),
-- acá SÍ importa: sin RLS, cualquiera con la anon key pública podría hacer
-- `select * from vacante_postulacion` vía PostgREST y leer datos de TODAS
-- las empresas. Se habilita RLS en toda tabla de negocio con una única
-- política "solo service_role" (mismo patrón ya usado en EasyGo para
-- `entrenamiento`) — el cliente nunca lee estas tablas directo, siempre
-- pasa por una ruta /api/* que resuelve la empresa del usuario autenticado
-- server-side (ver lib/auth-server.ts).

alter table empresa enable row level security;
alter table usuario enable row level security;
alter table plantilla_puesto enable row level security;
alter table localidad enable row level security;
alter table vacante enable row level security;
alter table vacante_postulacion enable row level security;
alter table entrevista_disponibilidad enable row level security;
alter table entrevista enable row level security;
alter table google_config enable row level security;
alter table correo_enviado enable row level security;

create policy "empresa_service_role" on empresa for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "usuario_service_role" on usuario for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "plantilla_puesto_service_role" on plantilla_puesto for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "localidad_service_role" on localidad for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "vacante_service_role" on vacante for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "vacante_postulacion_service_role" on vacante_postulacion for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "entrevista_disponibilidad_service_role" on entrevista_disponibilidad for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "entrevista_service_role" on entrevista for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "google_config_service_role" on google_config for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "correo_enviado_service_role" on correo_enviado for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
