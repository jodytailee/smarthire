import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/db-admin";
import { getValidAccessToken, crearEventoConMeet } from "@/lib/google-calendar";
import { sendEmail } from "@/lib/email";

function sumarMinutos(hora: string, minutos: number): string {
  const [h, m] = hora.split(":").map(Number);
  const total = h * 60 + m + minutos;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function fmtHora12(hora: string): string {
  const [h, m] = hora.split(":").map(Number);
  const ampm = h >= 12 ? "p.m." : "a.m.";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { fecha, horaInicio } = await req.json();
  if (!fecha || !horaInicio) return NextResponse.json({ error: "fecha y horaInicio son requeridos." }, { status: 400 });

  const db = adminClient();

  const { data: entrevista, error: fetchErr } = await db
    .from("entrevista")
    .select(`
      id, estado, fk_usuario,
      postulacion:fk_postulacion(primer_nombre, primer_apellido, correo_electronico),
      entrevistador:fk_usuario(email, nombre)
    `)
    .eq("token", token)
    .single();

  if (fetchErr || !entrevista) return NextResponse.json({ error: "Link no encontrado o vencido." }, { status: 404 });
  const e = entrevista as any;
  if (e.estado === "confirmada") return NextResponse.json({ error: "Ya reservaste un horario para esta entrevista." }, { status: 400 });
  if (e.estado === "cancelada") return NextResponse.json({ error: "Esta entrevista fue cancelada." }, { status: 400 });

  const diaSemana = new Date(`${fecha}T00:00:00Z`).getUTCDay();
  const { data: franjas } = await db
    .from("entrevista_disponibilidad")
    .select("hora_inicio, hora_fin, duracion_minutos")
    .eq("fk_usuario", e.fk_usuario)
    .eq("dia_semana", diaSemana)
    .eq("activo", true);

  const franja = ((franjas ?? []) as any[]).find(
    (f) => horaInicio >= f.hora_inicio.slice(0, 5) && horaInicio < f.hora_fin.slice(0, 5)
  );
  if (!franja) return NextResponse.json({ error: "Ese horario ya no está disponible." }, { status: 409 });

  const horaFin = sumarMinutos(horaInicio, franja.duracion_minutos);

  const { error: updateErr } = await db
    .from("entrevista")
    .update({ fecha, hora_inicio: horaInicio, hora_fin: horaFin, estado: "confirmada", updated_at: new Date().toISOString() })
    .eq("id", e.id)
    .eq("estado", "pendiente");

  if (updateErr) {
    if ((updateErr as any).code === "23505") {
      return NextResponse.json({ error: "Ese horario se acaba de reservar — elegí otro." }, { status: 409 });
    }
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  const postulanteNombre = `${e.postulacion?.primer_nombre ?? ""} ${e.postulacion?.primer_apellido ?? ""}`.trim();
  const postulanteEmail = e.postulacion?.correo_electronico as string | null;
  const entrevistadorEmail = e.entrevistador?.email as string | null;
  const entrevistadorNombre = e.entrevistador?.nombre ?? "";

  let meetLink: string | null = null;
  try {
    const accessToken = await getValidAccessToken(db, e.fk_usuario);
    if (accessToken) {
      const emails = [postulanteEmail, entrevistadorEmail].filter(Boolean) as string[];
      const evento = await crearEventoConMeet(accessToken, {
        summary: `Entrevista: ${postulanteNombre}`,
        description: "Entrevista agendada desde SmartHire.",
        startISO: `${fecha}T${horaInicio}:00`,
        endISO: `${fecha}T${horaFin}:00`,
        attendeeEmails: emails,
      });
      meetLink = evento.meetLink;
      await db.from("entrevista").update({ google_event_id: evento.eventId, meet_link: evento.meetLink }).eq("id", e.id);
    }
  } catch (err: any) {
    console.warn("[entrevista] crearEventoConMeet:", err.message);
  }

  const fechaFmt = fecha.split("-").reverse().join("/");
  const detalle = `${fechaFmt} a las ${fmtHora12(horaInicio)}`;
  const meetHtml = meetLink
    ? `<p style="margin:20px 0 0;text-align:center;"><a href="${meetLink}" style="background:#2563eb;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">Unirse a Google Meet</a></p>`
    : `<p style="margin:16px 0 0;font-size:12px;color:#94a3b8;">El link de la videollamada se confirma por separado.</p>`;

  if (postulanteEmail) {
    await sendEmail({
      to: [postulanteEmail],
      subject: `Entrevista confirmada — ${detalle}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1e293b;">
          <div style="background:#16a34a;padding:20px 24px;border-radius:12px 12px 0 0;">
            <h1 style="margin:0;color:#fff;font-size:18px;">✅ Entrevista confirmada</h1>
          </div>
          <div style="padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
            <p style="margin:0;font-size:14px;color:#475569;">Tu entrevista quedó agendada para el <strong>${detalle}</strong>.</p>
            ${meetHtml}
          </div>
        </div>`,
    }).catch(() => {});
  }
  if (entrevistadorEmail) {
    await sendEmail({
      to: [entrevistadorEmail],
      subject: `Entrevista agendada con ${postulanteNombre} — ${detalle}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1e293b;">
          <div style="background:#1e293b;padding:20px 24px;border-radius:12px 12px 0 0;">
            <h1 style="margin:0;color:#fff;font-size:18px;">📅 Entrevista agendada</h1>
          </div>
          <div style="padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
            <p style="margin:0;font-size:14px;color:#475569;"><strong>${postulanteNombre}</strong> reservó su entrevista para el <strong>${detalle}</strong>.</p>
            ${meetHtml}
          </div>
        </div>`,
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, fecha, hora_inicio: horaInicio, hora_fin: horaFin, meet_link: meetLink, entrevistadorNombre });
}
