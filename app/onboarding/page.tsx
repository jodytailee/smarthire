"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function OnboardingPage() {
  const { session, usuario, loading, refreshUsuario, signOut } = useAuth();
  const router = useRouter();
  const [nombreEmpresa, setNombreEmpresa] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !session) router.replace("/login");
  }, [loading, session, router]);

  useEffect(() => {
    if (usuario) router.replace("/reclutamiento/postulantes");
  }, [usuario, router]);

  async function crearEmpresa(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ nombreEmpresa, descripcion }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudo crear la empresa.");
      await refreshUsuario();
      router.replace("/reclutamiento/postulantes");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setEnviando(false);
    }
  }

  if (loading || !session || usuario) {
    return <div className="flex flex-1 items-center justify-center text-sm text-slate-400">Cargando…</div>;
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-slate-50 px-6 py-16">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Creá tu espacio en SmartHire</h1>
        <p className="mt-1 text-sm text-slate-500">
          Sesión iniciada como <strong>{session.user.email}</strong>. Contanos de tu empresa
          para empezar a publicar vacantes.
        </p>

        <form onSubmit={crearEmpresa} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600">Nombre de la empresa</label>
            <input
              value={nombreEmpresa}
              onChange={(e) => setNombreEmpresa(e.target.value)}
              required
              placeholder="Ej. Mini Rose Candy Shop"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600">Rubro / descripción breve</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              placeholder="Ej. Cadena de tiendas de dulces importados en Costa Rica"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-slate-400">
              Esto ayuda a la IA a redactar descripciones de puesto y correos más relevantes.
            </p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={enviando}
            className="w-full rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
          >
            {enviando ? "Creando…" : "Crear espacio"}
          </button>
        </form>

        <button onClick={signOut} className="mt-4 w-full text-xs text-slate-400 hover:text-slate-600">
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
