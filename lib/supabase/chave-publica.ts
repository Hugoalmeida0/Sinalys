/**
 * Chave pública do projeto Supabase usada pelos clientes que respeitam RLS
 * (browser e cookies de sessão). Aceita o nome novo (`PUBLISHABLE_KEY`) e o
 * legado (`ANON_KEY`, que é o que está no `.env.local` hoje).
 */
export function obterConfigSupabasePublica(): { url: string; chave: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !chave) {
    throw new Error(
      "Variáveis de ambiente do Supabase ausentes (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ou NEXT_PUBLIC_SUPABASE_ANON_KEY)."
    );
  }
  return { url, chave };
}
