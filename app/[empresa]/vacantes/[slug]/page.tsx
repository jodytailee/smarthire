"use client";

import { useState, useRef, useEffect, use } from "react";
import Link from "next/link";
import { comprimirImagen } from "@/lib/comprimir-imagen";

type Pregunta = { id: string; texto: string };
type Escenario = { id: string; situacion: string; preguntas: Pregunta[] };
type TipoDoc = { id: string; label: string; obligatorio: boolean };

type Vacante = {
  id: number;
  empresa: string;
  titulo: string;
  slug: string;
  resumen: string | null;
  tipo_jornada: "tiempo_completo" | "medio_tiempo" | "temporada";
  preguntas: Pregunta[];
  escenarios: Escenario[];
  tipos_documento: TipoDoc[];
  color: "rose" | "slate";
  localidades: string[];
};

const JORNADA_LABEL: Record<string, string> = {
  tiempo_completo: "Tiempo completo",
  medio_tiempo: "Medio tiempo",
  temporada: "Temporada",
};

type Step = "registro" | "documentos" | "prueba" | "confirmacion";

interface RegistroData {
  tipo_identificacion: string;
  numero_identificacion: string;
  primer_nombre: string;
  primer_apellido: string;
  correo_electronico: string;
  telefono: string;
}

interface ArchivoSubido {
  tipo: string;
  nombre: string;
  path: string;
  estado: "subiendo" | "listo" | "error";
  error?: string;
}

const DOCS_CEDULA: TipoDoc[] = [
  { id: "cedula_frente", label: "Cédula de identidad (frente)", obligatorio: true },
  { id: "cedula_dorso", label: "Cédula de identidad (dorso)", obligatorio: true },
];

function makeSessionId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
const SESSION_ID = makeSessionId();

const EMPTY_REGISTRO: RegistroData = {
  tipo_identificacion: "cedula",
  numero_identificacion: "",
  primer_nombre: "",
  primer_apellido: "",
  correo_electronico: "",
  telefono: "",
};

export default function PostularVacantePage({ params }: { params: Promise<{ empresa: string; slug: string }> }) {
  const { empresa, slug } = use(params);

  const [vacante, setVacante] = useState<Vacante | null>(null);
  const [cargando, setCargando] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [step, setStep] = useState<Step>("registro");
  const [registro, setRegistro] = useState<RegistroData>(EMPTY_REGISTRO);
  const [lugares, setLugares] = useState<string[]>([]);
  const [archivos, setArchivos] = useState<ArchivoSubido[]>([]);
  const [respuestas, setRespuestas] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    fetch(`/api/public/${empresa}/vacantes/${slug}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setNotFound(true); return; }
        setVacante(d);
        if (d.localidades?.length === 1) setLugares([d.localidades[0]]);
      })
      .catch(() => setNotFound(true))
      .finally(() => setCargando(false));
  }, [empresa, slug]);

  const accent = vacante?.color === "slate"
    ? { btn: "bg-slate-700 hover:bg-slate-800 active:bg-slate-900", ring: "focus:ring-slate-500", text: "text-slate-700", badge: "bg-slate-100 text-slate-600", pill: "bg-slate-50 border-slate-400 text-slate-700" }
    : { btn: "bg-rose-600 hover:bg-rose-700 active:bg-rose-800", ring: "focus:ring-rose-500", text: "text-rose-600", badge: "bg-rose-100 text-rose-600", pill: "bg-rose-50 border-rose-400 text-rose-700" };

  function handleRegistroChange(field: keyof RegistroData, value: string) {
    setRegistro((prev) => ({ ...prev, [field]: value }));
  }

  function toggleLugar(lugar: string) {
    setLugares((prev) => (prev.includes(lugar) ? prev.filter((l) => l !== lugar) : [...prev, lugar]));
  }

  function validarRegistro() {
    if (!registro.numero_identificacion.trim()) return "Ingresá tu número de identificación.";
    if (!registro.primer_nombre.trim()) return "Ingresá tu nombre.";
    if (!registro.primer_apellido.trim()) return "Ingresá tu apellido.";
    if (!registro.correo_electronico.trim() || !registro.correo_electronico.includes("@"))
      return "Ingresá un correo electrónico válido.";
    if (!registro.telefono.trim()) return "Ingresá tu número de teléfono.";
    if (lugares.length === 0) return "Seleccioná al menos un lugar al que podés trasladarte.";
    return null;
  }

  function irADocumentos() {
    const err = validarRegistro();
    if (err) { setError(err); return; }
    setError("");
    setStep("documentos");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleFileChange(tipo: string, file: File | null) {
    if (!file) return;
    const idx = archivos.findIndex((a) => a.tipo === tipo);
    const nuevo: ArchivoSubido = { tipo, nombre: file.name, path: "", estado: "subiendo" };
    if (idx >= 0) setArchivos((prev) => prev.map((a, i) => (i === idx ? nuevo : a)));
    else setArchivos((prev) => [...prev, nuevo]);

    try {
      const comprimido = await comprimirImagen(file);
      const fd = new FormData();
      fd.append("file", comprimido);
      fd.append("tipo", tipo);
      fd.append("session", SESSION_ID);
      const res = await fetch(`/api/public/${empresa}/upload`, { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al subir.");
      setArchivos((prev) => prev.map((a) => (a.tipo === tipo && a.nombre === file.name ? { ...a, path: json.path, estado: "listo" } : a)));
    } catch (e: any) {
      setArchivos((prev) => prev.map((a) => (a.tipo === tipo && a.nombre === file.name ? { ...a, estado: "error", error: e.message } : a)));
    }
  }

  function haySubiendoArchivos() {
    return archivos.some((a) => a.estado === "subiendo");
  }

  function validarDocumentos() {
    for (const doc of DOCS_CEDULA) {
      const adjunto = archivos.find((a) => a.tipo === doc.id);
      if (!adjunto || adjunto.estado !== "listo") return "Subí la foto de ambos lados de tu cédula para continuar.";
    }
    return null;
  }

  function handleRespuesta(id: string, value: string) {
    setRespuestas((prev) => ({ ...prev, [id]: value }));
  }

  function validarPrueba() {
    if (!vacante) return "Cargando…";
    for (const p of vacante.preguntas) {
      if (!respuestas[p.id]?.trim()) return `Por favor respondé: "${p.texto.slice(0, 55)}…"`;
    }
    for (const e of vacante.escenarios) {
      for (const p of e.preguntas) {
        if (!respuestas[p.id]?.trim()) return `Por favor respondé todas las preguntas del Escenario ${vacante.escenarios.indexOf(e) + 1}.`;
      }
    }
    return null;
  }

  async function handleEnviar() {
    if (!vacante) return;
    const errDocs = validarDocumentos();
    if (errDocs) { setError(errDocs); setStep("documentos"); return; }
    const err = validarPrueba();
    if (err) { setError(err); return; }
    if (haySubiendoArchivos()) { setError("Esperá a que terminen de subir los archivos."); return; }
    setError("");
    setEnviando(true);

    try {
      const payload = {
        ...registro,
        lugares,
        puesto: vacante.titulo,
        vacante_id: vacante.id,
        archivos: archivos.filter((a) => a.estado === "listo").map(({ tipo, nombre, path }) => ({ tipo, nombre, path })),
        respuestas: [
          ...vacante.preguntas.map((p) => ({ pregunta: p.texto, respuesta: respuestas[p.id] ?? "" })),
          ...vacante.escenarios.flatMap((e, ei) =>
            e.preguntas.map((p) => ({ pregunta: `Escenario ${ei + 1}: ${e.situacion} — ${p.texto}`, respuesta: respuestas[p.id] ?? "" }))
          ),
        ],
      };

      const res = await fetch(`/api/public/${empresa}/postular`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al enviar la postulación.");
      setStep("confirmacion");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: any) {
      setError(e.message ?? "Ocurrió un error. Intentá de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  if (cargando) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-400">Cargando…</div>;
  }
  if (notFound || !vacante) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-lg font-semibold text-slate-700">Esta vacante ya no está disponible.</p>
        <Link href={`/${empresa}/vacantes`} className="text-sm font-medium text-rose-600 underline hover:text-rose-800">Ver vacantes activas</Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-rose-50 to-slate-100">
      <header className="bg-slate-900 px-6 py-3.5">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Link href={`/${empresa}/vacantes`} className="text-sm font-bold text-white">{vacante.empresa}</Link>
          <span className="text-xs text-slate-500">Aplicación — {vacante.titulo}</span>
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        {step !== "confirmacion" && (
          <div className="mb-8 flex items-center gap-2">
            <StepBadge num={1} active={step === "registro"} done={step !== "registro"} label="Datos" accent={accent} />
            <div className={`h-0.5 flex-1 rounded ${step !== "registro" ? (vacante.color === "slate" ? "bg-slate-500" : "bg-rose-400") : "bg-slate-200"}`} />
            <StepBadge num={2} active={step === "documentos"} done={step === "prueba"} label="Documentos" accent={accent} />
            <div className={`h-0.5 flex-1 rounded ${step === "prueba" ? (vacante.color === "slate" ? "bg-slate-500" : "bg-rose-400") : "bg-slate-200"}`} />
            <StepBadge num={3} active={step === "prueba"} done={false} label="Prueba" accent={accent} />
          </div>
        )}

        {step === "registro" && (
          <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Datos personales</h2>
              <p className="mt-1 text-sm text-slate-500">Tu información de contacto para hacerte llegar nuestra respuesta.</p>
              <span className={`mt-2 inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${accent.badge}`}>
                {JORNADA_LABEL[vacante.tipo_jornada]}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Tipo de identificación</label>
                <select value={registro.tipo_identificacion} onChange={(e) => handleRegistroChange("tipo_identificacion", e.target.value)}
                  className={`w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${accent.ring}`}>
                  <option value="cedula">Cédula de identidad</option>
                  <option value="dimex">DIMEX</option>
                  <option value="pasaporte">Pasaporte</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Número de identificación</label>
                <input type="text" value={registro.numero_identificacion} onChange={(e) => handleRegistroChange("numero_identificacion", e.target.value)}
                  placeholder="Ej: 1-1234-5678" className={`w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${accent.ring}`} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Nombre</label>
                <input type="text" value={registro.primer_nombre} onChange={(e) => handleRegistroChange("primer_nombre", e.target.value)}
                  placeholder="Tu nombre" className={`w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${accent.ring}`} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Apellido</label>
                <input type="text" value={registro.primer_apellido} onChange={(e) => handleRegistroChange("primer_apellido", e.target.value)}
                  placeholder="Tu apellido" className={`w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${accent.ring}`} />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Correo electrónico</label>
                <input type="email" value={registro.correo_electronico} onChange={(e) => handleRegistroChange("correo_electronico", e.target.value)}
                  placeholder="tucorreo@ejemplo.com" className={`w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${accent.ring}`} />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Teléfono</label>
                <input type="tel" value={registro.telefono} onChange={(e) => handleRegistroChange("telefono", e.target.value)}
                  placeholder="8888-8888" className={`w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${accent.ring}`} />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {vacante.localidades.length > 1
                    ? <>Lugares a los que podría trasladarse <span className="ml-1 font-normal text-slate-400">(seleccioná todos los que apliquen)</span></>
                    : "Lugar de trabajo"}
                </label>
                {vacante.localidades.length > 1 ? (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {vacante.localidades.map((lugar) => {
                      const sel = lugares.includes(lugar);
                      return (
                        <button key={lugar} type="button" onClick={() => toggleLugar(lugar)}
                          className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${sel ? `${accent.pill} font-medium` : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}>
                          <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors ${sel ? (vacante.color === "slate" ? "border-slate-700 bg-slate-700" : "border-rose-600 bg-rose-600") : "border-slate-300"}`}>
                            {sel && <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 text-white" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                          </span>
                          {lugar}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                    {vacante.localidades[0] ?? "—"}
                  </div>
                )}
              </div>
            </div>

            {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

            <button onClick={irADocumentos} className={`w-full rounded-xl py-3 text-sm font-semibold text-white transition-colors ${accent.btn}`}>
              Continuar →
            </button>
          </div>
        )}

        {step === "documentos" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-800">Documentos adjuntos</h2>
              <p className="mt-1 text-sm text-slate-500">
                La foto de tu cédula (frente y dorso) es obligatoria. Los demás documentos son opcionales. Formatos aceptados: PDF, imagen, Word. Máx 10 MB por archivo.
              </p>
            </div>

            {[...DOCS_CEDULA, ...vacante.tipos_documento].map((tipo) => {
              const adjunto = archivos.find((a) => a.tipo === tipo.id);
              return (
                <div key={tipo.id} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800">
                      {tipo.label} {tipo.obligatorio && <span className="text-red-500">*</span>}
                    </p>
                    {adjunto ? (
                      <p className={`mt-0.5 truncate text-xs ${adjunto.estado === "listo" ? "text-green-600" : adjunto.estado === "error" ? "text-red-500" : "text-slate-400"}`}>
                        {adjunto.estado === "subiendo" && "Subiendo…"}
                        {adjunto.estado === "listo" && `✓ ${adjunto.nombre}`}
                        {adjunto.estado === "error" && `Error: ${adjunto.error ?? "Intentá de nuevo"}`}
                      </p>
                    ) : <p className="mt-0.5 text-xs text-slate-400">{tipo.obligatorio ? "Obligatorio" : "Sin archivo"}</p>}
                  </div>
                  <div>
                    <input ref={(el) => { fileRefs.current[tipo.id] = el; }} type="file" accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx" className="hidden"
                      onChange={(e) => handleFileChange(tipo.id, e.target.files?.[0] ?? null)} />
                    <button onClick={() => fileRefs.current[tipo.id]?.click()} disabled={adjunto?.estado === "subiendo"}
                      className="whitespace-nowrap rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-slate-50 disabled:opacity-50">
                      {adjunto?.estado === "listo" ? "Cambiar" : "Seleccionar"}
                    </button>
                  </div>
                </div>
              );
            })}

            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <button onClick={() => { setError(""); setStep("registro"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className="flex-1 rounded-xl border border-slate-300 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50">
                ← Volver
              </button>
              <button onClick={() => { if (haySubiendoArchivos()) { setError("Esperá a que terminen de subir los archivos."); return; } const err = validarDocumentos(); if (err) { setError(err); return; } setError(""); setStep("prueba"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className={`flex-1 rounded-xl py-3 text-sm font-semibold text-white transition-colors ${accent.btn}`}>
                Continuar a la prueba →
              </button>
            </div>
            {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
          </div>
        )}

        {step === "prueba" && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-800">Prueba — {vacante.titulo}</h2>
              <p className="mt-1 text-sm text-slate-500">
                Respondé cada pregunta con honestidad y lo más desarrollado posible. No hay respuestas incorrectas.
              </p>
            </div>

            {vacante.preguntas.map((p, i) => (
              <div key={p.id} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <label className="block text-sm font-semibold text-slate-800">
                  <span className={`mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full ${accent.badge} text-xs font-bold`}>{i + 1}</span>
                  {p.texto}
                </label>
                <textarea rows={4} value={respuestas[p.id] ?? ""} onChange={(e) => handleRespuesta(p.id, e.target.value)}
                  placeholder="Escribí tu respuesta aquí…" className={`w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${accent.ring}`} />
              </div>
            ))}

            {vacante.escenarios.length > 0 && (
              <div className="rounded-2xl bg-slate-800 p-5">
                <p className="mb-1 text-sm font-bold text-white">Preguntas de escenarios</p>
                <p className="text-xs text-slate-400">Leé cada situación y respondé las preguntas.</p>
              </div>
            )}

            {vacante.escenarios.map((e, ei) => (
              <div key={e.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex gap-3 border-b border-slate-200 bg-slate-50 p-5">
                  <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-white">{ei + 1}</span>
                  <p className="text-sm leading-relaxed text-slate-700">{e.situacion}</p>
                </div>
                <div className="space-y-4 p-5">
                  {e.preguntas.map((p, pi) => (
                    <div key={p.id} className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-700">
                        <span className="mr-1 font-normal text-slate-400">{ei + 1}.{pi + 1}</span> {p.texto}
                      </label>
                      <textarea rows={3} value={respuestas[p.id] ?? ""} onChange={(e) => handleRespuesta(p.id, e.target.value)}
                        placeholder="Escribí tu respuesta…" className={`w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${accent.ring}`} />
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button onClick={() => { setError(""); setStep("documentos"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className="flex-1 rounded-xl border border-slate-300 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50">
                ← Volver
              </button>
              <button onClick={handleEnviar} disabled={enviando}
                className={`flex-1 rounded-xl py-3 text-sm font-semibold text-white transition-colors disabled:opacity-60 ${accent.btn}`}>
                {enviando ? "Enviando…" : "Enviar postulación ✓"}
              </button>
            </div>
          </div>
        )}

        {step === "confirmacion" && (
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mb-2 text-5xl">🎉</div>
            <h2 className="text-2xl font-bold text-slate-800">¡Postulación enviada!</h2>
            <p className="mx-auto max-w-md text-slate-600">
              Gracias, <strong>{registro.primer_nombre}</strong>. Tu postulación para el puesto de{" "}
              <strong>{vacante.titulo}</strong> fue recibida. Te contactaremos al correo{" "}
              <strong>{registro.correo_electronico}</strong> o al teléfono{" "}
              <strong>{registro.telefono}</strong> en los próximos días.
            </p>
            {archivos.filter((a) => a.estado === "listo").length > 0 && (
              <p className="text-sm text-slate-500">
                Documentos recibidos: {archivos.filter((a) => a.estado === "listo").map((a) => a.nombre).join(", ")}
              </p>
            )}
            <div className="pt-4">
              <Link href={`/${empresa}/vacantes`} className={`text-sm font-medium underline ${accent.text} hover:underline`}>Ver otras vacantes</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StepBadge({ num, active, done, label, accent }: { num: number; active: boolean; done: boolean; label: string; accent: { badge: string; text: string } }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${done ? "bg-green-500 text-white" : active ? "bg-slate-700 text-white" : "bg-slate-200 text-slate-500"}`}>
        {done ? "✓" : num}
      </div>
      <span className={`hidden text-xs font-medium sm:block ${active ? accent.text : done ? "text-green-600" : "text-slate-400"}`}>{label}</span>
    </div>
  );
}
