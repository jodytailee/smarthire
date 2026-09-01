import type { SupabaseClient } from "@supabase/supabase-js";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";
const REDIRECT_URI = process.env.GOOGLE_OAUTH_REDIRECT_URI ?? "";
const SCOPE = "https://www.googleapis.com/auth/calendar.events";

export function googleConectado(): boolean {
  return !!(CLIENT_ID && CLIENT_SECRET && REDIRECT_URI);
}

// `state` lleva el id del usuario (entrevistador) que está conectando su
// cuenta, para saber a quién asociarle los tokens cuando vuelva el callback.
export function getAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: SCOPE,
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

async function obtenerEmail(accessToken: string): Promise<string | null> {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.email ?? null;
}

export async function exchangeCode(code: string): Promise<{
  accessToken: string; refreshToken: string; expiresIn: number; email: string | null;
}> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Google OAuth HTTP ${res.status}: ${await res.text()}`);
  const json = await res.json();
  if (!json.refresh_token) {
    throw new Error("Google no devolvió un refresh_token — probá desconectar el acceso de la app en https://myaccount.google.com/permissions y conectar de nuevo.");
  }
  const email = await obtenerEmail(json.access_token);
  return { accessToken: json.access_token, refreshToken: json.refresh_token, expiresIn: json.expires_in, email };
}

async function refrescarAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Google OAuth refresh HTTP ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return { accessToken: json.access_token, expiresIn: json.expires_in };
}

// Devuelve un access token válido para el entrevistador, refrescándolo si
// venció. null si el usuario no conectó Google Calendar.
export async function getValidAccessToken(db: SupabaseClient, usuarioId: number): Promise<string | null> {
  const { data: cfg } = await db
    .from("google_config")
    .select("refresh_token, access_token, access_token_expira")
    .eq("fk_usuario", usuarioId)
    .maybeSingle();
  if (!cfg?.refresh_token) return null;

  const vigente = cfg.access_token && cfg.access_token_expira && new Date(cfg.access_token_expira).getTime() > Date.now() + 60_000;
  if (vigente) return cfg.access_token;

  const { accessToken, expiresIn } = await refrescarAccessToken(cfg.refresh_token);
  await db.from("google_config").update({
    access_token: accessToken,
    access_token_expira: new Date(Date.now() + expiresIn * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("fk_usuario", usuarioId);
  return accessToken;
}

export async function crearEventoConMeet(accessToken: string, args: {
  summary: string; description: string; startISO: string; endISO: string; attendeeEmails: string[];
}): Promise<{ eventId: string; meetLink: string | null }> {
  const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({
      summary: args.summary,
      description: args.description,
      start: { dateTime: args.startISO, timeZone: "America/Costa_Rica" },
      end: { dateTime: args.endISO, timeZone: "America/Costa_Rica" },
      attendees: args.attendeeEmails.map((email) => ({ email })),
      conferenceData: {
        createRequest: { requestId: `entrevista-${Date.now()}`, conferenceSolutionKey: { type: "hangoutsMeet" } },
      },
    }),
  });
  if (!res.ok) throw new Error(`Google Calendar HTTP ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return { eventId: json.id, meetLink: json.hangoutLink ?? null };
}

export async function cancelarEvento(accessToken: string, eventId: string): Promise<void> {
  await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  }).catch(() => {});
}
