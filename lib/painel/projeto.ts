import type { SupabaseClient } from "@supabase/supabase-js";
import { obterUsuarioSessao } from "@/lib/auth/usuario";
import { obterProjetoIdPadrao } from "@/lib/ingestao/constantes";
import { obterModeloAtivoIdCache } from "./cache-estatico";

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

/**
 * Modelo ativo do projeto, ou `null` se não houver. Cacheado por 12h
 * (lib/painel/cache-estatico.ts) — troca de modelo ativo é uma ação manual
 * rara, não faz parte do fluxo normal de uso. `supabase` fica no parâmetro só
 * para não quebrar as chamadas existentes; a leitura cacheada abre seu
 * próprio client internamente.
 */
export async function resolverModeloAtivoId(
  _supabase: SupabaseClient,
  projetoId: string
): Promise<string | null> {
  return obterModeloAtivoIdCache(projetoId);
}
