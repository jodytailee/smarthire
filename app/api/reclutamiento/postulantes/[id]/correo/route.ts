import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/db-admin";
import { requireUsuario, esErrorResponse } from "@/lib/api-guard";
import { sendEmail } from "@/lib/email";
import { envolverEmailHTML, parrafosDesdeTexto } from "@/lib/email-templates";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = adminClient();
  const usuario = await requireUsuario(req, db);
  if (esErrorResponse(usuario)) return usuario;

  const { asunto, mensaje } = (await req.json()) as { asunto?: string; mensaje?: string };
  if (!asunto?.trim() || !mensaje?.trim()) {
    return NextResponse.json({ error: "Faltan asunto o mensaje." }, { status: 400 });
  }

  const { data: post, error: fetchErr } = await db
    .from("vacante_postulacion")
    .select("primer_nombre, primer_apellido, correo_electronico")
    .eq("id", id)
    .eq("fk_empresa", usuario.fkEmpresa)
    .single();
  if (fetchErr || !post) return NextResponse.json({ error: "Postulación no encontrada." }, { status: 404 });
  if (!post.correo_electronico) return NextResponse.json({ error: "El postulante no tiene correo electrónico registrado." }, { status: 400 });

  const { data: empresa } = await db.from("empresa").select("nombre").eq("id", usuario.fkEmpresa).single();
  const empresaNombre = empresa?.nombre ?? "SmartHire";
  const nombre = `${post.primer_nombre} ${post.primer_apellido}`;

  const html = envolverEmailHTML({
    empresaNombre,
    contenidoHtml: parrafosDesdeTexto(mensaje),
    footer: `${empresaNombre} · Reclutamiento — Podés responder directamente a este correo.`,
  });

  const emailSent = await sendEmail({
    to: [post.correo_electronico],
    subject: asunto.trim(),
    html,
    from: `${empresaNombre} <${usuario.email ?? "noreply@ticoapp.lab"}>`,
    replyTo: usuario.email ?? undefined,
  });

  await db.from("correo_enviado").insert({
    fk_empresa: usuario.fkEmpresa,
    para: post.correo_electronico,
    asunto: asunto.trim(),
    html,
    modulo: "Postulantes",
    referencia: `Postulante #${id} — ${nombre}`,
    enviado: emailSent,
  });

  if (!emailSent) return NextResponse.json({ error: "No se pudo enviar el correo." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
