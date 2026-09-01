import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Cliente con service_role, usado en todas las rutas API. Nunca se expone al
// cliente — mismo criterio que EasyGo: sin RLS, todo el aislamiento entre
// empresas se hace filtrando por fk_empresa en cada query (ver auth-server.ts).
export function adminClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
