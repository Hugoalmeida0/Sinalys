import type { SupabaseClient } from "@supabase/supabase-js";
import { gerarEmbedding } from "./embeddings";
import { PADRAO_LIMITE_LOOKALIKE, PADRAO_SIMILARIDADE_MINIMA } from "./constantes";
import type { CasoSimilar } from "./tipos";

/**
 * Task 4.2 — Busca semântica por similaridade via pgvector.
 *
 * Vetoriza o perfil de risco atual e pergunta ao banco quais clientes do
 * histórico se comportaram de forma parecida, trazendo junto a ação tomada e o
 * desfecho (docs/inteligencia.md §1). A ordenação e o corte acontecem no
 * Postgres, pela função `buscar_casos_similares`, para que o índice HNSW seja
 * usado em vez de trazer a base inteira para a aplicação.
 */
export async function buscarCasosSimilares(params: {
  supabase: SupabaseClient;
  projetoId: string;
  perfilRisco: string;
  /** Excluída dos resultados para o cliente não ser comparado consigo mesmo. */
  entidadeExcluida?: string;
  limite?: number;
  similaridadeMinima?: number;
}): Promise<CasoSimilar[]> {
  const {
    supabase,
    projetoId,
    perfilRisco,
    entidadeExcluida,
    limite = PADRAO_LIMITE_LOOKALIKE,
    similaridadeMinima = PADRAO_SIMILARIDADE_MINIMA,
  } = params;

  const embedding = await gerarEmbedding(perfilRisco);

  const { data, error } = await supabase.rpc("buscar_casos_similares", {
    p_projeto_id: projetoId,
    // pgvector aceita o literal textual do vetor via PostgREST.
    p_embedding: JSON.stringify(embedding),
    p_limite: limite,
    p_entidade_excluida: entidadeExcluida ?? null,
    p_similaridade_minima: similaridadeMinima,
  });

  if (error) {
    throw new Error(`Falha na busca lookalike (pgvector): ${error.message}`);
  }

  return (data ?? []).map((linha: Record<string, unknown>) => ({
    id: linha.id as string,
    entidade_id: linha.entidade_id as string,
    nome_exibicao: (linha.nome_exibicao as string | null) ?? null,
    contexto_texto: linha.contexto_texto as string,
    acao_realizada: linha.acao_realizada as string,
    desfecho: linha.desfecho as "recuperado" | "cancelado",
    similaridade: Number(linha.similaridade),
    criado_em: linha.criado_em as string,
  }));
}
