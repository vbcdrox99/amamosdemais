import { createClient } from "@supabase/supabase-js";

// Usando o Supabase original do usuário
const url = "https://ngoagfjqkotpyqjflqem.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5nb2FnZmpxa290cHlxamZscWVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzNjI1NjcsImV4cCI6MjA3NjkzODU2N30.D_sWko-QRM2Jc8zT-EY9w0vtp5KB8IAOYAd_hZKbTt4";

export const supabase = createClient(url, key, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});

// Helper para limpar storage local do token quando houver erro de refresh/revogação
export function clearAuthStorage() {
  try {
    const host = new URL(url).host;
    const projectRef = host.split(".")[0];
    const storageKey = `sb-${projectRef}-auth-token`;
    localStorage.removeItem(storageKey);
  } catch {}
}