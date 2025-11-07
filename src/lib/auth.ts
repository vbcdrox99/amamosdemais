import { supabase } from "@/integrations/supabase/client";
import { phoneToEmailAlias, normalizePhoneNumber } from "@/lib/utils";

export async function signUpWithEmail(email: string, password: string) {
  return await supabase.auth.signUp({ email, password });
}

export async function signInWithEmail(email: string, password: string) {
  return await supabase.auth.signInWithPassword({ email, password });
}

export async function getSession() {
  return await supabase.auth.getSession();
}

export async function signOut() {
  return await supabase.auth.signOut();
}

// Phone-based helpers
export async function signUpWithPhone(phoneRaw: string, password: string) {
  const alias = phoneToEmailAlias(phoneRaw);
  return await supabase.auth.signUp({ email: alias, password });
}

export async function signInWithPhone(phoneRaw: string, password: string) {
  const alias = phoneToEmailAlias(phoneRaw);
  return await supabase.auth.signInWithPassword({ email: alias, password });
}