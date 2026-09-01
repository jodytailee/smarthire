# SmartHire

Sistema de contrataciones multi-empresa con IA — publicá vacantes, recibí
postulaciones y dejá que Claude analice, puntúe y te ayude a redactar
correos de rechazo o "futuro candidato" para cada postulante. Incluye
agendamiento de entrevistas por link público con Google Meet.

Extraído y generalizado a partir del módulo de reclutamiento de EasyGo
(un sistema de una sola empresa) para funcionar como SaaS: cada empresa
(`empresa`) tiene sus propios usuarios, plantillas de puesto, vacantes y
postulantes, aislados entre sí.

Stack: Next.js (App Router) + TypeScript + Supabase (Postgres/Auth/Storage,
sin ORM) + Anthropic Claude (REST directo, sin SDK).

## Setup

1. **Supabase**: creá un proyecto nuevo en supabase.com. Corré las
   migraciones de `migrations/` **en orden** (001 → 007) en el SQL editor.
   La migración 004 crea el bucket de Storage `postulaciones`; si el
   `insert into storage.buckets` falla por permisos, creá el bucket a mano
   desde el dashboard con las mismas opciones (privado, 10 MB, mimetypes de
   la migración) y corré el resto del archivo.

2. **Google Sign-In** (login de usuarios): Dashboard → Authentication →
   Providers → Google. Necesita un OAuth client ID/secret de Google Cloud
   Console (tipo "Web application", con `https://<tu-proyecto>.supabase.co/auth/v1/callback`
   como redirect URI autorizado).

3. **Variables de entorno**: copiá `.env.local.example` a `.env.local` y
   completá:
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` — del proyecto Supabase.
   - `ANTHROPIC_API_KEY` — para scoring de IA, correos de rechazo/futuro-candidato, generación de descripciones y preguntas. Sin esto, esas funciones degradan sin romper el flujo.
   - `RESEND_API_KEY` o `GMAIL_USER`+`GMAIL_APP_PASSWORD` — correo saliente.
   - `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`GOOGLE_OAUTH_REDIRECT_URI` — opcional, para generar el link de Google Meet en las entrevistas (`{origin}/api/google/oauth/callback`). Sin esto, agendar entrevista sigue funcionando pero sin videollamada automática.
   - `NEXT_PUBLIC_APP_URL` — URL pública del sitio.

4. **Correr local**: `npm install && npm run dev`.

5. **Deploy**: pensado para Vercel (`vercel.json` incluido). Apuntá el
   dominio `smarthire.ticoapp.lab` al deploy y configurá las mismas env
   vars ahí.

## Flujo

- Alguien entra a `/login`, inicia sesión con Google. Si es su primera vez,
  `/onboarding` le pide el nombre de su empresa y crea su espacio (queda
  como `admin`).
- Desde `/reclutamiento/plantillas-puesto` arma el catálogo de puestos
  (con generación de descripción y preguntas por IA).
- Desde `/reclutamiento/vacantes` publica una vacante concreta (jornada,
  localidades, estado) — queda visible en `/{slug-empresa}/vacantes`.
- Un candidato postula desde `/{slug-empresa}/vacantes/{slug-vacante}`
  (wizard de 3 pasos, sin necesidad de cuenta). Claude puntúa la
  postulación al momento de recibirla.
- El equipo gestiona el pipeline desde `/reclutamiento/postulantes`: marcar
  en revisión, re-analizar con IA, agendar entrevista, generar+enviar
  rechazo o "futuro candidato" con IA.
- El postulante reserva su propio horario de entrevista desde el link
  público que le llega por correo (`/postulantes/entrevista/[token]`).

## Aislamiento multi-tenant

No hay RLS que dependa de sesión de usuario — todas las rutas usan
`service_role` (`lib/db-admin.ts`) y filtran manualmente por `fk_empresa`,
resuelto server-side desde el Bearer token (`lib/auth-server.ts`) o desde
el slug/token de la URL en rutas públicas. Las tablas de negocio tienen RLS
habilitado con política "solo `service_role`" (`migrations/007_rls.sql`)
para que la anon key pública no pueda leerlas directo vía PostgREST.

## Tests

`npm run test` (Vitest). Cubre principalmente `lib/`.
