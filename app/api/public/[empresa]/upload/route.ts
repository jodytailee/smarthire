import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/db-admin";

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest, { params }: { params: Promise<{ empresa: string }> }) {
  const { empresa: empresaSlug } = await params;
  const db = adminClient();

  const { data: empresa } = await db.from("empresa").select("id").eq("slug", empresaSlug).maybeSingle();
  if (!empresa) return NextResponse.json({ error: "Empresa no encontrada." }, { status: 404 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const tipo = (form.get("tipo") as string | null) ?? "otro";
  const session = (form.get("session") as string | null) ?? "anon";

  if (!file) return NextResponse.json({ error: "Sin archivo." }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type))
    return NextResponse.json({ error: "Tipo de archivo no permitido." }, { status: 400 });
  if (file.size > MAX_BYTES)
    return NextResponse.json({ error: "El archivo supera los 10 MB." }, { status: 400 });

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  const path = `${empresa.id}/${session}/${tipo}_${safeName}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await db.storage
    .from("postulaciones")
    .upload(path, buffer, { contentType: file.type, upsert: true });

  if (error) {
    console.error("[public/upload] storage error:", error);
    return NextResponse.json({ error: "No se pudo subir el archivo." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, path, nombre: file.name, tipo });
}
