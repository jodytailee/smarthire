// Generación de contenido de reclutamiento con IA — descripción de puesto y
// preguntas de la prueba de postulación. Mismo patrón que EasyGo
// (lib/vacantes.ts::generarDescripcionPuestoConIA/generarPreguntasVacanteConIA),
// pero el prompt recibe la empresa como parámetro en vez de tener
// "Mini Rose Candy Shop" hardcodeado.
import type { EmpresaContexto } from "./postulantes-ia";

export type PreguntaVacante = { id: string; texto: string };
export type EscenarioVacante = { id: string; situacion: string; preguntas: PreguntaVacante[] };

function contextoEmpresa(empresa: EmpresaContexto): string {
  return empresa.descripcion ? `${empresa.nombre} (${empresa.descripcion})` : empresa.nombre;
}

async function llamarClaudeJSON(prompt: string, maxTokens: number, timeoutMs: number): Promise<any> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Sin configuración de IA (falta ANTHROPIC_API_KEY).");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) throw new Error("Error al contactar la IA.");

  const data = await res.json();
  const texto: string = data?.content?.[0]?.text ?? "{}";
  const limpio = texto.trim().replace(/^```(json)?/i, "").replace(/```$/, "").trim();
  return JSON.parse(limpio);
}

export async function generarDescripcionPuestoConIA(args: {
  empresa: EmpresaContexto;
  nombrePuesto: string;
}): Promise<{ resumen: string; responsabilidades: string[]; requisitos: string[] }> {
  const prompt = `Sos un experto en reclutamiento de personal para ${contextoEmpresa(args.empresa)}, en Costa Rica.

Necesito la descripción de un puesto de trabajo llamado "${args.nombrePuesto}", para publicarlo en una convocatoria de empleo. Este puesto se reutilizará en varias rondas de reclutamiento (a veces tiempo completo, a veces medio tiempo o temporada), así que la descripción debe ser genérica respecto al tipo de jornada y no mencionar una localidad específica.

Generá:
1. Un resumen breve del puesto (1 a 2 oraciones), en tono profesional y atractivo para candidatos.
2. Entre 4 y 6 responsabilidades concretas del día a día en el puesto.
3. Entre 3 y 5 requisitos que debería cumplir el candidato (experiencia, actitud, disponibilidad, condiciones físicas si aplica, etc).

Respondé ÚNICAMENTE con un JSON válido (sin markdown, sin backticks, sin texto adicional) con esta forma exacta:
{
  "resumen": "string",
  "responsabilidades": [ "string" ],
  "requisitos": [ "string" ]
}`;

  const parsed = await llamarClaudeJSON(prompt, 1536, 30000);

  if (typeof parsed.resumen !== "string" || !Array.isArray(parsed.responsabilidades) || !Array.isArray(parsed.requisitos)) {
    throw new Error("Respuesta de IA inválida.");
  }

  return {
    resumen: parsed.resumen.trim(),
    responsabilidades: parsed.responsabilidades.map((r: any) => String(r ?? "").trim()).filter(Boolean),
    requisitos: parsed.requisitos.map((r: any) => String(r ?? "").trim()).filter(Boolean),
  };
}

export async function generarPreguntasVacanteConIA(args: {
  empresa: EmpresaContexto;
  titulo: string;
  resumen?: string;
  responsabilidades: string[];
  requisitos: string[];
}): Promise<{ preguntas: PreguntaVacante[]; escenarios: EscenarioVacante[] }> {
  const prompt = `Sos un experto en reclutamiento de personal para ${contextoEmpresa(args.empresa)}, en Costa Rica.

Necesito el cuestionario de una prueba de postulación en línea para el puesto "${args.titulo}". Este cuestionario se reutilizará en varias rondas de reclutamiento (a veces tiempo completo, a veces medio tiempo o temporada), así que las preguntas deben ser genéricas respecto al tipo de jornada.
${args.resumen ? `Resumen del puesto: ${args.resumen}` : ""}
${args.responsabilidades.length > 0 ? `Responsabilidades:\n${args.responsabilidades.map((r) => `- ${r}`).join("\n")}` : ""}
${args.requisitos.length > 0 ? `Requisitos:\n${args.requisitos.map((r) => `- ${r}`).join("\n")}` : ""}

Generá:
1. Entre 8 y 11 preguntas abiertas de texto libre que evalúen motivación, experiencia relevante, resolución de problemas, ética laboral, disponibilidad horaria y pretensión salarial. Terminá siempre con una pregunta de disponibilidad horaria (sin asumir un tipo de jornada específico) y una de pretensión salarial.
2. Entre 2 y 4 escenarios situacionales realistas para el rubro de la empresa en Costa Rica, cada uno con 1-2 preguntas de seguimiento que evalúen honestidad, sentido de responsabilidad y ética.

Respondé ÚNICAMENTE con un JSON válido (sin markdown, sin backticks, sin texto adicional) con esta forma exacta:
{
  "preguntas": [ { "texto": "string" } ],
  "escenarios": [ { "situacion": "string", "preguntas": [ { "texto": "string" } ] } ]
}`;

  const parsed = await llamarClaudeJSON(prompt, 4096, 60000);

  if (!Array.isArray(parsed.preguntas) || !Array.isArray(parsed.escenarios)) {
    throw new Error("Respuesta de IA inválida.");
  }

  const preguntas: PreguntaVacante[] = parsed.preguntas.map((p: any, i: number) => ({
    id: `p${Date.now()}_${i}`,
    texto: String(p.texto ?? "").trim(),
  })).filter((p: PreguntaVacante) => p.texto);

  const escenarios: EscenarioVacante[] = parsed.escenarios.map((e: any, ei: number) => ({
    id: `e${Date.now()}_${ei}`,
    situacion: String(e.situacion ?? "").trim(),
    preguntas: (Array.isArray(e.preguntas) ? e.preguntas : []).map((p: any, pi: number) => ({
      id: `e${Date.now()}_${ei}_q${pi}`,
      texto: String(p.texto ?? "").trim(),
    })).filter((p: PreguntaVacante) => p.texto),
  })).filter((e: EscenarioVacante) => e.situacion && e.preguntas.length > 0);

  return { preguntas, escenarios };
}
