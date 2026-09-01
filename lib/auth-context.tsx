"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type UsuarioSesion = {
  id: number;
  fk_empresa: number;
  nombre: string | null;
  email: string | null;
  rol: "admin" | "reclutador";
  empresa: { id: number; nombre: string; slug: string; color: string } | null;
};

type AuthContextType = {
  session: Session | null;
  usuario: UsuarioSesion | null;
  loading: boolean;
  esAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshUsuario: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [loading, setLoading] = useState(true);

  // La tabla `usuario` tiene RLS "solo service_role" (ver migrations/007_rls.sql)
  // — el cliente nunca la lee directo con la anon key, siempre vía esta ruta.
  async function loadUsuario(accessToken: string) {
    const res = await fetch("/api/mi-usuario", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const json = await res.json().catch(() => ({ usuario: null }));
    setUsuario(json.usuario ?? null);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s) loadUsuario(s.access_token).finally(() => setLoading(false));
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) loadUsuario(s.access_token);
      else setUsuario(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/onboarding` },
    });
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setUsuario(null);
  }

  async function refreshUsuario() {
    if (session) await loadUsuario(session.access_token);
  }

  return (
    <AuthContext.Provider value={{
      session, usuario, loading,
      esAdmin: usuario?.rol === "admin",
      signInWithGoogle, signOut, refreshUsuario,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
