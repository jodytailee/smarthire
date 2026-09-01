import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/db-admin";
import { requireUsuario, esErrorResponse } from "@/lib/api-guard";
import { scorearPostulacion } from "@/lib/postulantes-ia";
import { prepararArchivosParaIA } from "@/lib/archivos-postulante";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = adminClient();
  const usuario = await requireUsuario(req, db);
  if (esErrorResponse(usuario)) return usuario;

  const { data: post, error: fetchErr } = await db
    .from("vacante_postulacion")
    .select("primer_nombre, primer_apellido, respuestas, archivos, puesto")
    .eq("id", id)
    .eq("fk_empresa", usuario.fkEmpresa)
    .single();
  if (fetchErr || !post) return NextResponse.json({ error: "Postulación no encontrada." }, { status: 404 });

  const { data: empresa } = await db.from("empresa").select("nombre, descripcion").eq("id", usuario.fkEmpresa).single();
  if (!empresa) return NextResponse.json({ error: "Empresa no encontrada." }, { status: 404 });

  const nombre = `${post.primer_nombre} ${post.primer_apellido}`;
  const docs = await prepararArchivosParaIA(db, post.archivos ?? []);
  const { puntaje, analisis, sugerencias, canton_residencia } = await scorearPostulacion({
    empresa,
    nombreCandidato: nombre,
    puesto: post.puesto ?? "el puesto",
    respuestas: post.respuestas ?? [],
    docs,
  });

  if (puntaje === null) return NextResponse.json({ error: "No se pudo obtener el análisis de IA." }, { status: 500 });

  const { error: updateErr } = await db
    .from("vacante_postulacion")
    .update({ puntaje, analisis_ia: analisis, sugerencias_ia: sugerencias, canton_residencia })
    .eq("id", id)
    .eq("fk_empresa", usuario.fkEmpresa);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
  return NextResponse.json({ ok: true, puntaje, analisis, sugerencias, canton_residencia });
}
