import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/db-admin";
import { requireUsuario, esErrorResponse } from "@/lib/api-guard";

export async function GET(req: NextRequest) {
  const db = adminClient();
  const usuario = await requireUsuario(req, db);
  if (esErrorResponse(usuario)) return usuario;

  const { data, error } = await db
    .from("empresa")
    .select("id, nombre, slug, descripcion, color, logo_url")
    .eq("id", usuario.fkEmpresa)
    .single();

  if (error || !data) return NextResponse.json({ error: "Empresa no encontrada." }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const db = adminClient();
  const usuario = await requireUsuario(req, db);
  if (esErrorResponse(usuario)) return usuario;
  if (!usuario.esAdmin) return NextResponse.json({ error: "Solo un admin puede editar la empresa." }, { status: 403 });

  const { nombre, descripcion } = await req.json();

  const patch: Record<string, unknown> = {};
  if (nombre !== undefined) {
    if (!nombre?.trim()) return NextResponse.json({ error: "El nombre de la empresa es requerido." }, { status: 400 });
    patch.nombre = nombre.trim();
  }
  if (descripcion !== undefined) patch.descripcion = descripcion?.trim() || null;

  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "Sin campos para actualizar." }, { status: 400 });

  const { error } = await db.from("empresa").update(patch).eq("id", usuario.fkEmpresa);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
