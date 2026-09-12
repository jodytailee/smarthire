"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const NAV = [
  { href: "/reclutamiento/postulantes", label: "Postulantes" },
  { href: "/reclutamiento/vacantes", label: "Vacantes" },
  { href: "/reclutamiento/plantillas-puesto", label: "Plantillas de puesto" },
  { href: "/reclutamiento/entrevistas/disponibilidad", label: "Disponibilidad" },
  { href: "/reclutamiento/configuracion", label: "Configuración" },
];

export default function ReclutamientoLayout({ children }: { children: React.ReactNode }) {
  const { session, usuario, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!session) router.replace("/login");
    else if (!usuario) router.replace("/onboarding");
  }, [loading, session, usuario, router]);

  if (loading || !session || !usuario) {
    return <div className="flex flex-1 items-center justify-center text-sm text-slate-400">Cargando…</div>;
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-8">
            <Link href="/reclutamiento/postulantes" className="text-lg font-bold tracking-tight text-slate-900">
              Smart<span className="text-rose-600">Hire</span>
            </Link>
            <nav className="hidden gap-1 sm:flex">
              {NAV.map((item) => {
                const activo = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      activo ? "bg-rose-50 text-rose-700" : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 sm:inline">{usuario.empresa?.nombre}</span>
            <button onClick={signOut} className="text-xs font-medium text-slate-400 hover:text-slate-600">
              Cerrar sesión
            </button>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-slate-100 px-4 py-2 sm:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium ${
                pathname.startsWith(item.href) ? "bg-rose-50 text-rose-700" : "text-slate-600"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
