import type { SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/db-admin";
import { requireUsuario, esErrorResponse } from "@/lib/api-guard";
import { sendEmail } from "@/lib/email";
import { envolverEmailHTML } from "@/lib/email-templates";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = adminClient();
  const usuario = await requireUsuario(req, db);
  if (esErrorResponse(usuario)) return usuario;

  const { data, error } = await db
    .from("vacante_postulacion")
    .select("*")
    .eq("id", id)
    .eq("fk_empresa", usuario.fkEmpresa)
    .single();

  if (error || !data) return NextResponse.json({ error: "No encontrado." }, { status: 404 });

  const archivos: any[] = (data as any).archivos ?? [];
  const archivosConUrl = await Promise.all(
    archivos.map(async (a: any) => {
      if (!a.path) return a;
      const { data: signed } = await db.storage.from("postulaciones").createSignedUrl(a.path, 3600);
      return { ...a, url: signed?.signedUrl ?? null };
    })
  );

  return NextResponse.json({ ...data, archivos: archivosConUrl });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = adminClient();
  const usuario = await requireUsuario(req, db);
  if (esErrorResponse(usuario)) return usuario;

  const body = await req.json();
  const allowed = ["estado", "notas_admin"];
  const update: Record<string, any> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  if (Object.keys(update).length === 0)
    return NextResponse.json({ error: "Sin campos para actualizar." }, { status: 400 });

  const { data: actualizado, error } = await db
    .from("vacante_postulacion")
    .update(update)
    .eq("id", id)
    .eq("fk_empresa", usuario.fkEmpresa)
    .select("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!actualizado || actualizado.length === 0) return NextResponse.json({ error: "No encontrado." }, { status: 404 });

  if (update.estado) {
    await enviarEmailEstado(db, id, usuario.fkEmpresa, update.estado).catch((e) =>
      console.warn("[postulantes] email error:", e?.message)
    );
  }

  return NextResponse.json({ ok: true });
}

async function enviarEmailEstado(db: SupabaseClient, id: string, fkEmpresa: number, nuevoEstado: string) {
  const { data: post } = await db
    .from("vacante_postulacion")
    .select("primer_nombre, primer_apellido, correo_electronico, puesto")
    .eq("id", id)
    .single();
  if (!post) return;

  const { data: empresa } = await db.from("empresa").select("nombre").eq("id", fkEmpresa).single();
  const empresaNombre = empresa?.nombre ?? "SmartHire";

  const nombre = `${post.primer_nombre} ${post.primer_apellido}`;
  const correoPostulante = post.correo_electronico;
  const puesto = post.puesto ?? "el puesto";

  const { data: admins } = await db.from("usuario").select("email").eq("fk_empresa", fkEmpresa).eq("rol", "admin");
  const emailsAdmin = ((admins ?? []) as any[]).map((a) => a.email).filter(Boolean) as string[];

  if (nuevoEstado === "entrevista" && correoPostulante) {
    await sendEmail({
      to: [correoPostulante],
      subject: `¡Avanzás a la siguiente etapa! — ${empresaNombre}`,
      html: envolverEmailHTML({
        empresaNombre,
        contenidoHtml: `
          <h2 style="margin:0 0 12px;font-size:20px;color:#1e293b;">¡Hola, ${post.primer_nombre}!</h2>
          <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.7;">
            Hemos completado la revisión de tu candidatura para el puesto de <strong>${puesto}</strong> en ${empresaNombre}
            y queremos proceder con la siguiente etapa: la <strong>entrevista</strong>.
          </p>
          <div style="background:#f0fdf4;border-left:4px solid #4ade80;padding:14px 16px;border-radius:0 8px 8px 0;margin-bottom:20px;">
            <p style="margin:0;font-size:14px;color:#14532d;line-height:1.6;">
              Pronto vas a estar recibiendo nuestro mensaje con los detalles de la cita. ¡Estate pendiente!
            </p>
          </div>
          <p style="margin:0;font-size:13px;color:#94a3b8;">Gracias por tu paciencia y por tu interés en ser parte del equipo.</p>`,
      }),
    });
  }

  if (nuevoEstado === "futuro_candidato" && correoPostulante) {
    await sendEmail({
      to: [correoPostulante],
      subject: `Actualización sobre tu postulación — ${empresaNombre}`,
      html: envolverEmailHTML({
        empresaNombre,
        contenidoHtml: `
          <h2 style="margin:0 0 12px;font-size:20px;color:#1e293b;">¡Hola, ${post.primer_nombre}!</h2>
          <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.7;">
            Gracias por tu interés en el puesto de <strong>${puesto}</strong> en ${empresaNombre} y por el tiempo que dedicaste a nuestro proceso.
          </p>
          <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.7;">
            La posición ha sido cubierta y por ahora no continuaremos con tu proceso.
            Sin embargo, tu perfil es de nuestro interés y te contactaremos cuando surjan nuevas oportunidades.
          </p>
          <div style="background:#fffbeb;border-left:4px solid #fbbf24;padding:14px 16px;border-radius:0 8px 8px 0;margin-bottom:20px;">
            <p style="margin:0;font-size:14px;color:#78350f;line-height:1.6;">
              Tu información quedará guardada en nuestro banco de candidatos activos.
            </p>
          </div>
          <p style="margin:0;font-size:13px;color:#94a3b8;">Gracias por confiar en ${empresaNombre}.</p>`,
      }),
    });
  }

  if (nuevoEstado === "en_revision") {
    if (correoPostulante) {
      await sendEmail({
        to: [correoPostulante],
        subject: `Tu postulación en ${empresaNombre} está siendo revisada`,
        html: envolverEmailHTML({
          empresaNombre,
          contenidoHtml: `
            <h2 style="margin:0 0 12px;font-size:20px;color:#1e293b;">¡Hola, ${post.primer_nombre}!</h2>
            <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.6;">
              Queremos informarte que tu postulación para el puesto de <strong>${puesto}</strong> en ${empresaNombre}
              está siendo revisada por nuestro equipo.
            </p>
            <div style="background:#f0f9ff;border-left:4px solid #0ea5e9;padding:14px 16px;border-radius:0 8px 8px 0;margin-bottom:20px;">
              <p style="margin:0;font-size:14px;color:#0c4a6e;line-height:1.6;">
                Pronto te daremos una respuesta. Te contactaremos a este correo o al teléfono que nos proporcionaste.
              </p>
            </div>
            <p style="margin:0;font-size:13px;color:#94a3b8;">Gracias por tu interés en formar parte del equipo.</p>`,
        }),
      });
    }

    if (emailsAdmin.length > 0) {
      await sendEmail({
        to: emailsAdmin,
        subject: `📋 Postulante en revisión — ${nombre}`,
        html: envolverEmailHTML({
          empresaNombre,
          contenidoHtml: `
            <p style="margin:0 0 16px;font-size:14px;color:#475569;">
              El postulante <strong>${nombre}</strong> para el puesto de <strong>${puesto}</strong>
              ha sido marcado como <span style="background:#dbeafe;color:#1d4ed8;font-weight:600;padding:2px 8px;border-radius:4px;">En revisión</span>.
            </p>
            ${correoPostulante ? `<p style="margin:0 0 16px;font-size:13px;color:#64748b;">Se envió notificación automática al postulante: <strong>${correoPostulante}</strong></p>` : ""}
            <p style="font-size:12px;color:#94a3b8;margin:0;">Ingresá a SmartHire → Postulantes para continuar la gestión (ID #${id}).</p>`,
        }),
      });
    }
  }
}
