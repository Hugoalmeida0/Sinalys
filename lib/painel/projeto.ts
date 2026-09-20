import type { SupabaseClient } from "@supabase/supabase-js";
import { obterUsuarioSessao } from "@/lib/auth/usuario";
import { obterProjetoIdPadrao } from "@/lib/ingestao/constantes";

/**
 * Resolve o projeto (tenant) da requisição, nesta ordem:
 * 1. `app_metadata.projeto_id` do usuário logado (cookies de sessão);
 * 2. `projeto_id` explícito (query string ou corpo) — scripts/cron sem sessão;
 * 3. `DEFAULT_PROJETO_ID` (fallback legado, ver pendência no TASKS.md).
 */
export async function resolverProjetoId(explicito?: string | null): Promise<string> {
  const usuario = await obterUsuarioSessao();
  if (usuario?.projetoId) return usuario.projetoId;
  if (explicito) return explicito;
  return obterProjetoIdPadrao();
}

/** Modelo ativo do projeto, ou `null` se não houver. */
export async function resolverModeloAtivoId(
  supabase: SupabaseClient,
  projetoId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("modelos")
    .select("id")
    .eq("projeto_id", projetoId)
    .eq("status", "ativo")
    .maybeSingle();
  if (error) throw new Error(`Falha ao buscar modelo ativo: ${error.message}`);
  return (data?.id as string | undefined) ?? null;
}
