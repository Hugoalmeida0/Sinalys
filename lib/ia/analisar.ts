import { randomUUID } from "node:crypto";
import { generateObject } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { criarProvedorGoogle } from "./provedor";
import { obterModeloEmbedding, obterModeloLlm } from "./constantes";
import {
  EntidadeNaoEncontradaError,
  montarContextoAtual,
  resolverEntidade,
  SemPredicaoError,
} from "./contexto";
import { descreverPerfilRisco } from "./descricao";
import { buscarCasosSimilares } from "./lookalike";
import { esquemaDiagnostico, type Diagnostico } from "./esquema";
import { montarPromptUsuario, PROMPT_SISTEMA } from "./prompt";
import type { CasoSimilar, ContextoAtual } from "./tipos";

export interface ResultadoAnalise {
  diagnostico_id: string;
  contexto: ContextoAtual;
  casos_similares: CasoSimilar[];
  diagnostico: Diagnostico;
  modelo_ia: string;
  modelo_embedding: string;
}

/**
 * Task 4.3 — Orquestração RAG + LLM.
 *
 * Consolida Contexto Atual (raio-x do motor matemático) e Contexto Histórico
 * (lookalike vetorial), gera o diagnóstico estruturado com o Gemini e persiste
 * em `diagnosticos_ia`. Escrito como função pura de rota para ser reaproveitado
 * pelo Vercel Cron do Módulo 5.4 sem passar por HTTP.
 */
export async function analisarRiscoEntidade(params: {
  supabase: SupabaseClient;
  projetoId: string;
  /** UUID interno da entidade ou o `id_externo` vindo da planilha. */
  identificadorEntidade: string;
  modeloId?: string;
  origemGatilho?: "manual" | "cron";
  persistir?: boolean;
}): Promise<ResultadoAnalise> {
  const {
    supabase,
    projetoId,
    identificadorEntidade,
    modeloId,
    origemGatilho = "manual",
    persistir = true,
  } = params;

  const entidade = await resolverEntidade(supabase, projetoId, identificadorEntidade);
  if (!entidade) {
    throw new EntidadeNaoEncontradaError(
      `Nenhuma entidade com identificador "${identificadorEntidade}" no projeto ${projetoId}.`
    );
  }

  // 1. Coleta de evidências: raio-x da última predição do motor matemático.
  const contexto = await montarContextoAtual({ supabase, projetoId, entidade, modeloId });
  const perfilRisco = descreverPerfilRisco(contexto);

  // 2. Busca RAG: casos históricos com comportamento parecido (Task 4.2).
  const casosSimilares = await buscarCasosSimilares({
    supabase,
    projetoId,
    perfilRisco,
    entidadeExcluida: entidade.id,
  });

  // 3. Prompting e IA: contrato de saída forçado por schema Zod.
  const google = criarProvedorGoogle();
  const modeloLlm = obterModeloLlm();

  const { object: diagnostico } = await generateObject({
    model: google(modeloLlm),
    schema: esquemaDiagnostico,
    schemaName: "DiagnosticoChurn",
    schemaDescription: "Diagnóstico de risco de churn e plano de ação prescritivo para Customer Success.",
    system: PROMPT_SISTEMA,
    prompt: montarPromptUsuario({ contexto, casosSimilares }),
  });

  const modeloEmbedding = obterModeloEmbedding();
  // Quando `persistir: false`, o id é só um identificador de correlação da resposta.
  let diagnosticoId: string = randomUUID();

  if (persistir) {
    diagnosticoId = await persistirDiagnostico({
      supabase,
      projetoId,
      contexto,
      casosSimilares,
      diagnostico,
      modeloLlm,
      modeloEmbedding,
      origemGatilho,
    });
  }

  return {
    diagnostico_id: diagnosticoId,
    contexto,
    casos_similares: casosSimilares,
    diagnostico,
    modelo_ia: modeloLlm,
    modelo_embedding: modeloEmbedding,
  };
}

async function persistirDiagnostico(params: {
  supabase: SupabaseClient;
  projetoId: string;
  contexto: ContextoAtual;
  casosSimilares: CasoSimilar[];
  diagnostico: Diagnostico;
  modeloLlm: string;
  modeloEmbedding: string;
  origemGatilho: "manual" | "cron";
}): Promise<string> {
  const id = randomUUID();

  const { error } = await params.supabase.from("diagnosticos_ia").insert({
    id,
    projeto_id: params.projetoId,
    entidade_id: params.contexto.entidade_id,
    predicao_id: params.contexto.predicao_id,
    diagnostico_principal: params.diagnostico.diagnostico_principal,
    analise_lookalike: params.diagnostico.analise_lookalike,
    plano_acao_imediato: params.diagnostico.plano_acao_imediato,
    // Guarda só o que permite auditar a recomendação depois, sem duplicar o texto do caso.
    casos_similares: params.casosSimilares.map((c) => ({
      caso_id: c.id,
      entidade_id: c.entidade_id,
      similaridade: c.similaridade,
      desfecho: c.desfecho,
    })),
    modelo_ia: params.modeloLlm,
    modelo_embedding: params.modeloEmbedding,
    origem_gatilho: params.origemGatilho,
  });

  if (error) throw new Error(`Falha ao gravar diagnóstico: ${error.message}`);
  return id;
}

export { EntidadeNaoEncontradaError, SemPredicaoError };
