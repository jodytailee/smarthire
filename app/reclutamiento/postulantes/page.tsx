"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiJSON } from "@/lib/api-client";

type Estado = "pendiente" | "en_revision" | "entrevista" | "contratado" | "rechazado" | "futuro_candidato";

type Postulante = {
  id: number;
  primer_nombre: string;
  primer_apellido: string;
  correo_electronico: string | null;
  telefono: string | null;
  puntaje: number | null;
  estado: Estado;
  created_at: string;
  archivos: unknown[];
  jornada: string | null;
  puesto: string | null;
  pretension_monto: number | null;
  canton_residencia: string | null;
};

const TABS: { estado: Estado | "todos"; label: string }[] = [
  { estado: "todos", label: "Todos" },
  { estado: "pendiente", label: "Pendientes" },
  { estado: "en_revision", label: "En revisión" },
  { estado: "entrevista", label: "Entrevista" },
  { estado: "futuro_candidato", label: "Futuros" },
  { estado: "contratado", label: "Contratados" },
  { estado: "rechazado", label: "Rechazados" },
];

const ESTADO_BADGE: Record<Estado, string> = {
  pendiente: "bg-slate-100 text-slate-600",
  en_revision: "bg-blue-100 text-blue-700",
  entrevista: "bg-amber-100 text-amber-700",
  contratado: "bg-green-100 text-green-700",
  rechazado: "bg-red-100 text-red-700",
  futuro_candidato: "bg-purple-100 text-purple-700",
};

function puntajeColor(p: number | null): string {
  if (p === null) return "text-slate-400";
  if (p >= 75) return "text-green-600";
  if (p >= 50) return "text-amber-600";
  return "text-red-600";
}

export default function PostulantesPage() {
  const [postulantes, setPostulantes] = useState<Postulante[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Estado | "todos">("todos");
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    apiJSON<Postulante[]>("/api/reclutamiento/postulantes")
      .then(setPostulantes)
      .finally(() => setLoading(false));
  }, []);

  const conteos = useMemo(() => {
    const c: Record<string, number> = { todos: postulantes.length };
    for (const p of postulantes) c[p.estado] = (c[p.estado] ?? 0) + 1;
    return c;
  }, [postulantes]);

  const filtrados = useMemo(() => {
    return postulantes.filter((p) => {
      if (tab !== "todos" && p.estado !== tab) return false;
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase();
        const nombre = `${p.primer_nombre} ${p.primer_apellido}`.toLowerCase();
        if (!nombre.includes(q) && !p.correo_electronico?.toLowerCase().includes(q) && !p.telefono?.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [postulantes, tab, busqueda]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Postulantes</h1>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.estado}
            onClick={() => setTab(t.estado)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              tab === t.estado ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {t.label} <span className="opacity-60">{conteos[t.estado] ?? 0}</span>
          </button>
        ))}
      </div>

      <input
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar por nombre, correo o teléfono…"
        className="mb-4 w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none"
      />

      {loading ? (
        <p className="text-sm text-slate-400">Cargando…</p>
      ) : filtrados.length === 0 ? (
        <p className="text-sm text-slate-400">No hay postulantes en esta vista.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <tbody>
              {filtrados.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/reclutamiento/postulantes/${p.id}`} className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-100 text-sm font-bold text-rose-700">
                        {p.primer_nombre.charAt(0).toUpperCase()}
                      </span>
                      <span>
                        <span className="block font-semibold text-slate-900">{p.primer_nombre} {p.primer_apellido}</span>
                        <span className="block text-xs text-slate-400">{p.puesto ?? "—"}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {p.correo_electronico}<br />{p.telefono}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-sm font-bold ${puntajeColor(p.puntaje)}`}>{p.puntaje ?? "—"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ESTADO_BADGE[p.estado]}`}>
                      {TABS.find((t) => t.estado === p.estado)?.label ?? p.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-slate-400">
                    {new Date(p.created_at).toLocaleDateString("es-CR")}
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
