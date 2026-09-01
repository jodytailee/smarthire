import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/db-admin";
import { requireUsuario, esErrorResponse } from "@/lib/api-guard";

export async function GET(req: NextRequest) {
  const db = adminClient();
  const usuario = await requireUsuario(req, db);
  if (esErrorResponse(usuario)) return usuario;

  const { data, error } = await db
    .from("vacante_postulacion")
    .select("id,primer_nombre,primer_apellido,correo_electronico,telefono,puntaje,estado,created_at,archivos,jornada,lugares,respuestas,puesto,pretension_monto,canton_residencia")
    .eq("fk_empresa", usuario.fkEmpresa)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
