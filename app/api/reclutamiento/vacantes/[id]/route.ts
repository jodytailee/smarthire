import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/db-admin";
import { requireUsuario, esErrorResponse } from "@/lib/api-guard";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = adminClient();
  const usuario = await requireUsuario(req, db);
  if (esErrorResponse(usuario)) return usuario;

  const { data, error } = await db.from("vacante").select("*").eq("id", id).eq("fk_empresa", usuario.fkEmpresa).single();
  if (error || !data) return NextResponse.json({ error: "No encontrada." }, { status: 404 });
  const { fk_plantilla_puesto, ...rest } = data as any;
  return NextResponse.json({ ...rest, fk_puesto: fk_plantilla_puesto });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = adminClient();
  const usuario = await requireUsuario(req, db);
  if (esErrorResponse(usuario)) return usuario;

  const body = await req.json();
  const { fk_puesto, tipo_jornada, fk_localidades, estado } = body;

  if (tipo_jornada && !["tiempo_completo", "medio_tiempo", "temporada"].includes(tipo_jornada)) {
    return NextResponse.json({ error: "Tipo de jornada inválido." }, { status: 400 });
  }
  if (estado !== undefined && !["borrador", "publicada", "pausada", "cerrada"].includes(estado)) {
    return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (fk_puesto !== undefined) patch.fk_plantilla_puesto = fk_puesto;
  if (tipo_jornada !== undefined) patch.tipo_jornada = tipo_jornada;
  if (fk_localidades !== undefined) {
    if (!Array.isArray(fk_localidades) || fk_localidades.length === 0) {
      return NextResponse.json({ error: "Seleccioná al menos una localidad." }, { status: 400 });
    }
    patch.fk_localidades = fk_localidades;
  }
  if (estado !== undefined) patch.estado = estado;

  const { error } = await db.from("vacante").update(patch).eq("id", id).eq("fk_empresa", usuario.fkEmpresa);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = adminClient();
  const usuario = await requireUsuario(req, db);
  if (esErrorResponse(usuario)) return usuario;

  const { count } = await db
    .from("vacante_postulacion")
    .select("id", { count: "exact", head: true })
    .eq("fk_vacante", id)
    .eq("fk_empresa", usuario.fkEmpresa);

  if (count && count > 0) {
    const { error } = await db
      .from("vacante")
      .update({ estado: "cerrada", updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("fk_empresa", usuario.fkEmpresa);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, desactivada: true });
  }

  const { error } = await db.from("vacante").delete().eq("id", id).eq("fk_empresa", usuario.fkEmpresa);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, eliminada: true });
}
