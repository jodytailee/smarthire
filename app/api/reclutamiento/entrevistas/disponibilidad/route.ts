import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/db-admin";
import { requireUsuario, esErrorResponse } from "@/lib/api-guard";

// Franjas de disponibilidad para entrevistas del usuario logueado.
export async function GET(req: NextRequest) {
  const db = adminClient();
  const usuario = await requireUsuario(req, db);
  if (esErrorResponse(usuario)) return usuario;

  const { data, error } = await db
    .from("entrevista_disponibilidad")
    .select("id, dia_semana, hora_inicio, hora_fin, duracion_minutos, activo")
    .eq("fk_usuario", usuario.id)
    .order("dia_semana")
    .order("hora_inicio");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(req: NextRequest) {
  const db = adminClient();
  const usuario = await requireUsuario(req, db);
  if (esErrorResponse(usuario)) return usuario;
  if (!usuario.esAdmin) return NextResponse.json({ error: "Solo un admin puede configurar su disponibilidad." }, { status: 403 });

  const { diaSemana, horaInicio, horaFin, duracionMinutos } = await req.json();
  if (diaSemana === undefined || diaSemana === null || !horaInicio || !horaFin) {
    return NextResponse.json({ error: "diaSemana, horaInicio y horaFin son requeridos." }, { status: 400 });
  }
  if (horaFin <= horaInicio) return NextResponse.json({ error: "La hora de fin debe ser mayor a la de inicio." }, { status: 400 });

  const { error } = await db.from("entrevista_disponibilidad").insert({
    fk_usuario: usuario.id,
    dia_semana: diaSemana,
    hora_inicio: horaInicio,
    hora_fin: horaFin,
    duracion_minutos: duracionMinutos || 15,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
