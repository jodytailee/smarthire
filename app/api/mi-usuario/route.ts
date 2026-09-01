import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/db-admin";
import { usuarioDesdeRequest } from "@/lib/auth-server";

// Devuelve el usuario+empresa del que está logueado, o { usuario: null } si
// todavía no completó el onboarding (login con Google sin empresa creada).
export async function GET(req: NextRequest) {
  const db = adminClient();
  const usuario = await usuarioDesdeRequest(req, db);
  if (!usuario) return NextResponse.json({ usuario: null });

  const { data: empresa } = await db
    .from("empresa")
    .select("id, nombre, slug, color")
    .eq("id", usuario.fkEmpresa)
    .single();

  return NextResponse.json({
    usuario: {
      id: usuario.id,
      fk_empresa: usuario.fkEmpresa,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.esAdmin ? "admin" : "reclutador",
      empresa: empresa ?? null,
    },
  });
}
