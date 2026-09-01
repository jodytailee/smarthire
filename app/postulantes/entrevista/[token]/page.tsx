"use client";

import { useEffect, useState, useCallback, use } from "react";

type SlotsPorDia = Record<string, string[]>;
type Contexto = {
  estado: "pendiente" | "confirmada" | "cancelada";
  fecha: string | null;
  hora_inicio: string | null;
  hora_fin: string | null;
  meet_link: string | null;
  postulanteNombre: string;
  entrevistadorNombre: string;
};

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const DIAS_CORTO = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];

function hoyCR(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Costa_Rica" });
}
function sumarDias(fecha: string, dias: number): string {
  const [y, m, d] = fecha.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + dias);
  return dt.toISOString().slice(0, 10);
}
function fmtHora12(hora: string): string {
  const [h, m] = hora.split(":").map(Number);
  const ampm = h >= 12 ? "p.m." : "a.m.";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}
function fmtFechaCorta(fecha: string) {
  const [, , d] = fecha.split("-").map(Number);
  return { dia: DIAS_CORTO[new Date(`${fecha}T00:00:00Z`).getUTCDay()], numero: d };
}
function fmtFechaLarga(fecha: string) {
  return `${DIAS[new Date(`${fecha}T00:00:00Z`).getUTCDay()]} ${fecha.split("-").reverse().slice(0, 2).join("/")}`;
}

export default function EntrevistaPublicaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);

  const [contexto, setContexto] = useState<Contexto | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");

  const [slots, setSlots] = useState<SlotsPorDia | null>(null);
  const [cargandoSlots, setCargandoSlots] = useState(false);
  const [reservando, setReservando] = useState<{ fecha: string; hora: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [confirmacion, setConfirmacion] = useState<{ fecha: string; hora_inicio: string; meet_link: string | null } | null>(null);

  const cargarContexto = useCallback(async () => {
    setCargando(true);
    const res = await fetch(`/api/postulantes/entrevista/${token}`);
    const json = await res.json();
    if (!res.ok) { setErrorCarga(json.error ?? "Link no encontrado."); setCargando(false); return; }
    setContexto(json);
    setCargando(false);
  }, [token]);

  useEffect(() => { cargarContexto(); }, [cargarContexto]);

  useEffect(() => {
    if (!contexto || contexto.estado !== "pendiente") return;
    setCargandoSlots(true);
    const desde = hoyCR();
    const hasta = sumarDias(desde, 13);
    fetch(`/api/postulantes/entrevista/${token}/slots?desde=${desde}&hasta=${hasta}`)
      .then((r) => r.json())
      .then((json) => setSlots(json.data ?? {}))
      .finally(() => setCargandoSlots(false));
  }, [contexto, token]);

  async function confirmarReserva() {
    if (!reservando) return;
    setEnviando(true);
    setError("");
    const res = await fetch(`/api/postulantes/entrevista/${token}/reservar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fecha: reservando.fecha, horaInicio: reservando.hora }),
    });
    const json = await res.json();
    setEnviando(false);
    if (!res.ok) { setError(json.error ?? "No se pudo reservar."); return; }
    setConfirmacion({ fecha: json.fecha, hora_inicio: json.hora_inicio, meet_link: json.meet_link });
    setReservando(null);
  }

  const dias = slots ? Object.keys(slots).sort() : [];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <span className="text-xl font-bold text-rose-700">SmartHire</span>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          {cargando && <p className="py-10 text-center text-sm text-slate-400">Cargando…</p>}

          {!cargando && errorCarga && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-center text-sm text-red-600">{errorCarga}</p>
          )}

          {!cargando && contexto && contexto.estado === "cancelada" && (
            <p className="py-6 text-center text-sm text-slate-500">Esta entrevista fue cancelada. Si tenés dudas, escribinos.</p>
          )}

          {!cargando && contexto && (contexto.estado === "confirmada" || confirmacion) && (
            <div className="py-4 text-center">
              <p className="mb-2 text-3xl">✅</p>
              <h1 className="mb-1 text-lg font-bold text-slate-900">Entrevista confirmada</h1>
              <p className="mb-1 text-sm text-slate-500">Con {contexto.entrevistadorNombre}</p>
              <p className="mb-4 text-sm font-medium text-slate-700">
                {fmtFechaLarga((confirmacion?.fecha ?? contexto.fecha)!)} a las {fmtHora12((confirmacion?.hora_inicio ?? contexto.hora_inicio)!)}
              </p>
              {(confirmacion?.meet_link ?? contexto.meet_link) ? (
                <a href={(confirmacion?.meet_link ?? contexto.meet_link)!} target="_blank" rel="noreferrer"
                  className="inline-block rounded-lg bg-rose-700 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-rose-800">
                  Unirse a Google Meet
                </a>
              ) : (
                <p className="text-xs text-slate-400">El link de la videollamada te llega por correo apenas esté listo.</p>
              )}
            </div>
          )}

          {!cargando && contexto && contexto.estado === "pendiente" && !confirmacion && (
            <>
              <div className="mb-6">
                <h1 className="text-lg font-bold text-slate-900">¡Hola, {contexto.postulanteNombre.split(" ")[0]}!</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Elegí el horario que mejor te acomode para tu entrevista con {contexto.entrevistadorNombre}.
                  La videollamada de Google Meet se genera automáticamente. (GMT-06:00) Costa Rica
                </p>
              </div>

              {cargandoSlots && <p className="py-10 text-center text-sm text-slate-400">Cargando horarios…</p>}
              {!cargandoSlots && dias.length === 0 && (
                <p className="py-10 text-center text-sm text-slate-400">No hay horarios disponibles en los próximos días. Escribinos para coordinar.</p>
              )}

              {!cargandoSlots && dias.length > 0 && (
                <div className="overflow-x-auto pb-2">
                  <div className="flex min-w-max gap-3">
                    {dias.map((fecha) => {
                      const { dia, numero } = fmtFechaCorta(fecha);
                      return (
                        <div key={fecha} className="w-32 shrink-0">
                          <div className="mb-2 text-center">
                            <p className="text-[10px] font-semibold uppercase text-slate-400">{dia}</p>
                            <p className="text-sm font-bold text-slate-900">{numero}</p>
                          </div>
                          <div className="space-y-1.5">
                            {slots![fecha].map((hora) => (
                              <button key={hora} onClick={() => setReservando({ fecha, hora })}
                                className="w-full rounded-full border border-rose-200 py-1.5 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-50">
                                {fmtHora12(hora)}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {reservando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5">
            <h2 className="mb-1 text-base font-bold text-slate-900">Confirmar entrevista</h2>
            <p className="mb-3 text-sm text-slate-500">
              {fmtFechaLarga(reservando.fecha)} a las {fmtHora12(reservando.hora)}
            </p>
            {error && <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={() => { setReservando(null); setError(""); }} className="px-3 py-2 text-sm font-medium text-slate-500 hover:text-slate-700">Cancelar</button>
              <button onClick={confirmarReserva} disabled={enviando}
                className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-800 disabled:opacity-50">
                {enviando ? "Agendando…" : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
