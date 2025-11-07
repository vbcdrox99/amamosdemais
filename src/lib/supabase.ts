import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(url, key);

// Helper para limpar storage local do token quando houver erro de refresh/revogação
export function clearAuthStorage() {
  try {
    const host = new URL(url).host; // ex: ngoagfjqkotpyqjflqem.supabase.co
    const projectRef = host.split(".")[0];
    const storageKey = `sb-${projectRef}-auth-token`;
    localStorage.removeItem(storageKey);
  } catch {}
}