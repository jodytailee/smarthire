import type { SupabaseClient } from "@supabase/supabase-js";
import type { DocumentoAdjunto } from "./postulantes-ia";

export type Archivo = { tipo: string; nombre: string; path: string };

const MIME_MAP: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

// Descarga hasta 3 documentos del bucket privado `postulaciones` y los
// convierte a base64 para mandarlos como adjuntos multimodales a Claude.
export async function prepararArchivosParaIA(db: SupabaseClient, archivos: Archivo[]): Promise<DocumentoAdjunto[]> {
  const soportados = archivos
    .filter((a) => !!MIME_MAP[a.nombre?.split(".").pop()?.toLowerCase() ?? ""] && !!a.path)
    .slice(0, 3);

  const resultados = await Promise.all(
    soportados.map(async (a) => {
      try {
        const { data: signed } = await db.storage.from("postulaciones").createSignedUrl(a.path, 120);
        if (!signed?.signedUrl) return null;
        const res = await fetch(signed.signedUrl, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) return null;
        const buffer = await res.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        const ext = a.nombre.split(".").pop()!.toLowerCase();
        return { nombre: a.nombre, mimeType: MIME_MAP[ext], base64 };
      } catch {
        return null;
      }
    })
  );
  return resultados.filter(Boolean) as DocumentoAdjunto[];
}
