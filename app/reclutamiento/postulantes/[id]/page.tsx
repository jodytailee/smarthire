"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { apiJSON } from "@/lib/api-client";

type Estado = "pendiente" | "en_revision" | "entrevista" | "contratado" | "rechazado" | "futuro_candidato";
type Respuesta = { pregunta: string; respuesta: string };
type Archivo = { tipo: string; nombre: string; path: string; url?: string | null };

type Postulante = {
  id: number;
  primer_nombre: string;
  primer_apellido: string;
  correo_electronico: string | null;
  telefono: string | null;
  tipo_identificacion: string | null;
  numero_identificacion: string | null;
  puntaje: number | null;
  analisis_ia: string | null;
  sugerencias_ia: string | null;
  estado: Estado;
  puesto: string | null;
  jornada: string | null;
  lugares: string[];
  canton_residencia: string | null;
  pretension_monto: number | null;
  notas_admin: string | null;
  respuestas: Respuesta[];
  archivos: Archivo[];
  texto_rechazo: string | null;
  texto_futuro_candidato: string | null;
  created_at: string;
};

const ESTADO_LABEL: Record<Estado, string> = {
  pendiente: "Pendiente",
  en_revision: "En revisión",
  entrevista: "Entrevista",
  contratado: "Contratado",
  rechazado: "Rechazado",
  futuro_candidato: "Futuro candidato",
};

export default function PostulanteDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [post, setPost] = useState<Postulante | null>(null);
  const [tab, setTab] = useState<"resumen" | "respuestas" | "documentos">("resumen");
  const [notas, setNotas] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Rechazo / futuro candidato: borrador editable
  const [rechazoAbierto, setRechazoAbierto] = useState(false);
  const [rechazoTexto, setRechazoTexto] = useState("");
  const [futuroAbierto, setFuturoAbierto] = useState(false);
  const [futuroTexto, setFuturoTexto] = useState("");

  async function cargar() {
    const data = await apiJSON<Postulante>(`/api/reclutamiento/postulantes/${id}`);
    setPost(data);
    setNotas(data.notas_admin ?? "");
    setRechazoTexto(data.texto_rechazo ?? "");
    setFuturoTexto(data.texto_futuro_candidato ?? "");
  }

  useEffect(() => { cargar(); }, [id]);

  async function cambiarEstado(estado: Estado) {
    setBusy("estado");
    setError(null);
    try {
      await apiJSON(`/api/reclutamiento/postulantes/${id}`, { method: "PATCH", body: JSON.stringify({ estado }) });
      await cargar();
    } catch (e: any) { setError(e.message); } finally { setBusy(null); }
  }

  async function guardarNotas() {
    setBusy("notas");
    try {
      await apiJSON(`/api/reclutamiento/postulantes/${id}`, { method: "PATCH", body: JSON.stringify({ notas_admin: notas }) });
    } catch (e: any) { setError(e.message); } finally { setBusy(null); }
  }

  async function reAnalizar() {
    setBusy("analisis");
    setError(null);
    try {
      await apiJSON(`/api/reclutamiento/postulantes/${id}/analisis`, { method: "POST" });
      await cargar();
    } catch (e: any) { setError(e.message); } finally { setBusy(null); }
  }

  async function agendarEntrevista() {
    if (!confirm("¿Agendar entrevista y enviar el link de reserva al postulante?")) return;
    setBusy("entrevista");
    setError(null);
    try {
      await apiJSON(`/api/reclutamiento/postulantes/${id}/agendar-entrevista`, { method: "POST" });
      await cargar();
    } catch (e: any) { setError(e.message); } finally { setBusy(null); }
  }

  async function generarRechazo() {
    setBusy("rechazo-generar");
    setError(null);
    try {
      const r = await apiJSON<{ texto: string }>(`/api/reclutamiento/postulantes/${id}/rechazo`, {
        method: "POST", body: JSON.stringify({ action: "generar" }),
      });
      setRechazoTexto(r.texto);
    } catch (e: any) { setError(e.message); } finally { setBusy(null); }
  }

  async function enviarRechazo() {
    if (!confirm("¿Enviar este rechazo al postulante?")) return;
    setBusy("rechazo-enviar");
    setError(null);
    try {
      await apiJSON(`/api/reclutamiento/postulantes/${id}/rechazo`, {
        method: "POST", body: JSON.stringify({ action: "enviar", texto: rechazoTexto }),
      });
      await cargar();
      setRechazoAbierto(false);
    } catch (e: any) { setError(e.message); } finally { setBusy(null); }
  }

  async function generarFuturo() {
    setBusy("futuro-generar");
    setError(null);
    try {
      const r = await apiJSON<{ texto: string }>(`/api/reclutamiento/postulantes/${id}/futuro-candidato`, {
        method: "POST", body: JSON.stringify({ action: "generar" }),
      });
      setFuturoTexto(r.texto);
    } catch (e: any) { setError(e.message); } finally { setBusy(null); }
  }

  async function enviarFuturo() {
    if (!confirm("¿Enviar este correo de futuro candidato?")) return;
    setBusy("futuro-enviar");
    setError(null);
    try {
      await apiJSON(`/api/reclutamiento/postulantes/${id}/futuro-candidato`, {
        method: "POST", body: JSON.stringify({ action: "enviar", texto: futuroTexto }),
      });
      await cargar();
      setFuturoAbierto(false);
    } catch (e: any) { setError(e.message); } finally { setBusy(null); }
  }

  if (!post) return <p className="text-sm text-slate-400">Cargando…</p>;

  return (
    <div>
      <Link href="/reclutamiento/postulantes" className="mb-4 inline-block text-xs text-slate-400 hover:text-slate-600">
        ← Postulantes
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-xl font-bold text-rose-700">
            {post.primer_nombre.charAt(0).toUpperCase()}
          </span>
          <div>
            <h1 className="text-lg font-bold text-slate-900">{post.primer_nombre} {post.primer_apellido}</h1>
            <p className="text-sm text-slate-500">{post.puesto} · {post.correo_electronico} · {post.telefono}</p>
            <span className="mt-1 inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
              {ESTADO_LABEL[post.estado]}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-slate-400">Puntaje IA</p>
          <p className="text-3xl font-bold text-slate-900">{post.puntaje ?? "—"}</p>
        </div>
      </div>

      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="mb-6 flex flex-wrap gap-2">
        {post.estado === "pendiente" && (
          <>
            <button onClick={() => cambiarEstado("en_revision")} disabled={!!busy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
              Marcar en revisión
            </button>
            <button onClick={() => cambiarEstado("rechazado")} disabled={!!busy} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
              Rechazar directo
            </button>
          </>
        )}
        {post.estado === "entrevista" && (
          <>
            <button onClick={() => cambiarEstado("contratado")} disabled={!!busy} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">
              Marcar contratado
            </button>
            <button onClick={() => cambiarEstado("rechazado")} disabled={!!busy} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
              Rechazar
            </button>
          </>
        )}
      </div>

      {post.estado === "en_revision" && (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50/40 p-6">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-rose-700">Tarjeta de decisión</h2>

          <div className="mb-4">
            <button onClick={agendarEntrevista} disabled={!!busy} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
              {busy === "entrevista" ? "Agendando…" : "📅 Agendar entrevista"}
            </button>
          </div>

          <div className="mb-4 rounded-lg border border-slate-200 bg-white">
            <button onClick={() => setFuturoAbierto((v) => !v)} className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-slate-700">
              🌱 Posible futuro candidato
              <span className="text-xs text-slate-400">{futuroAbierto ? "ocultar" : "abrir"}</span>
            </button>
            {futuroAbierto && (
              <div className="border-t border-slate-100 p-4">
                <button onClick={generarFuturo} disabled={!!busy} className="mb-2 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                  {busy === "futuro-generar" ? "Generando…" : "✨ Generar borrador con IA"}
                </button>
                <textarea value={futuroTexto} onChange={(e) => setFuturoTexto(e.target.value)} rows={6}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none" />
                <button onClick={enviarFuturo} disabled={!!busy || !futuroTexto.trim()} className="mt-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50">
                  {busy === "futuro-enviar" ? "Enviando…" : "Mandar correo"}
                </button>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white">
            <button onClick={() => setRechazoAbierto((v) => !v)} className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-slate-700">
              ✕ Rechazar postulante
              <span className="text-xs text-slate-400">{rechazoAbierto ? "ocultar" : "abrir"}</span>
            </button>
            {rechazoAbierto && (
              <div className="border-t border-slate-100 p-4">
                <button onClick={generarRechazo} disabled={!!busy} className="mb-2 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                  {busy === "rechazo-generar" ? "Generando…" : "✨ Generar borrador con IA"}
                </button>
                <textarea value={rechazoTexto} onChange={(e) => setRechazoTexto(e.target.value)} rows={6}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none" />
                <button onClick={enviarRechazo} disabled={!!busy || !rechazoTexto.trim()} className="mt-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                  {busy === "rechazo-enviar" ? "Enviando…" : "Mandar rechazo"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mb-4 flex gap-2 border-b border-slate-200">
        {(["resumen", "respuestas", "documentos"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold capitalize ${tab === t ? "border-b-2 border-rose-600 text-rose-700" : "text-slate-500"}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "resumen" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div><p className="text-xs text-slate-400">Jornada</p><p className="font-semibold">{post.jornada ?? "—"}</p></div>
            <div><p className="text-xs text-slate-400">Lugares</p><p className="font-semibold">{(post.lugares ?? []).join(", ") || "—"}</p></div>
            <div><p className="text-xs text-slate-400">Cantón</p><p className="font-semibold">{post.canton_residencia ?? "—"}</p></div>
            <div><p className="text-xs text-slate-400">Pretensión</p><p className="font-semibold">{post.pretension_monto ? `₡${post.pretension_monto.toLocaleString("es-CR")}` : "—"}</p></div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-700">Análisis de IA</h3>
              <button onClick={reAnalizar} disabled={!!busy} className="text-xs font-semibold text-rose-600 hover:text-rose-700 disabled:opacity-50">
                {busy === "analisis" ? "Analizando…" : "↻ Re-analizar"}
              </button>
            </div>
            <p className="text-sm text-slate-600">{post.analisis_ia ?? "Sin análisis todavía."}</p>
            {post.sugerencias_ia && (
              <div className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-800 whitespace-pre-wrap">{post.sugerencias_ia}</div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-2 text-sm font-bold text-slate-700">Notas internas</h3>
            <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none" />
            <button onClick={guardarNotas} disabled={busy === "notas"} className="mt-2 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50">
              Guardar notas
            </button>
          </div>
        </div>
      )}

      {tab === "respuestas" && (
        <div className="space-y-3">
          {(post.respuestas ?? []).map((r, i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold text-slate-400">{i + 1}. {r.pregunta}</p>
              <p className="mt-1 text-sm text-slate-700">{r.respuesta}</p>
            </div>
          ))}
        </div>
      )}

      {tab === "documentos" && (
        <div className="grid gap-3 sm:grid-cols-2">
          {(post.archivos ?? []).map((a, i) => (
            <div key={i} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
              <div>
                <p className="text-sm font-semibold text-slate-700">{a.tipo}</p>
                <p className="text-xs text-slate-400">{a.nombre}</p>
              </div>
              {a.url && (
                <a href={a.url} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50">
                  Descargar
                </a>
              )}
            </div>
          ))}
          {(post.archivos ?? []).length === 0 && <p className="text-sm text-slate-400">Sin documentos.</p>}
        </div>
      )}
    </div>
  );
}
