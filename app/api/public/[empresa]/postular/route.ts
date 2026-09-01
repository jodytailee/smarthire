import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/db-admin";
import { sendEmail } from "@/lib/email";
import { scorearPostulacion, type Respuesta } from "@/lib/postulantes-ia";
import { prepararArchivosParaIA, type Archivo } from "@/lib/archivos-postulante";

export async function POST(req: NextRequest, { params }: { params: Promise<{ empresa: string }> }) {
  const { empresa: empresaSlug } = await params;
  const db = adminClient();

  const { data: empresa } = await db.from("empresa").select("id, nombre, descripcion").eq("slug", empresaSlug).maybeSingle();
  if (!empresa) return NextResponse.json({ error: "Empresa no encontrada." }, { status: 404 });

  const body = await req.json();
  const {
    tipo_identificacion,
    numero_identificacion,
    primer_nombre,
    primer_apellido,
    correo_electronico,
    telefono,
    lugares,
    archivos,
    respuestas,
    puesto,
    vacante_id,
  } = body as {
    tipo_identificacion: string;
    numero_identificacion: string;
    primer_nombre: string;
    primer_apellido: string;
    correo_electronico: string;
    telefono: string;
    lugares: string[];
    archivos: Archivo[];
    respuestas: Respuesta[];
    puesto?: string;
    vacante_id?: number;
  };

  if (!primer_nombre || !primer_apellido || !correo_electronico || !telefono || !Array.isArray(respuestas)) {
    return NextResponse.json({ error: "Faltan campos obligatorios." }, { status: 400 });
  }

  const tiposArchivos = (Array.isArray(archivos) ? archivos : []).map((a) => a.tipo);
  if (!tiposArchivos.includes("cedula_frente") || !tiposArchivos.includes("cedula_dorso")) {
    return NextResponse.json({ error: "Falta la foto de la cédula (frente y dorso)." }, { status: 400 });
  }

  const nombre = `${primer_nombre.trim()} ${primer_apellido.trim()}`;

  // La jornada la fija la publicación (reclutador), no el postulante.
  let jornada: string | null = null;
  let puestoFinal = puesto?.trim() || "Puesto sin nombre";
  if (vacante_id) {
    const { data: vac } = await db
      .from("vacante")
      .select("tipo_jornada, puesto:fk_plantilla_puesto(nombre)")
      .eq("id", vacante_id)
      .eq("fk_empresa", empresa.id)
      .single();
    if (vac) {
      jornada = (vac as any).tipo_jornada;
      puestoFinal = (vac as any).puesto?.nombre ?? puestoFinal;
    }
  }

  const docs = await prepararArchivosParaIA(db, Array.isArray(archivos) ? archivos : []);
  const { puntaje, analisis, sugerencias, pretension_monto, canton_residencia } = await scorearPostulacion({
    empresa,
    nombreCandidato: nombre,
    puesto: puestoFinal,
    respuestas,
    docs,
    incluirPretension: true,
  });

  const { data: postulacion, error: errPost } = await db
    .from("vacante_postulacion")
    .insert({
      fk_empresa: empresa.id,
      fk_vacante: vacante_id ?? null,
      tipo_identificacion,
      numero_identificacion: numero_identificacion?.trim() || null,
      primer_nombre: primer_nombre.trim(),
      primer_apellido: primer_apellido.trim(),
      correo_electronico: correo_electronico.trim(),
      telefono: telefono.trim(),
      archivos: Array.isArray(archivos) ? archivos : [],
      respuestas,
      lugares: Array.isArray(lugares) ? lugares : [],
      jornada,
      puesto: puestoFinal,
      pretension_monto: pretension_monto ?? null,
      canton_residencia: canton_residencia ?? null,
      puntaje,
      analisis_ia: analisis,
      sugerencias_ia: sugerencias,
      estado: "pendiente",
    })
    .select("id")
    .single();

  if (errPost || !postulacion) {
    console.error("[public/postular] insert error:", errPost);
    return NextResponse.json({ error: "No se pudo guardar la postulación." }, { status: 500 });
  }

  // Correo a los admins de la empresa.
  const { data: admins } = await db.from("usuario").select("email").eq("fk_empresa", empresa.id).eq("rol", "admin");
  const emails = ((admins ?? []) as any[]).map((a) => a.email).filter(Boolean) as string[];

  if (emails.length > 0) {
    const puntajeColor = puntaje === null ? "#94a3b8" : puntaje >= 75 ? "#16a34a" : puntaje >= 50 ? "#d97706" : "#dc2626";
    const puntajeLabel = puntaje === null ? "Pendiente" : puntaje >= 75 ? "Alto" : puntaje >= 50 ? "Medio" : "Bajo";
    const archivosLista = (archivos ?? []).length > 0
      ? `<p style="font-size:13px;color:#334155;"><strong>Documentos adjuntos:</strong> ${archivos.map((a) => a.nombre).join(", ")}</p>`
      : "";

    const resumenRespuestas = respuestas
      .map((r, i) => `
        <tr>
          <td style="padding:8px 12px;color:#64748b;vertical-align:top;font-size:12px;width:40%;">${i + 1}. ${r.pregunta}</td>
          <td style="padding:8px 12px;font-size:12px;vertical-align:top;">${r.respuesta}</td>
        </tr>`)
      .join("");

    await sendEmail({
      to: emails,
      subject: `🧑‍💼 Nueva postulación ${puestoFinal} — ${nombre} (${puntaje}/100)`,
      html: `
        <div style="font-family:sans-serif;max-width:680px;margin:0 auto;color:#1e293b;">
          <div style="background:#1e293b;padding:20px 24px;border-radius:12px 12px 0 0;">
            <h1 style="margin:0;color:#fff;font-size:18px;">🧑‍💼 Nueva postulación — ${puestoFinal}</h1>
          </div>
          <div style="padding:20px 24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
            <table cellpadding="6" style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px;">
              <tr><td style="color:#64748b;">Candidato/a:</td><td><strong>${nombre}</strong></td></tr>
              <tr><td style="color:#64748b;">ID:</td><td>${tipo_identificacion ?? ""} ${numero_identificacion ?? ""}</td></tr>
              <tr><td style="color:#64748b;">Correo:</td><td><a href="mailto:${correo_electronico}" style="color:#2563eb;">${correo_electronico}</a></td></tr>
              <tr><td style="color:#64748b;">Teléfono:</td><td><strong>${telefono}</strong></td></tr>
              <tr><td style="color:#64748b;">Jornada:</td><td>${jornada === "tiempo_completo" ? "Tiempo completo" : jornada === "medio_tiempo" ? "Medio tiempo" : jornada === "temporada" ? "Temporada" : "—"}</td></tr>
              ${Array.isArray(lugares) && lugares.length > 0 ? `<tr><td style="color:#64748b;vertical-align:top;">Lugares:</td><td>${lugares.join(", ")}</td></tr>` : ""}
              <tr>
                <td style="color:#64748b;">Puntaje IA:</td>
                <td>
                  <strong style="color:${puntajeColor};font-size:20px;">${puntaje !== null ? `${puntaje}/100` : "—"}</strong>
                  <span style="background:${puntajeColor}22;color:${puntajeColor};font-size:11px;font-weight:600;padding:2px 8px;border-radius:20px;margin-left:8px;">${puntajeLabel}</span>
                </td>
              </tr>
            </table>

            ${archivosLista}

            ${analisis ? `
            <div style="background:#f8fafc;border-left:4px solid #e2e8f0;padding:12px 16px;border-radius:0 8px 8px 0;margin:16px 0;">
              <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#475569;text-transform:uppercase;letter-spacing:.05em;">Análisis de IA</p>
              <p style="margin:0;font-size:13px;color:#334155;line-height:1.6;">${analisis}</p>
            </div>` : ""}

            ${sugerencias ? `
            <div style="background:#f0fdf4;border-left:4px solid #86efac;padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:20px;">
              <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#166534;text-transform:uppercase;letter-spacing:.05em;">Preguntas sugeridas para follow-up</p>
              <p style="margin:0;font-size:13px;color:#14532d;line-height:1.6;white-space:pre-wrap;">${sugerencias}</p>
            </div>` : ""}

            <details style="margin-bottom:16px;">
              <summary style="cursor:pointer;font-size:13px;font-weight:600;color:#475569;padding:8px 0;">Ver respuestas completas</summary>
              <table cellpadding="0" style="width:100%;border-collapse:collapse;margin-top:12px;">
                <thead>
                  <tr style="background:#f1f5f9;">
                    <th style="padding:8px 12px;text-align:left;color:#64748b;font-size:12px;">Pregunta</th>
                    <th style="padding:8px 12px;text-align:left;color:#64748b;font-size:12px;">Respuesta</th>
                  </tr>
                </thead>
                <tbody>${resumenRespuestas}</tbody>
              </table>
            </details>

            <p style="font-size:11px;color:#94a3b8;margin:0;">
              Ingresá a SmartHire → Postulantes para gestionar esta postulación (ID #${postulacion.id}).
            </p>
          </div>
        </div>`,
    });
  }

  return NextResponse.json({ ok: true, id: postulacion.id });
}
