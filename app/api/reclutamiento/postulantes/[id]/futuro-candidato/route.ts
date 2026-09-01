import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/db-admin";
import { requireUsuario, esErrorResponse } from "@/lib/api-guard";
import { sendEmail } from "@/lib/email";
import { envolverEmailHTML, parrafosDesdeTexto } from "@/lib/email-templates";
import { generarTextoFuturoCandidato } from "@/lib/postulantes-ia";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = adminClient();
  const usuario = await requireUsuario(req, db);
  if (esErrorResponse(usuario)) return usuario;

  const { action, texto } = (await req.json()) as { action: "generar" | "enviar"; texto?: string };

  const { data: post, error: fetchErr } = await db
    .from("vacante_postulacion")
    .select("primer_nombre, primer_apellido, correo_electronico, respuestas, puesto, texto_futuro_candidato, estado")
    .eq("id", id)
    .eq("fk_empresa", usuario.fkEmpresa)
    .single();
  if (fetchErr || !post) return NextResponse.json({ error: "Postulación no encontrada." }, { status: 404 });

  if (action === "generar") {
    const { data: empresa } = await db.from("empresa").select("nombre, descripcion").eq("id", usuario.fkEmpresa).single();
    if (!empresa) return NextResponse.json({ error: "Empresa no encontrada." }, { status: 404 });

    const nombre = `${post.primer_nombre} ${post.primer_apellido}`;
    const textoGenerado = await generarTextoFuturoCandidato({
      empresa,
      nombreCompleto: nombre,
      primerNombre: post.primer_nombre,
      puesto: post.puesto ?? "el puesto",
      respuestas: post.respuestas ?? [],
    });
    if (!textoGenerado) return NextResponse.json({ error: "No se pudo generar el texto con IA." }, { status: 500 });

    await db.from("vacante_postulacion").update({ texto_futuro_candidato: textoGenerado }).eq("id", id).eq("fk_empresa", usuario.fkEmpresa);
    return NextResponse.json({ ok: true, texto: textoGenerado });
  }

  if (action === "enviar") {
    const raw = texto?.trim() || post.texto_futuro_candidato;
    if (!raw) return NextResponse.json({ error: "No hay texto para enviar." }, { status: 400 });
    const textoFinal = String(raw);

    if (post.correo_electronico) {
      const { data: empresa } = await db.from("empresa").select("nombre").eq("id", usuario.fkEmpresa).single();
      const empresaNombre = empresa?.nombre ?? "SmartHire";

      await sendEmail({
        to: [post.correo_electronico],
        subject: `Tu perfil queda en nuestro banco de candidatos — ${empresaNombre}`,
        html: envolverEmailHTML({ empresaNombre, contenidoHtml: parrafosDesdeTexto(textoFinal) }),
      });
    }

    const { error: updateErr } = await db
      .from("vacante_postulacion")
      .update({ estado: "futuro_candidato", texto_futuro_candidato: textoFinal, futuro_candidato_enviado_at: new Date().toISOString() })
      .eq("id", id)
      .eq("fk_empresa", usuario.fkEmpresa);
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Acción no válida." }, { status: 400 });
}
