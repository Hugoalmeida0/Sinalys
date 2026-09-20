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
