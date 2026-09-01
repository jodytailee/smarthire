"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiJSON } from "@/lib/api-client";

type Vacante = {
  id: number;
  titulo: string;
  color: string;
  tipo_jornada: string;
  estado: string;
  postulaciones: number;
  localidades_nombres: string[];
};

const ESTADO_BADGE: Record<string, string> = {
  borrador: "bg-slate-100 text-slate-600",
  publicada: "bg-green-100 text-green-700",
  pausada: "bg-amber-100 text-amber-700",
  cerrada: "bg-red-100 text-red-700",
};

export default function VacantesPage() {
  const [data, setData] = useState<Vacante[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function cargar() {
    const r = await apiJSON<{ data: Vacante[] }>("/api/reclutamiento/vacantes");
    setData(r.data);
    setLoading(false);
  }

  useEffect(() => { cargar(); }, []);

  async function cambiarEstado(id: number, estado: string) {
    await apiJSON(`/api/reclutamiento/vacantes/${id}`, { method: "PATCH", body: JSON.stringify({ estado }) });
    cargar();
  }

  async function eliminar(id: number) {
    if (!confirm("¿Eliminar esta vacante?")) return;
    try {
      const r = await apiJSON<{ desactivada?: boolean }>(`/api/reclutamiento/vacantes/${id}`, { method: "DELETE" });
      if (r.desactivada) alert("Esta vacante ya tiene postulaciones, así que se cerró en vez de eliminarse.");
      cargar();
    } catch (e: any) { setError(e.message); }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Vacantes</h1>
        <Link href="/reclutamiento/vacantes/nuevo" className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700">
          + Nueva vacante
        </Link>
      </div>

      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {loading ? (
        <p className="text-sm text-slate-400">Cargando…</p>
      ) : data.length === 0 ? (
        <p className="text-sm text-slate-400">Todavía no publicaste ninguna vacante.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <tbody>
              {data.map((v) => (
                <tr key={v.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    <span className={`mr-2 inline-block h-2 w-2 rounded-full ${v.color === "slate" ? "bg-slate-500" : "bg-rose-500"}`} />
                    <span className="font-semibold text-slate-900">{v.titulo}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{v.tipo_jornada}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{v.localidades_nombres.join(", ") || "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{v.postulaciones} postulaciones</td>
                  <td className="px-4 py-3">
                    <select value={v.estado} onChange={(e) => cambiarEstado(v.id, e.target.value)}
                      className={`rounded-full border-0 px-2.5 py-1 text-xs font-semibold ${ESTADO_BADGE[v.estado]}`}>
                      <option value="borrador">Borrador</option>
                      <option value="publicada">Publicada</option>
                      <option value="pausada">Pausada</option>
                      <option value="cerrada">Cerrada</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right text-xs">
                    <Link href={`/reclutamiento/vacantes/${v.id}/editar`} className="mr-3 font-semibold text-slate-500 hover:text-slate-700">Editar</Link>
                    <button onClick={() => eliminar(v.id)} className="font-semibold text-red-500 hover:text-red-700">Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
