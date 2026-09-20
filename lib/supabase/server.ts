import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { obterConfigSupabasePublica } from "./chave-publica";

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
        }
      },
    },
  });
}
