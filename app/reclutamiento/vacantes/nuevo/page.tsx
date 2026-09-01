"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import VacanteForm from "@/components/VacanteForm";

export default function NuevaVacantePage() {
  const params = useSearchParams();
  const puesto = params.get("puesto");

  return (
    <div>
      <Link href="/reclutamiento/vacantes" className="mb-4 inline-block text-xs text-slate-400 hover:text-slate-600">
        ← Vacantes
      </Link>
      <h1 className="mb-6 text-xl font-bold text-slate-900">Nueva vacante</h1>
      <VacanteForm puestoPreseleccionado={puesto ? Number(puesto) : undefined} />
    </div>
  );
}
