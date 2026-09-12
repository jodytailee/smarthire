"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiJSON } from "@/lib/api-client";
import { normalizeAccentColor, ACCENT_PRESETS } from "@/lib/colors";

type Pregunta = { id: string; texto: string };
type Escenario = { id: string; situacion: string; preguntas: Pregunta[] };
type TipoDoc = { id: string; label: string; obligatorio: boolean };

export type PlantillaPuestoData = {
  id?: number;
  nombre: string;
  resumen: string;
  responsabilidades: string[];
  requisitos: string[];
  preguntas: Pregunta[];
  escenarios: Escenario[];
  tipos_documento: TipoDoc[];
  color: string;
};

function ListaEditable({ items, onChange, placeholder }: { items: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <input
            value={item}
            onChange={(e) => onChange(items.map((it, j) => (j === i ? e.target.value : it)))}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-rose-500 focus:outline-none"
          />
          <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="text-xs text-slate-400 hover:text-red-600">✕</button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, ""])} className="text-xs font-semibold text-rose-600 hover:text-rose-700">
        + {placeholder}
      </button>
    </div>
  );
}

export default function PlantillaPuestoForm({ inicial }: { inicial?: PlantillaPuestoData }) {
  const router = useRouter();
  const [nombre, setNombre] = useState(inicial?.nombre ?? "");
  const [resumen, setResumen] = useState(inicial?.resumen ?? "");
  const [responsabilidades, setResponsabilidades] = useState<string[]>(inicial?.responsabilidades ?? []);
  const [requisitos, setRequisitos] = useState<string[]>(inicial?.requisitos ?? []);
  const [preguntas, setPreguntas] = useState<Pregunta[]>(inicial?.preguntas ?? []);
  const [escenarios, setEscenarios] = useState<Escenario[]>(inicial?.escenarios ?? []);
  const [color, setColor] = useState(normalizeAccentColor(inicial?.color));
  const [guardando, setGuardando] = useState(false);
  const [generando, setGenerando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Si ya hay un resumen escrito, lo mandamos a la IA para que solo
  // complete responsabilidades/requisitos coherentes con él (no lo pisa).
  // Si no hay resumen, genera los tres campos desde cero.
  async function prepopularConIA() {
    if (!nombre.trim()) { setError("Escribí el nombre del puesto primero."); return; }
    setGenerando("descripcion");
    setError(null);
    try {
      const r = await apiJSON("/api/reclutamiento/plantillas-puesto/generar-descripcion", {
        method: "POST", body: JSON.stringify({ nombre, resumen: resumen.trim() || undefined }),
      });
      setResumen(r.resumen);
      setResponsabilidades(r.responsabilidades);
      setRequisitos(r.requisitos);
    } catch (e: any) { setError(e.message); } finally { setGenerando(null); }
  }

  async function generarPreguntas() {
    setGenerando("preguntas");
    setError(null);
    try {
      const r = await apiJSON("/api/reclutamiento/plantillas-puesto/generar-preguntas", {
        method: "POST",
        body: JSON.stringify({ titulo: nombre, resumen, responsabilidades, requisitos }),
      });
      setPreguntas(r.preguntas);
      setEscenarios(r.escenarios);
    } catch (e: any) { setError(e.message); } finally { setGenerando(null); }
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) { setError("El nombre del puesto es obligatorio."); return; }
    setGuardando(true);
    setError(null);
    const body = {
      nombre, resumen,
      responsabilidades: responsabilidades.filter(Boolean),
      requisitos: requisitos.filter(Boolean),
      preguntas, escenarios,
      tipos_documento: inicial?.tipos_documento ?? [],
      color,
    };
    try {
      if (inicial?.id) {
        await apiJSON(`/api/reclutamiento/plantillas-puesto/${inicial.id}`, { method: "PATCH", body: JSON.stringify(body) });
      } else {
        await apiJSON("/api/reclutamiento/plantillas-puesto", { method: "POST", body: JSON.stringify(body) });
      }
      router.push("/reclutamiento/plantillas-puesto");
    } catch (e: any) { setError(e.message); setGuardando(false); }
  }

  return (
    <form onSubmit={guardar} className="max-w-2xl space-y-6">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div>
        <label className="block text-xs font-semibold text-slate-600">Nombre del puesto</label>
        <div className="mt-1 flex gap-2">
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Vendedor I"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none" />
          <button type="button" onClick={prepopularConIA} disabled={!!generando}
            className="whitespace-nowrap rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50">
            {generando === "descripcion" ? "Generando…" : resumen.trim() ? "✨ Sugerir responsabilidades y requisitos" : "✨ Prepopular con IA"}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600">Resumen</label>
        <textarea value={resumen} onChange={(e) => setResumen(e.target.value)} rows={2}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none" />
        <p className="mt-1 text-xs text-slate-400">
          Escribí el nombre y (opcional) el resumen, después usá el botón de arriba — si ya hay resumen, la IA solo completa responsabilidades y requisitos coherentes con él.
        </p>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600">Responsabilidades</label>
        <ListaEditable items={responsabilidades} onChange={setResponsabilidades} placeholder="Agregar responsabilidad" />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600">Requisitos</label>
        <ListaEditable items={requisitos} onChange={setRequisitos} placeholder="Agregar requisito" />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-600">Prueba de postulación (preguntas + escenarios)</label>
          <button type="button" onClick={generarPreguntas} disabled={!!generando}
            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50">
            {generando === "preguntas" ? "Generando…" : "✨ Generar con IA"}
          </button>
        </div>
        {preguntas.length === 0 && escenarios.length === 0 ? (
          <p className="text-xs text-slate-400">Todavía no hay preguntas generadas.</p>
        ) : (
          <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            {preguntas.map((p) => <p key={p.id}>• {p.texto}</p>)}
            {escenarios.map((esc) => (
              <div key={esc.id} className="mt-2 border-t border-slate-200 pt-2">
                <p className="font-semibold">Escenario: {esc.situacion}</p>
                {esc.preguntas.map((p) => <p key={p.id} className="ml-3">– {p.texto}</p>)}
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600">Color de acento</label>
        <p className="mt-1 text-xs text-slate-400">Se usa en los botones y badges de la página pública de esta vacante.</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {ACCENT_PRESETS.map((c) => (
            <button key={c} type="button" onClick={() => setColor(c)} title={c}
              className={`h-7 w-7 rounded-full border-2 transition-transform ${color === c ? "scale-110 border-slate-900" : "border-transparent"}`}
              style={{ backgroundColor: c }} />
          ))}
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
            className="h-7 w-7 cursor-pointer rounded-full border border-slate-300 p-0" title="Elegir otro color" />
          <input type="text" value={color} onChange={(e) => setColor(e.target.value)}
            className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-xs font-mono focus:border-rose-500 focus:outline-none" />
        </div>
      </div>

      <button type="submit" disabled={guardando} className="rounded-lg bg-rose-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50">
        {guardando ? "Guardando…" : "Guardar puesto"}
      </button>
    </form>
  );
}
