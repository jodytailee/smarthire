"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiJSON } from "@/lib/api-client";

type Puesto = { id: number; nombre: string };
type Localidad = { id: number; nombre: string };

export type VacanteData = {
  id?: number;
  fk_puesto: number | null;
  tipo_jornada: string;
  fk_localidades: number[];
  estado: string;
};

const JORNADAS = [
  { value: "tiempo_completo", label: "Tiempo completo" },
  { value: "medio_tiempo", label: "Medio tiempo" },
  { value: "temporada", label: "Temporada" },
];

const ESTADOS = [
  { value: "borrador", label: "Borrador", hint: "No visible públicamente." },
  { value: "publicada", label: "Publicada", hint: "Visible en la página pública de vacantes." },
  { value: "pausada", label: "Pausada", hint: "Oculta temporalmente, se puede reactivar." },
  { value: "cerrada", label: "Cerrada", hint: "Proceso finalizado." },
];

export default function VacanteForm({ inicial, puestoPreseleccionado }: { inicial?: VacanteData; puestoPreseleccionado?: number }) {
  const router = useRouter();
  const [puestos, setPuestos] = useState<Puesto[]>([]);
  const [localidades, setLocalidades] = useState<Localidad[]>([]);
  const [fkPuesto, setFkPuesto] = useState<number | null>(inicial?.fk_puesto ?? puestoPreseleccionado ?? null);
  const [jornada, setJornada] = useState(inicial?.tipo_jornada ?? "tiempo_completo");
  const [fkLocalidades, setFkLocalidades] = useState<number[]>(inicial?.fk_localidades ?? []);
  const [estado, setEstado] = useState(inicial?.estado ?? "borrador");
  const [nuevaLocalidad, setNuevaLocalidad] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiJSON<{ data: Puesto[] }>("/api/reclutamiento/plantillas-puesto").then((r) => setPuestos(r.data));
    apiJSON<{ data: Localidad[] }>("/api/reclutamiento/localidades").then((r) => setLocalidades(r.data));
  }, []);

  function toggleLocalidad(id: number) {
    setFkLocalidades((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function agregarLocalidad() {
    if (!nuevaLocalidad.trim()) return;
    const r = await apiJSON<{ data: Localidad }>("/api/reclutamiento/localidades", {
      method: "POST", body: JSON.stringify({ nombre: nuevaLocalidad.trim() }),
    });
    setLocalidades((prev) => [...prev, r.data]);
    setFkLocalidades((prev) => [...prev, r.data.id]);
    setNuevaLocalidad("");
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!fkPuesto) { setError("Seleccioná un puesto."); return; }
    if (fkLocalidades.length === 0) { setError("Seleccioná al menos una localidad."); return; }
    setGuardando(true);
    setError(null);
    const body = { fk_puesto: fkPuesto, tipo_jornada: jornada, fk_localidades: fkLocalidades, estado };
    try {
      if (inicial?.id) {
        await apiJSON(`/api/reclutamiento/vacantes/${inicial.id}`, { method: "PATCH", body: JSON.stringify(body) });
      } else {
        await apiJSON("/api/reclutamiento/vacantes", { method: "POST", body: JSON.stringify(body) });
      }
      router.push("/reclutamiento/vacantes");
    } catch (e: any) { setError(e.message); setGuardando(false); }
  }

  return (
    <form onSubmit={guardar} className="max-w-xl space-y-6">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div>
        <label className="block text-xs font-semibold text-slate-600">Plantilla de puesto</label>
        {puestos.length === 0 ? (
          <p className="mt-1 text-sm text-slate-500">
            Todavía no tenés plantillas de puesto. <Link href="/reclutamiento/plantillas-puesto/nuevo" className="text-rose-600 underline">Creá una primero</Link>.
          </p>
        ) : (
          <select value={fkPuesto ?? ""} onChange={(e) => setFkPuesto(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none">
            <option value="">Seleccioná un puesto…</option>
            {puestos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        )}
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600">Tipo de jornada</label>
        <div className="mt-1 flex flex-wrap gap-2">
          {JORNADAS.map((j) => (
            <button key={j.value} type="button" onClick={() => setJornada(j.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${jornada === j.value ? "bg-slate-900 text-white" : "border border-slate-300 text-slate-600"}`}>
              {j.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600">Localidades</label>
        <div className="mt-1 flex flex-wrap gap-2">
          {localidades.map((l) => (
            <button key={l.id} type="button" onClick={() => toggleLocalidad(l.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${fkLocalidades.includes(l.id) ? "bg-rose-600 text-white" : "border border-slate-300 text-slate-600"}`}>
              {l.nombre}
            </button>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input value={nuevaLocalidad} onChange={(e) => setNuevaLocalidad(e.target.value)} placeholder="Nueva localidad (ej. Sucursal Centro)"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus:border-rose-500 focus:outline-none" />
          <button type="button" onClick={agregarLocalidad} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50">
            + Agregar
          </button>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600">Estado</label>
        <div className="mt-1 space-y-1">
          {ESTADOS.map((e) => (
            <label key={e.value} className="flex items-start gap-2 text-sm">
              <input type="radio" checked={estado === e.value} onChange={() => setEstado(e.value)} className="mt-1" />
              <span><span className="font-semibold">{e.label}</span> — <span className="text-slate-400">{e.hint}</span></span>
            </label>
          ))}
        </div>
      </div>

      <button type="submit" disabled={guardando} className="rounded-lg bg-rose-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50">
        {guardando ? "Guardando…" : "Guardar vacante"}
      </button>
    </form>
  );
}
