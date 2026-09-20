import type { SupabaseClient } from "@supabase/supabase-js";
import { obterUsuarioSessao } from "@/lib/auth/usuario";
import { obterProjetoIdPadrao } from "@/lib/ingestao/constantes";
import { obterModeloAtivoIdCache } from "./cache-estatico";

export async function resolverProjetoId(explicito?: string | null): Promise<string> {
  const usuario = await obterUsuarioSessao();
  if (usuario?.projetoId) return usuario.projetoId;
  if (explicito) return explicito;
  return obterProjetoIdPadrao();
}

export async function resolverModeloAtivoId(
  _supabase: SupabaseClient,
  projetoId: string
): Promise<string | null> {
  return obterModeloAtivoIdCache(projetoId);
}
