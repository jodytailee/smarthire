import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/db-admin";

// Detalle público de una publicación, para /[empresa]/vacantes/[slug] (el wizard de postulación).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ empresa: string; slug: string }> }) {
  const { empresa: empresaSlug, slug } = await params;
  const db = adminClient();

  const { data: empresa } = await db.from("empresa").select("id, nombre, logo_url").eq("slug", empresaSlug).maybeSingle();
  if (!empresa) return NextResponse.json({ error: "Vacante no encontrada." }, { status: 404 });

  const { data, error } = await db
    .from("vacante")
    .select("id, slug, tipo_jornada, fk_localidades, estado, fk_plantilla_puesto")
    .eq("fk_empresa", empresa.id)
    .eq("slug", slug)
    .single();

  if (error || !data || (data as any).estado !== "publicada") {
    return NextResponse.json({ error: "Vacante no encontrada." }, { status: 404 });
  }

  const v = data as any;

  const { data: puesto } = await db
    .from("plantilla_puesto")
    .select("id, nombre, resumen, responsabilidades, requisitos, preguntas, escenarios, tipos_documento, color")
    .eq("id", v.fk_plantilla_puesto)
    .eq("fk_empresa", empresa.id)
    .single();

  if (!puesto) return NextResponse.json({ error: "Vacante no encontrada." }, { status: 404 });

  const { data: localidades } = await db.from("localidad").select("id, nombre").in("id", v.fk_localidades ?? []);

  return NextResponse.json({
    id: v.id,
    empresa: empresa.nombre,
    empresaLogoUrl: empresa.logo_url ?? null,
    titulo: puesto.nombre,
    slug: v.slug,
    resumen: puesto.resumen,
    responsabilidades: puesto.responsabilidades ?? [],
    requisitos: puesto.requisitos ?? [],
    tipo_jornada: v.tipo_jornada,
    preguntas: puesto.preguntas ?? [],
    escenarios: puesto.escenarios ?? [],
    tipos_documento: puesto.tipos_documento ?? [],
    color: puesto.color,
    localidades: ((localidades ?? []) as any[]).map((l) => l.nombre).sort(),
  });
}
