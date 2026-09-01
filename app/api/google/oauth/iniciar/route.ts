import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/db-admin";
import { requireUsuario, esErrorResponse } from "@/lib/api-guard";
import { getAuthUrl, googleConectado } from "@/lib/google-calendar";

// Devuelve la URL en vez de redirigir directo: la navegación del browser
// (click en un link) no manda el header Authorization con el access token de
// Supabase, así que el frontend primero pide la URL autenticado por fetch y
// recién ahí hace window.location a la URL de Google.
export async function GET(req: NextRequest) {
  if (!googleConectado()) {
    return NextResponse.json({ error: "Google Calendar no está configurado en el servidor (faltan GOOGLE_CLIENT_ID/SECRET)." }, { status: 503 });
  }

  const db = adminClient();
  const usuario = await requireUsuario(req, db);
  if (esErrorResponse(usuario)) return usuario;
  if (!usuario.esAdmin) return NextResponse.json({ error: "Solo un admin puede conectar Google Calendar." }, { status: 403 });

  return NextResponse.json({ url: getAuthUrl(String(usuario.id)) });
}
