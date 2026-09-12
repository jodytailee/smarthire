import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/db-admin";

// Listado público de publicaciones activas de una empresa, para /[empresa]/vacantes.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ empresa: string }> }) {
  const { empresa: empresaSlug } = await params;
  const db = adminClient();

  const { data: empresa } = await db.from("empresa").select("id, nombre, color, logo_url").eq("slug", empresaSlug).maybeSingle();
  if (!empresa) return NextResponse.json({ error: "Empresa no encontrada." }, { status: 404 });

  const { data, error } = await db
    .from("vacante")
    .select("id, slug, tipo_jornada, fk_localidades, fk_plantilla_puesto")
    .eq("fk_empresa", empresa.id)
    .eq("estado", "publicada")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: puestos } = await db
    .from("plantilla_puesto")
    .select("id, nombre, resumen, responsabilidades, requisitos, color")
    .eq("fk_empresa", empresa.id);
  const puestoPorId = new Map(((puestos ?? []) as any[]).map((p) => [p.id, p]));

  const { data: localidades } = await db.from("localidad").select("id, nombre").eq("fk_empresa", empresa.id);
  const nombrePorId = new Map(((localidades ?? []) as any[]).map((l) => [l.id, l.nombre]));

  const resultado = ((data ?? []) as any[])
    .map((v) => {
      const puesto = puestoPorId.get(v.fk_plantilla_puesto);
      if (!puesto) return null;
      return {
        id: v.id,
        titulo: puesto.nombre,
        slug: v.slug,
        resumen: puesto.resumen,
        responsabilidades: puesto.responsabilidades ?? [],
        requisitos: puesto.requisitos ?? [],
        tipo_jornada: v.tipo_jornada,
        color: puesto.color,
        localidades: (v.fk_localidades ?? []).map((id: number) => nombrePorId.get(id)).filter(Boolean),
      };
    })
    .filter(Boolean);

  return NextResponse.json({ empresa: { nombre: empresa.nombre, color: empresa.color, logo_url: empresa.logo_url }, data: resultado });
}
