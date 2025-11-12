import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { normalizePhoneNumber } from "@/lib/utils";

type AuthState = {
  loading: boolean;
  session: any | null;
  error?: string;
};

export function useAuthRole() {
  const [state, setState] = useState<AuthState>({ loading: true, session: null });
  const [profile, setProfile] = useState<{ id: string; email: string | null; phone_number?: string | null; full_name?: string | null; avatar_url?: string | null; instagram?: string | null; birthdate?: string | null; is_approved?: boolean; is_admin?: boolean } | null>(null);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setState({ loading: false, session: data.session });
    };
    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ loading: false, session });
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const loadProfile = async () => {
      const userId = state.session?.user?.id;
      if (!userId) {
        setProfile(null);
        return;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("id,email,phone_number,full_name,avatar_url,instagram,birthdate,is_approved,is_admin")
        .eq("id", userId)
        .maybeSingle();
      if (error) {
        // Se o refresh token estiver inválido/revogado, força sign-out e limpa storage para evitar loops
        try {
          const { clearAuthStorage } = await import("@/lib/supabase");
          clearAuthStorage();
        } catch {}
        try { await supabase.auth.signOut(); } catch {}
        setProfile({ id: userId, email: state.session?.user?.email ?? null, phone_number: null, full_name: null, avatar_url: null, is_approved: false, is_admin: false });
        // Redireciona para autenticação para recuperar sessão
        try { if (location.pathname !== "/auth") location.replace("/auth"); } catch {}
        return;
      }
      setProfile(
        data
          ? { id: data.id, email: (data as any).email ?? null, phone_number: (data as any).phone_number ?? null, full_name: (data as any).full_name ?? null, avatar_url: (data as any).avatar_url ?? null, instagram: (data as any).instagram ?? null, birthdate: (data as any).birthdate ?? null, is_approved: (data as any).is_approved ?? false, is_admin: (data as any).is_admin ?? false }
          : { id: userId, email: state.session?.user?.email ?? null, phone_number: null, full_name: null, avatar_url: null, instagram: null, birthdate: null, is_approved: false, is_admin: false }
      );
    };
    loadProfile();
  }, [state.session?.user?.id]);

  // Assina mudanças no perfil (Realtime) para refletir aprovação instantaneamente
  useEffect(() => {
    const userId = state.session?.user?.id;
    if (!userId) return;
    const channel = supabase
      .channel(`profiles-approval-${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
        (payload) => {
          const next: any = payload.new ?? {};
          setProfile((prev) => ({
            id: prev?.id ?? userId,
            email: next.email ?? prev?.email ?? null,
            phone_number: next.phone_number ?? prev?.phone_number ?? null,
            full_name: next.full_name ?? prev?.full_name ?? null,
            avatar_url: next.avatar_url ?? prev?.avatar_url ?? null,
            instagram: next.instagram ?? prev?.instagram ?? null,
            birthdate: next.birthdate ?? prev?.birthdate ?? null,
            is_approved: !!next.is_approved,
          }));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [state.session?.user?.id]);

  // Fallback: refetch periódico do perfil quando ainda não aprovado
  useEffect(() => {
    const userId = state.session?.user?.id;
    const notApproved = !!state.session && !profile?.is_approved;
    if (!userId || !notApproved) return;
    let cancelled = false;
    const tick = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,email,phone_number,full_name,avatar_url,instagram,birthdate,is_approved,is_admin")
        .eq("id", userId)
        .maybeSingle();
      if (!cancelled && !error && data) {
        setProfile({
          id: data.id,
          email: (data as any).email ?? null,
          phone_number: (data as any).phone_number ?? null,
          full_name: (data as any).full_name ?? null,
          avatar_url: (data as any).avatar_url ?? null,
          instagram: (data as any).instagram ?? null,
          birthdate: (data as any).birthdate ?? null,
          is_approved: !!(data as any).is_approved,
          is_admin: !!(data as any).is_admin,
        });
      }
    };
    const iv = setInterval(tick, 5000);
    // dispara uma vez imediatamente
    tick();
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [state.session?.user?.id, profile?.is_approved]);

  // Determina admin pela conta específica solicitada
  const isAdmin = useMemo(() => {
    const email = state.session?.user?.email?.toLowerCase() ?? "";
    const phoneProfile = profile?.phone_number ?? "";
    // Quando login é por telefone, o email da sessão é um alias: "<digits>@email.com"
    const emailLocalPart = (email.split("@")[0] ?? "");
    const phoneFromAlias = normalizePhoneNumber(emailLocalPart);
    const adminEmails = ["dotaplaybrasil111@gmail.com"]; // Fallback por email
    const adminPhones = ["11996098995", "75981423232"]; // Fallback por telefone
    // Preferir flag no banco (perfil.is_admin); manter fallbacks para compatibilidade
    const isAdminByProfile = !!profile?.is_admin;
    return (
      isAdminByProfile ||
      adminEmails.includes(email) ||
      adminPhones.includes(phoneProfile) ||
      adminPhones.includes(phoneFromAlias)
    );
  }, [state.session?.user?.email, profile?.phone_number]);

  // Níveis: 3 admin, 2 autenticado, 1 convidado
  const level = useMemo(() => {
    if (isAdmin) return 3;
    // Considera autenticado apenas se aprovado
    const approved = !!profile?.is_approved;
    return state.session && approved ? 2 : 1;
  }, [state.session, isAdmin, profile?.is_approved]);

  const flags = {
    // Autenticado quando aprovado OU quando é admin
    isAuthenticated: !!state.session && (!!profile?.is_approved || isAdmin),
  };

  const approved = !!profile?.is_approved;
  const approvedOrAdmin = approved || isAdmin;
  const permissions = {
    canCreateEvents: !!state.session && approvedOrAdmin,
    canComment: !!state.session && approvedOrAdmin,
    canConfirmPresence: !!state.session && approvedOrAdmin,
    canCreatePolls: !!state.session && approvedOrAdmin,
    canEditOwnProfile: !!state.session && approvedOrAdmin,
    canAccessAdmin: isAdmin,
  };

  // Considera carregando enquanto sessão está carregando OU perfil ainda não obtido após login
  const loadingCombined = useMemo(() => {
    const sessionLoaded = !state.loading;
    const waitingProfile = !!state.session && profile === null;
    return state.loading || (sessionLoaded && waitingProfile);
  }, [state.loading, state.session, profile]);

  return { ...state, loading: loadingCombined, level, flags, permissions, profile, isAdmin } as any;
}