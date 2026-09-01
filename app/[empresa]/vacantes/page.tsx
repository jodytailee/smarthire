"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";

type Vacante = {
  id: number;
  titulo: string;
  slug: string;
  resumen: string | null;
  responsabilidades: string[];
  requisitos: string[];
  tipo_jornada: string;
  color: "rose" | "slate";
  localidades: string[];
};

const JORNADA_LABEL: Record<string, string> = {
  tiempo_completo: "Tiempo completo",
  medio_tiempo: "Medio tiempo",
  temporada: "Temporada",
};

export default function VacantesPublicasPage({ params }: { params: Promise<{ empresa: string }> }) {
  const { empresa } = use(params);
  const [nombreEmpresa, setNombreEmpresa] = useState("");
  const [vacantes, setVacantes] = useState<Vacante[]>([]);
  const [cargando, setCargando] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/public/${empresa}/vacantes`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setNotFound(true); return; }
        setNombreEmpresa(d.empresa?.nombre ?? "");
        setVacantes(d.data ?? []);
      })
      .catch(() => setNotFound(true))
      .finally(() => setCargando(false));
  }, [empresa]);

  if (cargando) return <div className="flex flex-1 items-center justify-center text-sm text-slate-400">Cargando…</div>;
  if (notFound) return <div className="flex flex-1 items-center justify-center text-sm text-slate-400">Empresa no encontrada.</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-slate-100">
      <header className="bg-slate-900 px-6 py-4">
        <div className="mx-auto max-w-3xl">
          <span className="text-sm font-bold tracking-tight text-white">{nombreEmpresa}</span>
          <span className="ml-2 text-xs text-slate-400">· vía SmartHire</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="mb-6 text-2xl font-bold text-slate-800">Vacantes abiertas</h1>

        {vacantes.length === 0 ? (
          <p className="text-sm text-slate-500">No hay vacantes publicadas en este momento.</p>
        ) : (
          <div className="space-y-4">
            {vacantes.map((v) => (
              <div key={v.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${v.color === "slate" ? "bg-slate-100 text-slate-600" : "bg-rose-100 text-rose-600"}`}>
                      {JORNADA_LABEL[v.tipo_jornada] ?? v.tipo_jornada}
                    </span>
                    <h2 className="mt-2 text-lg font-bold text-slate-900">{v.titulo}</h2>
                    {v.resumen && <p className="mt-1 text-sm text-slate-600">{v.resumen}</p>}
                    {v.localidades.length > 0 && (
                      <p className="mt-2 text-xs text-slate-400">📍 {v.localidades.join(", ")}</p>
                    )}
                  </div>
                  <Link href={`/${empresa}/vacantes/${v.slug}`}
                    className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold text-white ${v.color === "slate" ? "bg-slate-700 hover:bg-slate-800" : "bg-rose-600 hover:bg-rose-700"}`}>
                    Aplicar ahora →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
