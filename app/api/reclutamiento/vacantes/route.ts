import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/db-admin";
import { requireUsuario, esErrorResponse } from "@/lib/api-guard";

function slugify(s: string): string {
  const sinAcentos = s.normalize("NFD").replace(/[̀-ͯ]/g, "");
  return (
    sinAcentos
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "vacante"
  );
}

export async function GET(req: NextRequest) {
  const db = adminClient();
  const usuario = await requireUsuario(req, db);
  if (esErrorResponse(usuario)) return usuario;

  const { data: vacantes, error } = await db
    .from("vacante")
    .select("*")
    .eq("fk_empresa", usuario.fkEmpresa)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: puestos } = await db.from("plantilla_puesto").select("id, nombre, color").eq("fk_empresa", usuario.fkEmpresa);
  const puestoPorId = new Map(((puestos ?? []) as any[]).map((p) => [p.id, p]));

  const { data: postulaciones } = await db.from("vacante_postulacion").select("fk_vacante").eq("fk_empresa", usuario.fkEmpresa);
  const conteoPorVacante = new Map<number, number>();
  for (const p of (postulaciones ?? []) as any[]) {
    if (p.fk_vacante) conteoPorVacante.set(p.fk_vacante, (conteoPorVacante.get(p.fk_vacante) ?? 0) + 1);
  }

  const { data: localidades } = await db.from("localidad").select("id, nombre").eq("fk_empresa", usuario.fkEmpresa);
  const nombrePorId = new Map(((localidades ?? []) as any[]).map((l) => [l.id, l.nombre]));

  const data = ((vacantes ?? []) as any[]).map((v) => {
    const puesto = puestoPorId.get(v.fk_plantilla_puesto);
    return {
      ...v,
      titulo: puesto?.nombre ?? "(puesto eliminado)",
      color: puesto?.color ?? "rose",
      postulaciones: conteoPorVacante.get(v.id) ?? 0,
      localidades_nombres: (v.fk_localidades ?? []).map((id: number) => nombrePorId.get(id)).filter(Boolean),
    };
  });

  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const db = adminClient();
  const usuario = await requireUsuario(req, db);
  if (esErrorResponse(usuario)) return usuario;

  const body = await req.json();
  const { fk_puesto, tipo_jornada, fk_localidades, estado } = body;

  if (!fk_puesto) return NextResponse.json({ error: "Seleccioná un puesto." }, { status: 400 });
  if (!["tiempo_completo", "medio_tiempo", "temporada"].includes(tipo_jornada)) {
    return NextResponse.json({ error: "Tipo de jornada inválido." }, { status: 400 });
  }
  if (!Array.isArray(fk_localidades) || fk_localidades.length === 0) {
    return NextResponse.json({ error: "Seleccioná al menos una localidad." }, { status: 400 });
  }
  if (estado !== undefined && !["borrador", "publicada", "pausada", "cerrada"].includes(estado)) {
    return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
  }

  const { data: puesto, error: puestoErr } = await db
    .from("plantilla_puesto")
    .select("nombre")
    .eq("id", fk_puesto)
    .eq("fk_empresa", usuario.fkEmpresa)
    .single();
  if (puestoErr || !puesto) return NextResponse.json({ error: "Puesto no encontrado." }, { status: 404 });

  const baseSlug = slugify(puesto.nombre);
  let slug = baseSlug;
  for (let i = 2; i <= 20; i++) {
    const { data: existente } = await db.from("vacante").select("id").eq("fk_empresa", usuario.fkEmpresa).eq("slug", slug).maybeSingle();
    if (!existente) break;
    slug = `${baseSlug}-${i}`;
  }

  const { data, error } = await db
    .from("vacante")
    .insert({
      fk_empresa: usuario.fkEmpresa,
      fk_plantilla_puesto: fk_puesto,
      slug,
      tipo_jornada,
      fk_localidades,
      estado: estado ?? "borrador",
      creado_por: usuario.id,
    })
    .select("id, slug")
    .single();

  if (error || !data) return NextResponse.json({ error: error?.message ?? "No se pudo crear." }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id, slug: data.slug });
}
