import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { scorearPostulacion, generarTextoRechazo, generarTextoFuturoCandidato } from "@/lib/postulantes-ia";

describe("postulantes-ia sin ANTHROPIC_API_KEY", () => {
  const original = process.env.ANTHROPIC_API_KEY;

  beforeEach(() => { delete process.env.ANTHROPIC_API_KEY; });
  afterEach(() => { process.env.ANTHROPIC_API_KEY = original; });

  it("scorearPostulacion degrada a valores null en vez de lanzar", async () => {
    const resultado = await scorearPostulacion({
      empresa: { nombre: "Acme" },
      nombreCandidato: "Ana Test",
      puesto: "Vendedor",
      respuestas: [{ pregunta: "¿Por qué querés el puesto?", respuesta: "Me gusta" }],
    });
    expect(resultado).toEqual({ puntaje: null, analisis: null, sugerencias: null, canton_residencia: null, pretension_monto: null });
  });

  it("generarTextoRechazo devuelve null sin romper", async () => {
    const texto = await generarTextoRechazo({
      empresa: { nombre: "Acme" },
      nombreCompleto: "Ana Test",
      primerNombre: "Ana",
      puesto: "Vendedor",
      respuestas: [],
    });
    expect(texto).toBeNull();
  });

  it("generarTextoFuturoCandidato devuelve null sin romper", async () => {
    const texto = await generarTextoFuturoCandidato({
      empresa: { nombre: "Acme" },
      nombreCompleto: "Ana Test",
      primerNombre: "Ana",
      puesto: "Vendedor",
      respuestas: [],
    });
    expect(texto).toBeNull();
  });
});
