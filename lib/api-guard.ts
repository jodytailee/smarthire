import type { SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { usuarioDesdeRequest, type UsuarioAuth } from "./auth-server";

// Azúcar para las rutas /api/reclutamiento/*: resuelve el usuario o corta
// con 401 — nunca deja pasar una request sin fk_empresa resuelto server-side.
export async function requireUsuario(req: NextRequest, db: SupabaseClient): Promise<UsuarioAuth | NextResponse> {
  const usuario = await usuarioDesdeRequest(req, db);
  if (!usuario) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  return usuario;
}

export function esErrorResponse(x: unknown): x is NextResponse {
  return x instanceof NextResponse;
}
