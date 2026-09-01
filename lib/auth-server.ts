import type { SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

export type UsuarioAuth = {
  id: number;
  fkEmpresa: number;
  nombre: string;
  email: string | null;
  esAdmin: boolean;
};

// Resuelve el usuario logueado a partir del header Authorization: Bearer
// <access_token de Supabase>. Toda ruta autenticada debe usar el fkEmpresa
// devuelto acá para filtrar sus queries — nunca un empresa_id que mande el
// cliente en el body/query, porque es la única barrera de aislamiento
// multi-tenant (no hay RLS, ver lib/db-admin.ts).
export async function usuarioDesdeRequest(req: NextRequest, db: SupabaseClient): Promise<UsuarioAuth | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const { data: { user }, error } = await db.auth.getUser(authHeader.slice(7));
  if (error || !user) return null;

  const { data: usuario } = await db
    .from("usuario")
    .select("id, fk_empresa, nombre, email, rol")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!usuario) return null;

  return {
    id: usuario.id,
    fkEmpresa: usuario.fk_empresa,
    nombre: usuario.nombre ?? "",
    email: usuario.email ?? user.email ?? null,
    esAdmin: usuario.rol === "admin",
  };
}
