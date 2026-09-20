import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";
import { montarClientesPainel } from "./clientes";
import { resolverModeloAtivoId, resolverProjetoId } from "./projeto";
import type { ClientePainel } from "./tipos";

export interface PainelCarregado {
  supabase: SupabaseClient;
  projetoId: string;
  /** null quando o projeto não tem modelo ativo — o painel mostra estado vazio. */
  modeloId: string | null;
  clientes: ClientePainel[];
  semPredicao: number;
}

/**
 * Carrega a carteira do projeto do usuário logado para Server Components,
 * sem passar por HTTP (evita reenviar cookies para a própria API). Memoizado
 * por requisição via `cache`, então layout e página podem chamar à vontade.
 */
export const carregarPainel = cache(async (): Promise<PainelCarregado> => {
  const supabase = criarClienteSupabaseAdmin();
  const projetoId = await resolverProjetoId();
  const modeloId = await resolverModeloAtivoId(supabase, projetoId);

  if (!modeloId) {
    return { supabase, projetoId, modeloId, clientes: [], semPredicao: 0 };
  }

  const { clientes, semPredicao } = await montarClientesPainel({ supabase, projetoId, modeloId });
  return { supabase, projetoId, modeloId, clientes, semPredicao };
});
