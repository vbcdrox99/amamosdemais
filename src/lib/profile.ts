import { supabase } from "@/integrations/supabase/client";
import { normalizePhoneNumber, phoneToEmailAlias } from "@/lib/utils";

export async function ensureProfileForCurrentUser(fullName?: string, phoneRaw?: string) {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return;

  const email = user.email ?? null;
  const phone_number = phoneRaw ? normalizePhoneNumber(phoneRaw) : null;
  // Não sobrescreve full_name com null quando não for fornecido
  const payload: any = { id: user.id, email, phone_number };
  if (typeof fullName !== "undefined") {
    payload.full_name = fullName;
  }
  await supabase.from("profiles").upsert(payload, { onConflict: "id" });
}