"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { apiJSON } from "@/lib/api-client";
import PlantillaPuestoForm, { type PlantillaPuestoData } from "@/components/PlantillaPuestoForm";

export default function EditarPlantillaPuestoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<PlantillaPuestoData | null>(null);

  useEffect(() => {
    apiJSON<PlantillaPuestoData>(`/api/reclutamiento/plantillas-puesto/${id}`).then(setData);
  }, [id]);

  return (
    <div>
      <Link href="/reclutamiento/plantillas-puesto" className="mb-4 inline-block text-xs text-slate-400 hover:text-slate-600">
        ← Plantillas de puesto
      </Link>
      <h1 className="mb-6 text-xl font-bold text-slate-900">Editar plantilla de puesto</h1>
      {data ? <PlantillaPuestoForm inicial={{ ...data, id: Number(id) }} /> : <p className="text-sm text-slate-400">Cargando…</p>}
    </div>
  );
}
