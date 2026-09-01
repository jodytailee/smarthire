import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/db-admin";

function slugify(texto: string): string {
  const sinAcentos = texto.normalize("NFD").replace(/[̀-ͯ]/g, "");
  return sinAcentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Primer login con Google: crea la empresa + el usuario admin. Si el
// auth_user_id ya tiene un usuario, no hace nada (el front debería haber
// redirigido directo al panel, pero por las dudas no se duplica).
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const db = adminClient();
  const { data: { user }, error: authErr } = await db.auth.getUser(authHeader.slice(7));
  if (authErr || !user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { data: existente } = await db.from("usuario").select("id").eq("auth_user_id", user.id).maybeSingle();
  if (existente) return NextResponse.json({ ok: true, yaExistia: true });

  const body = await req.json().catch(() => ({}));
  const nombreEmpresa: string = (body.nombreEmpresa ?? "").trim();
  const descripcion: string = (body.descripcion ?? "").trim();
  if (!nombreEmpresa) return NextResponse.json({ error: "El nombre de la empresa es obligatorio." }, { status: 400 });

  let slug = slugify(nombreEmpresa) || "empresa";
  for (let intento = 0; intento < 20; intento++) {
    const candidato = intento === 0 ? slug : `${slug}-${intento + 1}`;
    const { data: choque } = await db.from("empresa").select("id").eq("slug", candidato).maybeSingle();
    if (!choque) { slug = candidato; break; }
  }

  const { data: empresa, error: errEmpresa } = await db
    .from("empresa")
    .insert({ nombre: nombreEmpresa, slug, descripcion: descripcion || null })
    .select("id, nombre, slug, color")
    .single();
  if (errEmpresa || !empresa) {
    return NextResponse.json({ error: "No se pudo crear la empresa." }, { status: 500 });
  }

  const { error: errUsuario } = await db.from("usuario").insert({
    fk_empresa: empresa.id,
    auth_user_id: user.id,
    nombre: user.user_metadata?.full_name ?? user.email,
    email: user.email,
    rol: "admin",
  });
  if (errUsuario) {
    await db.from("empresa").delete().eq("id", empresa.id);
    return NextResponse.json({ error: "No se pudo crear el usuario." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, empresa });
}
