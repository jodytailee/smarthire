import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/db-admin";
import { requireUsuario, esErrorResponse } from "@/lib/api-guard";
import { sendEmail } from "@/lib/email";
import { envolverEmailHTML } from "@/lib/email-templates";

// Marca al postulante como "entrevista" y crea la fila de agendamiento con
// su link público — el postulante reserva su propio horario por Google
// Meet desde ese link, sin necesidad de cuenta en SmartHire.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = adminClient();
  const usuario = await requireUsuario(req, db);
  if (esErrorResponse(usuario)) return usuario;
  if (!usuario.esAdmin) return NextResponse.json({ error: "Solo un admin puede agendar la entrevista." }, { status: 403 });

  const { data: post, error: fetchErr } = await db
    .from("vacante_postulacion")
    .select("primer_nombre, correo_electronico, puesto")
    .eq("id", id)
    .eq("fk_empresa", usuario.fkEmpresa)
    .single();
  if (fetchErr || !post) return NextResponse.json({ error: "Postulación no encontrada." }, { status: 404 });

  const { data: empresa } = await db.from("empresa").select("nombre").eq("id", usuario.fkEmpresa).single();
  const empresaNombre = empresa?.nombre ?? "SmartHire";

  const { data: entrevista, error: insertErr } = await db
    .from("entrevista")
    .insert({ fk_postulacion: id, fk_usuario: usuario.id, estado: "pendiente" })
    .select("token")
    .single();
  if (insertErr || !entrevista) {
    return NextResponse.json({ error: insertErr?.message ?? "No se pudo crear la entrevista." }, { status: 500 });
  }

  const { error: updateErr } = await db
    .from("vacante_postulacion")
    .update({ estado: "entrevista" })
    .eq("id", id)
    .eq("fk_empresa", usuario.fkEmpresa);
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  const link = `${req.nextUrl.origin}/postulantes/entrevista/${entrevista.token}`;

  if (post.correo_electronico) {
    await sendEmail({
      to: [post.correo_electronico],
      subject: "¡Avanzás a la siguiente etapa! — Agendá tu entrevista",
      html: envolverEmailHTML({
        empresaNombre,
        contenidoHtml: `
          <h2 style="margin:0 0 12px;font-size:20px;color:#1e293b;">¡Hola, ${post.primer_nombre}!</h2>
          <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.7;">
            Hemos completado la revisión de tu candidatura para el puesto de <strong>${post.puesto ?? "el puesto"}</strong> en ${empresaNombre}
            y queremos proceder con la siguiente etapa: una <strong>entrevista por videollamada</strong>.
          </p>
          <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.7;">
            Elegí vos mismo/a el horario que mejor te acomode desde el siguiente link — la videollamada de Google Meet se genera automáticamente:
          </p>
          <p style="margin:0 0 24px;text-align:center;">
            <a href="${link}" style="background:#2563eb;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;display:inline-block;">Elegir horario de entrevista</a>
          </p>
          <p style="margin:0;font-size:13px;color:#94a3b8;">Si el botón no funciona, copiá y pegá este link en tu navegador:<br/>${link}</p>`,
      }),
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, token: entrevista.token });
}
