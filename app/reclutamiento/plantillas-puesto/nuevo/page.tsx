"use client";

import Link from "next/link";
import PlantillaPuestoForm from "@/components/PlantillaPuestoForm";

export default function NuevaPlantillaPuestoPage() {
  return (
    <div>
      <Link href="/reclutamiento/plantillas-puesto" className="mb-4 inline-block text-xs text-slate-400 hover:text-slate-600">
        ← Plantillas de puesto
      </Link>
      <h1 className="mb-6 text-xl font-bold text-slate-900">Nueva plantilla de puesto</h1>
      <PlantillaPuestoForm />
    </div>
  );
}
