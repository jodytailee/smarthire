// Prompts de IA para el pipeline de postulantes: scoring, rechazo y
// "futuro candidato". A diferencia de EasyGo (donde scorearConClaude está
// duplicada casi textual entre postular/route.ts y analisis/route.ts), acá
// vive en un solo lugar y recibe la empresa como parámetro para personalizar
// el prompt en vez de hardcodear el nombre de una sola compañía.

export type EmpresaContexto = { nombre: string; descripcion?: string | null };
export type Respuesta = { pregunta: string; respuesta: string };
export type DocumentoAdjunto = { nombre: string; mimeType: string; base64: string };

export type ResultadoScoring = {
  puntaje: number | null;
  analisis: string | null;
  sugerencias: string | null;
  canton_residencia: string | null;
  pretension_monto?: number | null;
};

function contextoEmpresa(empresa: EmpresaContexto): string {
  return empresa.descripcion
    ? `${empresa.nombre} (${empresa.descripcion})`
    : empresa.nombre;
}

function docsAContent(docs: DocumentoAdjunto[]): any[] {
  return docs.map((doc) =>
    doc.mimeType === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: doc.base64 }, title: doc.nombre }
      : { type: "image", source: { type: "base64", media_type: doc.mimeType, data: doc.base64 } }
  );
}

async function llamarClaude(content: any, model: string, maxTokens: number, timeoutMs: number): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: "user", content }] }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      console.warn("[postulantes-ia] claude error:", res.status, (await res.text()).slice(0, 200));
      return null;
    }
    const data = await res.json();
    return data?.content?.[0]?.text ?? null;
  } catch (e) {
    console.warn("[postulantes-ia] claude error:", e);
    return null;
  }
}

// Scoring de una postulación. `incluirPretension` solo debe pedirse una vez,
// al postular — el re-análisis manual desde el detalle no lo vuelve a pedir
// (mismo criterio que EasyGo).
export async function scorearPostulacion(args: {
  empresa: EmpresaContexto;
  nombreCandidato: string;
  puesto: string;
  respuestas: Respuesta[];
  docs?: DocumentoAdjunto[];
  incluirPretension?: boolean;
}): Promise<ResultadoScoring> {
  const vacio: ResultadoScoring = { puntaje: null, analisis: null, sugerencias: null, canton_residencia: null, pretension_monto: null };
  const { empresa, nombreCandidato, puesto, respuestas, docs = [], incluirPretension = false } = args;

  const bloqueRespuestas = respuestas
    .map((r, i) => `Pregunta ${i + 1}: ${r.pregunta}\nRespuesta: ${r.respuesta}`)
    .join("\n\n---\n\n");

  const docNota = docs.length > 0
    ? `\n\nTambién revisá los ${docs.length} documento(s) adjunto(s) del candidato (CV, record criminal, títulos, etc.) y consideralos en tu evaluación.`
    : "";

  const pretensionKey = incluirPretension
    ? `,\n  "pretension_monto": <número entero en colones costarricenses, o null si no se mencionó. Interpretá expresiones como "380mil"→380000, "380 000"→380000, "$800"→convertir usando TC≈530, "trescientos ochenta mil"→380000. Siempre devolvé el monto en colones.>`
    : "";

  const prompt = `Eres un experto en reclutamiento de personal para ${contextoEmpresa(empresa)}, una empresa en Costa Rica. Evaluá la postulación de ${nombreCandidato} para el puesto de ${puesto}.

${bloqueRespuestas}${docNota}

Respondé con exactamente estas claves JSON (sin texto adicional):
{
  "puntaje": <número entre 0 y 100>,
  "analisis": "<párrafo de 3-5 oraciones en español con fortalezas y áreas de mejora, mencionando documentos si están disponibles>",
  "sugerencias": "<lista de 3-5 preguntas o temas concretos para una segunda entrevista>"${pretensionKey},
  "canton_residencia": "<nombre del cantón de Costa Rica donde vive el candidato, si lo menciona en cualquiera de sus respuestas (aunque sea de forma indirecta, ej. un distrito o barrio del que se pueda inferir el cantón); si no hay ninguna pista, poné null>"
}

Considerá: orientación al puesto, experiencia relevante, resolución de problemas, ética laboral, disponibilidad, y comunicación.`;

  const content = [...docsAContent(docs), { type: "text", text: prompt }];
  const texto = await llamarClaude(content, "claude-haiku-4-5-20251001", 1024, 45000);
  if (!texto) return vacio;

  try {
    const match = texto.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON in Claude response");
    const parsed = JSON.parse(match[0]);
    return {
      puntaje: parsed.puntaje != null ? Number(parsed.puntaje) : null,
      analisis: parsed.analisis ? String(parsed.analisis) : null,
      sugerencias: parsed.sugerencias ? String(parsed.sugerencias) : null,
      canton_residencia: parsed.canton_residencia ? String(parsed.canton_residencia) : null,
      pretension_monto: incluirPretension && parsed.pretension_monto != null ? Number(parsed.pretension_monto) : null,
    };
  } catch (e) {
    console.warn("[postulantes-ia] parse error:", e);
    return vacio;
  }
}

export async function generarTextoRechazo(args: {
  empresa: EmpresaContexto;
  nombreCompleto: string;
  primerNombre: string;
  puesto: string;
  respuestas: Respuesta[];
}): Promise<string | null> {
  const { empresa, nombreCompleto, primerNombre, puesto, respuestas } = args;
  const bloqueRespuestas = respuestas
    .map((r, i) => `Pregunta ${i + 1}: ${r.pregunta}\nRespuesta: ${r.respuesta}`)
    .join("\n\n---\n\n");

  const prompt = `Sos parte del equipo de Recursos Humanos de ${contextoEmpresa(empresa)}, una empresa en Costa Rica.
Debés redactar una carta de rechazo empática y profesional para ${nombreCompleto}, quien aplicó al puesto de ${puesto} y no fue seleccionado/a en esta ronda.

Respuestas del candidato/a en la prueba de postulación:
${bloqueRespuestas}

Instrucciones ESTRICTAS:
- Escribe únicamente el cuerpo del correo (sin asunto, sin "De:", sin "Para:", sin metadatos)
- Inicia saludando a ${primerNombre} por su nombre de pila, usando "Estimado/a ${primerNombre},"
- Agradecé su interés en ${empresa.nombre} y el tiempo dedicado al proceso
- Informá que en esta ocasión no continuaremos con su candidatura (sé respetuoso/a, no crueles)
- Identificá 2 o 3 áreas de mejora ESPECÍFICAS y CONCRETAS basadas en sus respuestas (ej: "notamos que en la situación de atención al cliente mencionaste X, te sugerimos trabajar en Y")
- Invitá a que aplique nuevamente en 6 meses una vez que haya trabajado en esas áreas
- Cerrá con un tono cálido y esperanzador
- Firmá como "El equipo de Recursos Humanos de ${empresa.nombre}"
- Usá español de Costa Rica, tono formal pero cercano (podés usar "usted" o "vos", lo que se sienta más natural)
- Extensión: 3 a 4 párrafos medianos
- SOLO el cuerpo del correo, nada más`;

  const texto = await llamarClaude(prompt, "claude-haiku-4-5-20251001", 1024, 30000);
  return texto?.trim() ?? null;
}

export async function generarTextoFuturoCandidato(args: {
  empresa: EmpresaContexto;
  nombreCompleto: string;
  primerNombre: string;
  puesto: string;
  respuestas: Respuesta[];
}): Promise<string | null> {
  const { empresa, nombreCompleto, primerNombre, puesto, respuestas } = args;
  const bloqueRespuestas = respuestas
    .map((r, i) => `Pregunta ${i + 1}: ${r.pregunta}\nRespuesta: ${r.respuesta}`)
    .join("\n\n---\n\n");

  const prompt = `Sos parte del equipo de Recursos Humanos de ${contextoEmpresa(empresa)}, una empresa en Costa Rica.
Debés redactar un correo cálido y profesional para ${nombreCompleto}, quien aplicó al puesto de ${puesto}. El cupo de esta ronda ya se llenó, PERO su perfil es de interés para la empresa: quedará en un banco de candidatos prioritario y será de los primeros en ser contactados/as cuando se libere una posición similar. Esto NO es un rechazo definitivo.

Respuestas del candidato/a en la prueba de postulación:
${bloqueRespuestas}

Instrucciones ESTRICTAS:
- Escribí únicamente el cuerpo del correo (sin asunto, sin "De:", sin "Para:", sin metadatos)
- Iniciá saludando a ${primerNombre} por su nombre de pila, usando "¡Hola, ${primerNombre}!"
- Agradecé su interés en ${empresa.nombre} y el tiempo dedicado al proceso
- Explicá que el cupo de esta ronda ya se llenó, pero que su perfil es de nuestro interés y quedará guardado en un banco de candidatos prioritario, contactándolo/a apenas se libere una posición similar
- Identificá entre 2 y 3 puntos de mejora ESPECÍFICOS y CONSTRUCTIVOS basados en sus respuestas, con un tono de crecimiento y no de rechazo (ej: "para futuras oportunidades te recomendamos fortalecer X, ya que notamos Y en tu respuesta sobre Z")
- Cerrá con un tono cálido y esperanzador
- Firmá como "El equipo de Recursos Humanos de ${empresa.nombre}"
- Usá español de Costa Rica, tono formal pero cercano (podés usar "usted" o "vos", lo que se sienta más natural)
- Extensión: 3 a 4 párrafos medianos
- SOLO el cuerpo del correo, nada más`;

  const texto = await llamarClaude(prompt, "claude-haiku-4-5-20251001", 1024, 30000);
  return texto?.trim() ?? null;
}
