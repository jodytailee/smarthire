import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/db-admin";
import { exchangeCode } from "@/lib/google-calendar";

// Google redirige acá después del consentimiento — no hay sesión en este
// request (navegación del browser iniciada por Google), así que se confía
// en el "state" armado en /api/google/oauth/iniciar (que sí verificó ahí
// que quien lo pidió es admin) para saber a qué usuario asociar los tokens.
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const usuarioId = state ? Number(state) : null;

  const destino = new URL("/reclutamiento/entrevistas/disponibilidad", req.nextUrl.origin);

  if (!code || !usuarioId) {
    destino.searchParams.set("error", "Google no devolvió el código de autorización.");
    return NextResponse.redirect(destino);
  }

  const db = adminClient();
  const { data: usuario } = await db.from("usuario").select("id, rol").eq("id", usuarioId).single();
  if (!usuario || usuario.rol !== "admin") {
    destino.searchParams.set("error", "No autorizado.");
    return NextResponse.redirect(destino);
  }

  try {
    const { accessToken, refreshToken, expiresIn, email } = await exchangeCode(code);
    await db.from("google_config").upsert({
      fk_usuario: usuarioId,
      email,
      refresh_token: refreshToken,
      access_token: accessToken,
      access_token_expira: new Date(Date.now() + expiresIn * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "fk_usuario" });

    destino.searchParams.set("conectado", "1");
  } catch (err: any) {
    destino.searchParams.set("error", err.message);
  }

  return NextResponse.redirect(destino);
}
