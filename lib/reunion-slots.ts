export type FranjaDisponibilidad = { dia_semana: number; hora_inicio: string; hora_fin: string; duracion_minutos: number };
export type ReunionOcupada = { fecha: string; hora_inicio: string };

function hoyCR(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Costa_Rica" });
}

function horaActualCR(): string {
  return new Date().toLocaleTimeString("en-GB", { timeZone: "America/Costa_Rica", hour12: false }).slice(0, 5);
}

// "YYYY-MM-DD" → 0=domingo … 6=sábado (estilo Date#getDay()), tratando la
// fecha como calendario puro, sin desplazamiento de huso horario.
function diaSemanaDeFecha(fecha: string): number {
  const [y, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function siguienteDia(fecha: string): string {
  const [y, m, d] = fecha.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + 1);
  return dt.toISOString().slice(0, 10);
}

function sumarMinutos(hora: string, minutos: number): string {
  const [h, m] = hora.split(":").map(Number);
  const total = h * 60 + m + minutos;
  const hh = String(Math.floor(total / 60) % 24).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

// Genera, para cada día del rango [desde, hasta], las horas de inicio de
// bloque libres según las franjas recurrentes de disponibilidad, restando
// las entrevistas ya confirmadas y las horas que ya pasaron (si el día es hoy).
export function calcularSlotsLibres(
  disponibilidad: FranjaDisponibilidad[],
  reunionesOcupadas: ReunionOcupada[],
  desde: string,
  hasta: string
): Record<string, string[]> {
  const ocupado = new Set(reunionesOcupadas.map((o) => `${o.fecha}:${o.hora_inicio.slice(0, 5)}`));
  const hoy = hoyCR();
  const horaAhora = horaActualCR();

  const resultado: Record<string, string[]> = {};
  let cursor = desde;
  while (cursor <= hasta) {
    const diaSemana = diaSemanaDeFecha(cursor);
    const horas: string[] = [];

    for (const franja of disponibilidad.filter((f) => f.dia_semana === diaSemana)) {
      const horaFin = franja.hora_fin.slice(0, 5);
      let horaCursor = franja.hora_inicio.slice(0, 5);
      while (true) {
        const finSlot = sumarMinutos(horaCursor, franja.duracion_minutos);
        if (finSlot > horaFin) break;
        const yaPaso = cursor === hoy && horaCursor <= horaAhora;
        if (!yaPaso && !ocupado.has(`${cursor}:${horaCursor}`)) horas.push(horaCursor);
        horaCursor = finSlot;
      }
    }

    if (horas.length > 0) resultado[cursor] = horas.sort();
    cursor = siguienteDia(cursor);
  }

  return resultado;
}
