import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  EntidadeNaoEncontradaError,
  montarContextoAtual,
  resolverEntidade,
  SemPredicaoError,
} from "./contexto";
import { descreverCasoHistorico, descreverPerfilRisco } from "./descricao";
import { gerarEmbedding } from "./embeddings";
import { obterModeloEmbedding } from "./constantes";

export type Desfecho = "recuperado" | "cancelado";

export interface ResultadoIndexacao {
  caso_id: string;
  entidade_id: string;
  contexto_texto: string;
  desfecho: Desfecho;
  modelo_embedding: string;
}

export async function indexarCasoHistorico(params: {
  supabase: SupabaseClient;
  projetoId: string;
  identificadorEntidade: string;
  acaoRealizada: string;
  desfecho: Desfecho;
  eventoDesfechoId?: string;
  contextoTextoManual?: string;
  modeloId?: string;
}): Promise<ResultadoIndexacao> {
  const {
    supabase,
    projetoId,
    identificadorEntidade,
    acaoRealizada,
    desfecho,
    eventoDesfechoId,
    contextoTextoManual,
    modeloId,
  } = params;

  const entidade = await resolverEntidade(supabase, projetoId, identificadorEntidade);
  if (!entidade) {
    throw new EntidadeNaoEncontradaError(
      `Nenhuma entidade com identificador "${identificadorEntidade}" no projeto ${projetoId}.`
    );
  }

  let perfilRisco: string;
  if (contextoTextoManual?.trim()) {
    perfilRisco = contextoTextoManual.trim();
  } else {
    const contexto = await montarContextoAtual({ supabase, projetoId, entidade, modeloId });
    perfilRisco = descreverPerfilRisco(contexto);
  }

  const contextoTexto = descreverCasoHistorico({ perfilRisco, acaoRealizada, desfecho });
  const embedding = await gerarEmbedding(contextoTexto);

  const casoId = randomUUID();
  const { error } = await supabase.from("casos_historicos_embeddings").insert({
    id: casoId,
    projeto_id: projetoId,
    entidade_id: entidade.id,
    evento_desfecho_id: eventoDesfechoId ?? null,
    contexto_texto: contextoTexto,
    acao_realizada: acaoRealizada,
    desfecho,
    embedding: JSON.stringify(embedding),
  });

  if (error) throw new Error(`Falha ao indexar caso histórico: ${error.message}`);

  return {
    caso_id: casoId,
    entidade_id: entidade.id,
    contexto_texto: contextoTexto,
    desfecho,
    modelo_embedding: obterModeloEmbedding(),
  };
}

export { EntidadeNaoEncontradaError, SemPredicaoError };
