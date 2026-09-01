import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/db-admin";
import { calcularSlotsLibres } from "@/lib/reunion-slots";

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const desde = req.nextUrl.searchParams.get("desde");
  const hasta = req.nextUrl.searchParams.get("hasta");
  if (!desde || !hasta) return NextResponse.json({ error: "desde y hasta son requeridos." }, { status: 400 });

  const db = adminClient();
  const { data: entrevista } = await db.from("entrevista").select("fk_usuario").eq("token", token).maybeSingle();
  if (!entrevista) return NextResponse.json({ error: "Link no encontrado o vencido." }, { status: 404 });

  const fkUsuario = (entrevista as any).fk_usuario;

  const [{ data: disponibilidad }, { data: ocupadas }] = await Promise.all([
    db.from("entrevista_disponibilidad").select("dia_semana, hora_inicio, hora_fin, duracion_minutos")
      .eq("fk_usuario", fkUsuario).eq("activo", true),
    // Todas las entrevistas confirmadas de ese entrevistador, no solo la de
    // este postulante — para no chocar con otro candidato ya agendado.
    db.from("entrevista").select("fecha, hora_inicio")
      .eq("fk_usuario", fkUsuario).eq("estado", "confirmada")
      .gte("fecha", desde).lte("fecha", hasta),
  ]);

  const slots = calcularSlotsLibres((disponibilidad ?? []) as any[], (ocupadas ?? []) as any[], desde, hasta);
  return NextResponse.json({ data: slots });
}
