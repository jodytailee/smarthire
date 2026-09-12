"use client";

import { useEffect, useRef, useState } from "react";
import { apiJSON, apiFetch } from "@/lib/api-client";

type Empresa = { id: number; nombre: string; slug: string; descripcion: string | null; logo_url: string | null };

export default function ConfiguracionEmpresaPage() {
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [subiendoLogo, setSubiendoLogo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function cargar() {
    const data = await apiJSON<Empresa>("/api/reclutamiento/empresa");
    setEmpresa(data);
    setNombre(data.nombre);
    setDescripcion(data.descripcion ?? "");
  }

  useEffect(() => { cargar(); }, []);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    setOk(null);
    try {
      await apiJSON("/api/reclutamiento/empresa", { method: "PATCH", body: JSON.stringify({ nombre, descripcion }) });
      setOk("Guardado.");
      cargar();
    } catch (e: any) { setError(e.message); } finally { setGuardando(false); }
  }

  async function subirLogo(file: File | null) {
    if (!file) return;
    setSubiendoLogo(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await apiFetch("/api/reclutamiento/empresa/logo", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudo subir el logo.");
      setEmpresa((prev) => (prev ? { ...prev, logo_url: json.logo_url } : prev));
    } catch (e: any) { setError(e.message); } finally { setSubiendoLogo(false); }
  }

  if (!empresa) return <p className="text-sm text-slate-400">Cargando…</p>;

  return (
    <div className="max-w-xl">
      <h1 className="mb-2 text-xl font-bold text-slate-900">Configuración de la empresa</h1>
      <p className="mb-6 text-sm text-slate-500">
        Esta información aparece en la página pública de vacantes (<code>/{empresa.slug}/vacantes</code>) y ayuda a la IA a redactar contenido más relevante.
      </p>

      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {ok && <p className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{ok}</p>}

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6">
        <label className="block text-xs font-semibold text-slate-600">Logo</label>
        <div className="mt-2 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            {empresa.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={empresa.logo_url} alt="" className="h-full w-full object-contain" />
            ) : (
              <span className="text-2xl font-bold text-slate-300">{empresa.nombre.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden"
              onChange={(e) => subirLogo(e.target.files?.[0] ?? null)} />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={subiendoLogo}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50">
              {subiendoLogo ? "Subiendo…" : empresa.logo_url ? "Cambiar logo" : "Subir logo"}
            </button>
            <p className="mt-1 text-xs text-slate-400">PNG, JPG, WEBP o SVG — máx 2 MB.</p>
          </div>
        </div>
      </div>

      <form onSubmit={guardar} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <div>
          <label className="block text-xs font-semibold text-slate-600">Nombre de la empresa</label>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} required
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600">Rubro / descripción breve</label>
          <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={3}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none" />
          <p className="mt-1 text-xs text-slate-400">
            Esto ayuda a la IA a redactar descripciones de puesto, preguntas y correos más relevantes para tu rubro.
          </p>
        </div>
        <button type="submit" disabled={guardando}
          className="rounded-lg bg-rose-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50">
          {guardando ? "Guardando…" : "Guardar cambios"}
        </button>
      </form>
    </div>
  );
}
