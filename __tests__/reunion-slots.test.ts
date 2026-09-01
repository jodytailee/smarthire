import { describe, it, expect } from "vitest";
import { calcularSlotsLibres } from "@/lib/reunion-slots";

describe("calcularSlotsLibres", () => {
  it("genera slots dentro de una franja, restando los ocupados", () => {
    // 2025-01-06 es lunes (dia_semana 1)
    const disponibilidad = [{ dia_semana: 1, hora_inicio: "09:00", hora_fin: "10:00", duracion_minutos: 15 }];
    const ocupadas = [{ fecha: "2025-01-06", hora_inicio: "09:15" }];

    const slots = calcularSlotsLibres(disponibilidad, ocupadas, "2025-01-06", "2025-01-06");

    expect(slots["2025-01-06"]).toEqual(["09:00", "09:30", "09:45"]);
  });

  it("no genera slots para días sin franjas configuradas", () => {
    const slots = calcularSlotsLibres([], [], "2025-01-06", "2025-01-07");
    expect(slots).toEqual({});
  });

  it("respeta el rango completo de días", () => {
    const disponibilidad = [
      { dia_semana: 1, hora_inicio: "09:00", hora_fin: "09:30", duracion_minutos: 30 },
      { dia_semana: 2, hora_inicio: "14:00", hora_fin: "14:30", duracion_minutos: 30 },
    ];
    const slots = calcularSlotsLibres(disponibilidad, [], "2025-01-06", "2025-01-07");
    expect(slots["2025-01-06"]).toEqual(["09:00"]);
    expect(slots["2025-01-07"]).toEqual(["14:00"]);
  });
});
