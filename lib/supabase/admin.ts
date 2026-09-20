import { createClient } from "@supabase/supabase-js";

export function criarClienteSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Variáveis de ambiente do Supabase ausentes (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
