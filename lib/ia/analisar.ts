import { randomUUID } from "node:crypto";
import { generateObject } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { criarProvedorOpenRouter } from "./provedor";
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
 * (lookalike vetorial), gera o diagnóstico estruturado via OpenRouter e persiste
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

  // 3. Prompting e IA: contrato de saída forçado por schema Zod (vira
  //    `response_format: json_schema` na OpenRouter — verificado no modelo padrão).
  const openrouter = criarProvedorOpenRouter();
  const modeloLlm = obterModeloLlm();

  const { object: bruto } = await generateObject({
    model: openrouter.chat(modeloLlm),
    schema: esquemaDiagnostico,
    schemaName: "DiagnosticoChurn",
    schemaDescription: "Diagnóstico de risco de churn e plano de ação prescritivo para Customer Success.",
    system: PROMPT_SISTEMA,
    prompt: montarPromptUsuario({ contexto, casosSimilares }),
  });
  const diagnostico = normalizarDiagnostico(bruto);

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

/**
 * O modelo tende a numerar os itens do plano ("1. Ligar para...") mesmo
 * instruído a não fazê-lo — a numeração é responsabilidade de quem exibe a
 * lista, e duplica quando vem embutida. Remove prefixos de numeração/marcador e
 * descarta itens que ficaram vazios, mantendo o mínimo de 1 exigido pelo schema.
 */
export function normalizarDiagnostico(diagnostico: Diagnostico): Diagnostico {
  const plano = diagnostico.plano_acao_imediato
    // Até 2 dígitos: numeração de lista, nunca um ano ("2026-09-20: ...") ou quantidade.
    .map((item) => item.replace(/^\s*(?:\d{1,2}\s*[.)\-–:]|[-*•])\s*/, "").trim())
    .filter((item) => item.length > 0);

  return {
    ...diagnostico,
    plano_acao_imediato: plano.length > 0 ? plano : diagnostico.plano_acao_imediato,
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
