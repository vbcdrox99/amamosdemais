import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

export type Role = "viewer" | "user" | "admin";
export type Status = "pending" | "approved" | "blocked";

export type Profile = {
  id: string;
  email: string | null;
  full_name?: string | null;
  phone?: string | null;
  address?: string | null;
  status: Status;
  role: Role;
};

type AuthState = {
  loading: boolean;
  session: any | null;
  profile: Profile | null;
  error?: string;
};

export function useAuthRole() {
  const [state, setState] = useState<AuthState>({ loading: true, session: null, profile: null });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!supabase) {
        setState({ loading: false, session: null, profile: null, error: "Supabase não configurado" });
        return;
      }
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session ?? null;
      let profile: Profile | null = null;
      if (session?.user?.id) {
        // Busca flexível: pega todas as colunas e normaliza no cliente
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();

        let loaded = data as any | null;
        let loadError = error || null;

        // Fallback: em bases antigas, o vínculo pode ser por email
        if (!loaded && !loadError && session.user.email) {
          const { data: byEmail, error: errByEmail } = await supabase
            .from("profiles")
            .select("*")
            .eq("email", session.user.email)
            .maybeSingle();
          if (byEmail && !errByEmail) {
            loaded = byEmail as any;
          } else if (errByEmail) {
            loadError = errByEmail;
          }
        }

        if (!loadError && loaded) {
          const raw = loaded as any;
          const roleStr = String(raw.role ?? "viewer").toLowerCase();
          const statusStr = String(raw.status ?? "pending").toLowerCase();
          const normalizeRole = (r: string): Role => (r === "admin" ? "admin" : r === "user" ? "user" : "viewer");
          const normalizeStatus = (s: string): Status => {
            if (s.includes("approv") || s.includes("aprov")) return "approved";
            if (s.includes("block")) return "blocked";
            return "pending";
          };

          profile = {
            id: String(raw.id),
            email: raw.email ?? null,
            full_name: raw.full_name ?? raw.name ?? null,
            phone: raw.phone ?? raw.account_number ?? null,
            address: raw.address ?? null,
            status: normalizeStatus(statusStr),
            role: normalizeRole(roleStr),
          };
        }

        // Provisiona perfil padrão se não existir (tabela deve existir)
        if (!profile) {
          try {
            const displayName = ((session.user.user_metadata as any)?.account_number
              ? `Usuário ${(session.user.user_metadata as any)?.account_number}`
              : (session.user.email ? `Usuário ${session.user.email.split("@")[0]}` : "Usuário"));

            const { error: upsertError } = await supabase
              .from("profiles")
              .upsert({
                id: session.user.id,
                email: session.user.email,
                phone: (session.user.user_metadata as any)?.account_number ?? null,
                full_name: displayName,
                status: "pending",
                role: "user",
              }, { onConflict: "id" });

            if (!upsertError) {
              const { data: redata } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", session.user.id)
                .maybeSingle();
              if (redata) {
                const raw = redata as any;
                const roleStr = String(raw.role ?? "viewer").toLowerCase();
                const statusStr = String(raw.status ?? "pending").toLowerCase();
                const normalizeRole = (r: string): Role => (r === "admin" ? "admin" : r === "user" ? "user" : "viewer");
                const normalizeStatus = (s: string): Status => {
                  if (s.includes("approv") || s.includes("aprov")) return "approved";
                  if (s.includes("block")) return "blocked";
                  return "pending";
                };
                profile = {
                  id: String(raw.id),
                  email: raw.email ?? null,
                  full_name: raw.full_name ?? raw.name ?? null,
                  phone: raw.phone ?? raw.account_number ?? null,
                  address: raw.address ?? null,
                  status: normalizeStatus(statusStr),
                  role: normalizeRole(roleStr),
                };
              }
            }
          } catch (_) {
            // Ignora erros (ex.: tabela não criada ainda)
          }
        }
      }
      if (!cancelled) setState({ loading: false, session, profile });
    }
    load();
    const { data: sub } = supabase?.auth.onAuthStateChange(() => load()) ?? { data: null };
    return () => {
      cancelled = true;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  const level = useMemo(() => {
    if (!state.session || !state.profile) return 1;
    if (state.profile.role === "admin") return 3;
    if (state.profile.role === "user" && state.profile.status === "approved") return 2;
    return 1;
  }, [state.session, state.profile]);

  const flags = {
    isAuthenticated: !!state.session,
    isApproved: state.profile?.status === "approved",
    isAdmin: state.profile?.role === "admin",
  };

  const permissions = {
    canCreateEvents: level >= 2,
    canComment: level >= 2,
    canConfirmPresence: level >= 2,
    canCreatePolls: level >= 2,
    canEditOwnProfile: level >= 2,
    canAccessAdmin: level >= 3,
  };

  return { ...state, level, flags, permissions };
}