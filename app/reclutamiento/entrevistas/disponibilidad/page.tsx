"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiJSON } from "@/lib/api-client";

type Franja = { id: number; dia_semana: number; hora_inicio: string; hora_fin: string; duracion_minutos: number; activo: boolean };

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export default function DisponibilidadEntrevistasPage() {
  const searchParams = useSearchParams();
  const [franjas, setFranjas] = useState<Franja[]>([]);
  const [diaSemana, setDiaSemana] = useState(1);
  const [horaInicio, setHoraInicio] = useState("09:00");
  const [horaFin, setHoraFin] = useState("17:00");
  const [duracion, setDuracion] = useState(15);
  const [error, setError] = useState<string | null>(null);
  const [conectandoGoogle, setConectandoGoogle] = useState(false);

  async function cargar() {
    const r = await apiJSON<{ data: Franja[] }>("/api/reclutamiento/entrevistas/disponibilidad");
    setFranjas(r.data);
  }

  useEffect(() => { cargar(); }, []);

  useEffect(() => {
    const err = searchParams.get("error");
    if (err) setError(err);
  }, [searchParams]);

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiJSON("/api/reclutamiento/entrevistas/disponibilidad", {
        method: "POST",
        body: JSON.stringify({ diaSemana, horaInicio, horaFin, duracionMinutos: duracion }),
      });
      cargar();
    } catch (e: any) { setError(e.message); }
  }

  async function eliminar(id: number) {
    await apiJSON(`/api/reclutamiento/entrevistas/disponibilidad/${id}`, { method: "DELETE" });
    cargar();
  }

  async function conectarGoogle() {
    setConectandoGoogle(true);
    try {
      const r = await apiJSON<{ url: string }>("/api/google/oauth/iniciar");
      window.location.href = r.url;
    } catch (e: any) {
      setError(e.message);
      setConectandoGoogle(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-2 text-xl font-bold text-slate-900">Disponibilidad para entrevistas</h1>
      <p className="mb-6 text-sm text-slate-500">
        Definí las franjas horarias en las que los postulantes pueden agendar una entrevista con vos.
      </p>

      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {searchParams.get("conectado") && (
        <p className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">Google Calendar conectado correctamente.</p>
      )}

      <button onClick={conectarGoogle} disabled={conectandoGoogle}
        className="mb-6 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50">
        {conectandoGoogle ? "Redirigiendo…" : "🔗 Conectar Google Calendar (para generar Meet automático)"}
      </button>

      <form onSubmit={agregar} className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600">Día</label>
          <select value={diaSemana} onChange={(e) => setDiaSemana(Number(e.target.value))}
            className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
            {DIAS.map((d, i) => <option key={i} value={i}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600">Desde</label>
          <input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600">Hasta</label>
          <input type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600">Duración (min)</label>
          <input type="number" value={duracion} onChange={(e) => setDuracion(Number(e.target.value))} min={5} step={5}
            className="mt-1 w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
        </div>
        <button type="submit" className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700">
          + Agregar franja
        </button>
      </form>

      <div className="space-y-2">
        {franjas.map((f) => (
          <div key={f.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm">
            <span>{DIAS[f.dia_semana]} · {f.hora_inicio.slice(0, 5)}–{f.hora_fin.slice(0, 5)} · {f.duracion_minutos} min</span>
            <button onClick={() => eliminar(f.id)} className="text-xs font-semibold text-red-500 hover:text-red-700">Eliminar</button>
          </div>
        ))}
        {franjas.length === 0 && <p className="text-sm text-slate-400">Todavía no configuraste ninguna franja.</p>}
      </div>
    </div>
  );
}
