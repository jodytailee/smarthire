"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiJSON } from "@/lib/api-client";

type Plantilla = {
  id: number;
  nombre: string;
  color: string;
  publicaciones_total: number;
  publicaciones_activas: number;
};

export default function PlantillasPuestoPage() {
  const [data, setData] = useState<Plantilla[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function cargar() {
    const r = await apiJSON<{ data: Plantilla[] }>("/api/reclutamiento/plantillas-puesto");
    setData(r.data);
    setLoading(false);
  }

  useEffect(() => { cargar(); }, []);

  async function eliminar(id: number) {
    if (!confirm("¿Eliminar esta plantilla de puesto?")) return;
    try {
      await apiJSON(`/api/reclutamiento/plantillas-puesto/${id}`, { method: "DELETE" });
      cargar();
    } catch (e: any) { setError(e.message); }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Plantillas de puesto</h1>
        <Link href="/reclutamiento/plantillas-puesto/nuevo" className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700">
          + Nueva plantilla
        </Link>
      </div>

      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {loading ? (
        <p className="text-sm text-slate-400">Cargando…</p>
      ) : data.length === 0 ? (
        <p className="text-sm text-slate-400">Todavía no creaste ninguna plantilla de puesto.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((p) => (
            <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className={`h-2.5 w-2.5 rounded-full ${p.color === "slate" ? "bg-slate-500" : "bg-rose-500"}`} />
                <span className="text-xs text-slate-400">{p.publicaciones_activas}/{p.publicaciones_total} publicaciones</span>
              </div>
              <h3 className="font-semibold text-slate-900">{p.nombre}</h3>
              <div className="mt-3 flex gap-2 text-xs">
                <Link href={`/reclutamiento/vacantes/nuevo?puesto=${p.id}`} className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold hover:bg-slate-50">
                  + Publicar
                </Link>
                <Link href={`/reclutamiento/plantillas-puesto/${p.id}/editar`} className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold hover:bg-slate-50">
                  Editar
                </Link>
                <button onClick={() => eliminar(p.id)} className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold text-red-600 hover:bg-red-50">
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
