import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/db-admin";
import { requireUsuario, esErrorResponse } from "@/lib/api-guard";

export async function GET(req: NextRequest) {
  const db = adminClient();
  const usuario = await requireUsuario(req, db);
  if (esErrorResponse(usuario)) return usuario;

  const { data, error } = await db
    .from("localidad")
    .select("id, nombre")
    .eq("fk_empresa", usuario.fkEmpresa)
    .order("nombre");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const db = adminClient();
  const usuario = await requireUsuario(req, db);
  if (esErrorResponse(usuario)) return usuario;

  const { nombre } = await req.json();
  if (!nombre?.trim()) return NextResponse.json({ error: "El nombre es requerido." }, { status: 400 });

  const { data, error } = await db
    .from("localidad")
    .insert({ fk_empresa: usuario.fkEmpresa, nombre: nombre.trim() })
    .select("id, nombre")
    .single();
  if (error || !data) return NextResponse.json({ error: error?.message ?? "No se pudo crear." }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}
