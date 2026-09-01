import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/db-admin";

// Público — sin login, el postulante accede solo con el token que le llegó por correo.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = adminClient();

  const { data: entrevista, error } = await db
    .from("entrevista")
    .select(`
      estado, fecha, hora_inicio, hora_fin, meet_link, fk_usuario,
      postulacion:fk_postulacion(primer_nombre, primer_apellido),
      entrevistador:fk_usuario(nombre)
    `)
    .eq("token", token)
    .single();

  if (error || !entrevista) return NextResponse.json({ error: "Link no encontrado o vencido." }, { status: 404 });

  const e = entrevista as any;
  return NextResponse.json({
    estado: e.estado,
    fecha: e.fecha,
    hora_inicio: e.hora_inicio,
    hora_fin: e.hora_fin,
    meet_link: e.meet_link,
    postulanteNombre: `${e.postulacion?.primer_nombre ?? ""} ${e.postulacion?.primer_apellido ?? ""}`.trim(),
    entrevistadorNombre: e.entrevistador?.nombre ?? "",
  });
}
