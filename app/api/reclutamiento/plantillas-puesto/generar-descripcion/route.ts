import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/db-admin";
import { requireUsuario, esErrorResponse } from "@/lib/api-guard";
import { generarDescripcionPuestoConIA } from "@/lib/vacantes";

export async function POST(req: NextRequest) {
  const db = adminClient();
  const usuario = await requireUsuario(req, db);
  if (esErrorResponse(usuario)) return usuario;

  const { nombre } = await req.json();
  if (!nombre?.trim()) return NextResponse.json({ error: "Falta el nombre del puesto." }, { status: 400 });

  const { data: empresa } = await db.from("empresa").select("nombre, descripcion").eq("id", usuario.fkEmpresa).single();
  if (!empresa) return NextResponse.json({ error: "Empresa no encontrada." }, { status: 404 });

  try {
    const resultado = await generarDescripcionPuestoConIA({ empresa, nombrePuesto: nombre.trim() });
    return NextResponse.json(resultado);
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Error al generar con IA." }, { status: 500 });
  }
}
