import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/db-admin";
import { requireUsuario, esErrorResponse } from "@/lib/api-guard";
import { normalizeAccentColor } from "@/lib/colors";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = adminClient();
  const usuario = await requireUsuario(req, db);
  if (esErrorResponse(usuario)) return usuario;

  const { data, error } = await db
    .from("plantilla_puesto")
    .select("*")
    .eq("id", id)
    .eq("fk_empresa", usuario.fkEmpresa)
    .single();
  if (error || !data) return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = adminClient();
  const usuario = await requireUsuario(req, db);
  if (esErrorResponse(usuario)) return usuario;

  const body = await req.json();
  const { nombre, resumen, responsabilidades, requisitos, preguntas, escenarios, tipos_documento, color } = body;

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (nombre !== undefined) {
    if (!nombre?.trim()) return NextResponse.json({ error: "El nombre del puesto es requerido." }, { status: 400 });
    patch.nombre = nombre.trim();
  }
  if (resumen !== undefined) patch.resumen = resumen?.trim() || null;
  if (responsabilidades !== undefined) patch.responsabilidades = Array.isArray(responsabilidades) ? responsabilidades.filter(Boolean) : [];
  if (requisitos !== undefined) patch.requisitos = Array.isArray(requisitos) ? requisitos.filter(Boolean) : [];
  if (preguntas !== undefined) patch.preguntas = Array.isArray(preguntas) ? preguntas : [];
  if (escenarios !== undefined) patch.escenarios = Array.isArray(escenarios) ? escenarios : [];
  if (tipos_documento !== undefined) patch.tipos_documento = Array.isArray(tipos_documento) ? tipos_documento : [];
  if (color !== undefined) patch.color = normalizeAccentColor(color);

  const { error } = await db.from("plantilla_puesto").update(patch).eq("id", id).eq("fk_empresa", usuario.fkEmpresa);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = adminClient();
  const usuario = await requireUsuario(req, db);
  if (esErrorResponse(usuario)) return usuario;

  const { count } = await db
    .from("vacante")
    .select("id", { count: "exact", head: true })
    .eq("fk_plantilla_puesto", id)
    .eq("fk_empresa", usuario.fkEmpresa);

  if (count && count > 0) {
    return NextResponse.json(
      { error: "Este puesto tiene publicaciones asociadas. Cerrá o eliminá esas publicaciones antes de borrar el puesto." },
      { status: 400 }
    );
  }

  const { error } = await db.from("plantilla_puesto").delete().eq("id", id).eq("fk_empresa", usuario.fkEmpresa);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
