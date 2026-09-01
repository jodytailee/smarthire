"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { apiJSON } from "@/lib/api-client";
import VacanteForm, { type VacanteData } from "@/components/VacanteForm";

export default function EditarVacantePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<VacanteData | null>(null);

  useEffect(() => {
    apiJSON<VacanteData>(`/api/reclutamiento/vacantes/${id}`).then(setData);
  }, [id]);

  return (
    <div>
      <Link href="/reclutamiento/vacantes" className="mb-4 inline-block text-xs text-slate-400 hover:text-slate-600">
        ← Vacantes
      </Link>
      <h1 className="mb-6 text-xl font-bold text-slate-900">Editar vacante</h1>
      {data ? <VacanteForm inicial={{ ...data, id: Number(id) }} /> : <p className="text-sm text-slate-400">Cargando…</p>}
    </div>
  );
}
