import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/db-admin";
import { requireUsuario, esErrorResponse } from "@/lib/api-guard";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

const EXT_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

export async function POST(req: NextRequest) {
  // Cualquier excepción inesperada acá abajo (formData mal armado, Storage
  // caído, etc.) debe seguir devolviendo JSON — si no, el cliente recibe una
  // respuesta vacía y `res.json()` explota con un error críptico de navegador.
  try {
    const db = adminClient();
    const usuario = await requireUsuario(req, db);
    if (esErrorResponse(usuario)) return usuario;
    if (!usuario.esAdmin) return NextResponse.json({ error: "Solo un admin puede cambiar el logo." }, { status: 403 });

    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "Sin archivo." }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: "Formato no permitido (usá PNG, JPG, WEBP o SVG)." }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "El logo no puede pesar más de 2 MB." }, { status: 400 });

    const ext = EXT_BY_TYPE[file.type];
    const path = `${usuario.fkEmpresa}/logo.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadErr } = await db.storage.from("logos").upload(path, buffer, { contentType: file.type, upsert: true });
    if (uploadErr) {
      console.error("[empresa/logo] storage upload error:", uploadErr);
      return NextResponse.json({ error: `No se pudo subir el logo: ${uploadErr.message}` }, { status: 500 });
    }

    const { data: pub } = db.storage.from("logos").getPublicUrl(path);
    // Cache-bust: el nombre de archivo es siempre el mismo (logo.<ext>), así
    // que sin esto el navegador podría seguir mostrando el logo viejo cacheado.
    const logoUrl = `${pub.publicUrl}?v=${Date.now()}`;

    const { error: updateErr } = await db.from("empresa").update({ logo_url: logoUrl }).eq("id", usuario.fkEmpresa);
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, logo_url: logoUrl });
  } catch (e: any) {
    console.error("[empresa/logo] unexpected error:", e);
    return NextResponse.json({ error: e?.message ?? "Error inesperado al subir el logo." }, { status: 500 });
  }
}
