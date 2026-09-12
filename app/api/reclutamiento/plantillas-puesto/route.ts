import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/db-admin";
import { requireUsuario, esErrorResponse } from "@/lib/api-guard";
import { normalizeAccentColor } from "@/lib/colors";

export async function GET(req: NextRequest) {
  const db = adminClient();
  const usuario = await requireUsuario(req, db);
  if (esErrorResponse(usuario)) return usuario;

  const { data: puestos, error } = await db
    .from("plantilla_puesto")
    .select("*")
    .eq("fk_empresa", usuario.fkEmpresa)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: vacantes } = await db
    .from("vacante")
    .select("id, fk_plantilla_puesto, estado")
    .eq("fk_empresa", usuario.fkEmpresa);

  const conteoPorPuesto = new Map<number, { total: number; publicadas: number }>();
  for (const v of (vacantes ?? []) as any[]) {
    const c = conteoPorPuesto.get(v.fk_plantilla_puesto) ?? { total: 0, publicadas: 0 };
    c.total += 1;
    if (v.estado === "publicada") c.publicadas += 1;
    conteoPorPuesto.set(v.fk_plantilla_puesto, c);
  }

  const data = ((puestos ?? []) as any[]).map((p) => ({
    ...p,
    publicaciones_total: conteoPorPuesto.get(p.id)?.total ?? 0,
    publicaciones_activas: conteoPorPuesto.get(p.id)?.publicadas ?? 0,
  }));

  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const db = adminClient();
  const usuario = await requireUsuario(req, db);
  if (esErrorResponse(usuario)) return usuario;

  const body = await req.json();
  const { nombre, resumen, responsabilidades, requisitos, preguntas, escenarios, tipos_documento, color } = body;

  if (!nombre?.trim()) return NextResponse.json({ error: "El nombre del puesto es requerido." }, { status: 400 });

  const { data, error } = await db
    .from("plantilla_puesto")
    .insert({
      fk_empresa: usuario.fkEmpresa,
      nombre: nombre.trim(),
      resumen: resumen?.trim() || null,
      responsabilidades: Array.isArray(responsabilidades) ? responsabilidades.filter(Boolean) : [],
      requisitos: Array.isArray(requisitos) ? requisitos.filter(Boolean) : [],
      preguntas: Array.isArray(preguntas) ? preguntas : [],
      escenarios: Array.isArray(escenarios) ? escenarios : [],
      tipos_documento: Array.isArray(tipos_documento) ? tipos_documento : [],
      color: normalizeAccentColor(color),
      creado_por: usuario.id,
    })
    .select("id")
    .single();

  if (error || !data) return NextResponse.json({ error: error?.message ?? "No se pudo crear." }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}
