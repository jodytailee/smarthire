import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-lg font-bold tracking-tight text-slate-900">
            Smart<span className="text-rose-600">Hire</span>
          </span>
          <Link
            href="/login"
            className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Ingresar
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <span className="mb-4 rounded-full bg-rose-50 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-rose-600">
          Contratación con IA
        </span>
        <h1 className="max-w-2xl text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
          Recluta más rápido con ayuda de inteligencia artificial
        </h1>
        <p className="mt-6 max-w-xl text-lg text-slate-600">
          Publicá vacantes, recibí postulaciones y dejá que la IA analice, puntúe
          y te ayude a responder a cada candidato — desde una sola plataforma.
        </p>
        <div className="mt-10 flex gap-4">
          <Link
            href="/login"
            className="rounded-full bg-rose-600 px-8 py-3 text-sm font-semibold text-white hover:bg-rose-700"
          >
            Empezar gratis
          </Link>
        </div>
      </main>
    </div>
  );
}
