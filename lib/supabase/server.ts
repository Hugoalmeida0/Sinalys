import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { obterConfigSupabasePublica } from "./chave-publica";

/**
 * Cliente Supabase autenticado pela sessão do usuário (cookies), para Route
 * Handlers, Server Actions e Server Components. Usa a chave pública — respeita
 * RLS quando ele for habilitado. Para bypass administrativo continue usando
 * `criarClienteSupabaseAdmin` (lib/supabase/admin.ts).
 */
export async function criarClienteSupabaseServidor() {
  const cookieStore = await cookies();
  const { url, chave } = obterConfigSupabasePublica();

  return createServerClient(url, chave, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Chamado a partir de um Server Component (não pode gravar cookies).
          // Seguro ignorar: o proxy.ts renova a sessão antes da renderização.
        }
      },
    },
  });
}
