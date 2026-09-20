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

export const MODELO_IA_FALLBACK = "fallback-regras";

export interface ResultadoAnalise {
  diagnostico_id: string;
  contexto: ContextoAtual;
  casos_similares: CasoSimilar[];
  diagnostico: Diagnostico;
  modelo_ia: string;
  modelo_embedding: string;
  /**
   * "cache": diagnóstico reaproveitado de uma análise anterior para a mesma
   * predição (nada mudou desde então). "fallback": o LLM falhou/estourou o
   * limite gratuito e a resposta foi montada por regras determinísticas a
   * partir do motor de risco, sem passar por geração de texto. "ia": geração
   * normal via LLM.
   */
  origem: "ia" | "cache" | "fallback";
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
  /** Ignora o cache e força uma nova chamada ao LLM mesmo com diagnóstico recente para a mesma predição. */
  forcar?: boolean;
}): Promise<ResultadoAnalise> {
  const {
    supabase,
    projetoId,
    identificadorEntidade,
    modeloId,
    origemGatilho = "manual",
    persistir = true,
    forcar = false,
  } = params;

  const entidade = await resolverEntidade(supabase, projetoId, identificadorEntidade);
  if (!entidade) {
    throw new EntidadeNaoEncontradaError(
      `Nenhuma entidade com identificador "${identificadorEntidade}" no projeto ${projetoId}.`
    );
  }

  // 1. Coleta de evidências: raio-x da última predição do motor matemático.
  const contexto = await montarContextoAtual({ supabase, projetoId, entidade, modeloId });

  // Cache: a predição não muda entre corridas do motor, então um diagnóstico já
  // gerado para ela continua válido. Evita queimar cota do LLM gratuito (50
  // req/dia) reanalisando um cliente sem nenhum dado novo.
  if (!forcar) {
    const cache = await buscarDiagnosticoEmCache(supabase, projetoId, contexto.predicao_id);
    if (cache) return { ...cache, contexto };
  }

  const perfilRisco = descreverPerfilRisco(contexto);

  // 2. Busca RAG: casos históricos com comportamento parecido (Task 4.2).
  const casosSimilares = await buscarCasosSimilares({
    supabase,
    projetoId,
    perfilRisco,
    entidadeExcluida: entidade.id,
  });

  const modeloEmbedding = obterModeloEmbedding();

  // 3. Prompting e IA: contrato de saída forçado por schema Zod (vira
  //    `response_format: json_schema` na OpenRouter — verificado no modelo padrão).
  const modeloLlm = obterModeloLlm();
  let diagnostico: Diagnostico;
  let origem: ResultadoAnalise["origem"];
  let modeloUsado: string;

  try {
    const openrouter = criarProvedorOpenRouter();
    const { object: bruto } = await generateObject({
      model: openrouter.chat(modeloLlm),
      schema: esquemaDiagnostico,
      schemaName: "DiagnosticoChurn",
      schemaDescription:
        "Diagnóstico de risco de churn e plano de ação prescritivo para Customer Success.",
      system: PROMPT_SISTEMA,
      prompt: montarPromptUsuario({ contexto, casosSimilares }),
    });
    diagnostico = normalizarDiagnostico(bruto);
    origem = "ia";
    modeloUsado = modeloLlm;
  } catch (erroLlm) {
    // Fallback: LLM indisponível, sem cota ou timeout. Em vez de quebrar a
    // experiência do analista, devolve um diagnóstico determinístico montado
    // direto das regras do motor matemático — sem geração de texto.
    console.error(`[ia/analisar] LLM falhou, usando fallback por regras: ${(erroLlm as Error).message}`);
    diagnostico = gerarDiagnosticoFallback(contexto, casosSimilares);
    origem = "fallback";
    modeloUsado = MODELO_IA_FALLBACK;
  }

  // Quando `persistir: false`, o id é só um identificador de correlação da resposta.
  let diagnosticoId: string = randomUUID();

  if (persistir) {
    diagnosticoId = await persistirDiagnostico({
      supabase,
      projetoId,
      contexto,
      casosSimilares,
      diagnostico,
      modeloLlm: modeloUsado,
      modeloEmbedding,
      origemGatilho,
    });
  }

  return {
    diagnostico_id: diagnosticoId,
    contexto,
    casos_similares: casosSimilares,
    diagnostico,
    modelo_ia: modeloUsado,
    modelo_embedding: modeloEmbedding,
    origem,
  };
}

/**
 * Reaproveita o diagnóstico mais recente já persistido para esta predição, se
 * existir. Retorna `null` quando não há nada em cache (primeira análise).
 */
async function buscarDiagnosticoEmCache(
  supabase: SupabaseClient,
  projetoId: string,
  predicaoId: string
): Promise<ResultadoAnalise | null> {
  const { data, error } = await supabase
    .from("diagnosticos_ia")
    .select(
      "id, diagnostico_principal, analise_lookalike, plano_acao_imediato, casos_similares, modelo_ia, modelo_embedding, entidade_id"
    )
    .eq("projeto_id", projetoId)
    .eq("predicao_id", predicaoId)
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Falha ao consultar cache de diagnóstico: ${error.message}`);
  if (!data) return null;

  const casosSimilares = Array.isArray(data.casos_similares)
    ? (data.casos_similares as Array<Record<string, unknown>>).map(
        (c): CasoSimilar => ({
          id: String(c.caso_id ?? ""),
          entidade_id: String(c.entidade_id ?? ""),
          nome_exibicao: null,
          contexto_texto: "",
          acao_realizada: "",
          desfecho: c.desfecho === "recuperado" ? "recuperado" : "cancelado",
          similaridade: Number(c.similaridade ?? 0),
          criado_em: "",
        })
      )
    : [];

  // `contexto` é preenchido pelo chamador com o já calculado acima — o cache
  // existe para poupar a chamada ao LLM, não a leitura do motor matemático.
  return {
    diagnostico_id: data.id,
    contexto: undefined as unknown as ContextoAtual,
    casos_similares: casosSimilares,
    diagnostico: {
      diagnostico_principal: data.diagnostico_principal,
      analise_lookalike: data.analise_lookalike,
      plano_acao_imediato: Array.isArray(data.plano_acao_imediato)
        ? (data.plano_acao_imediato as string[])
        : [],
    },
    modelo_ia: data.modelo_ia,
    modelo_embedding: data.modelo_embedding,
    origem: "cache",
  };
}

/**
 * Diagnóstico sem LLM: traduz os sinais já calculados pelo motor matemático
 * (docs/motor-matematico.md) em texto direto. Menos rico que a análise por IA,
 * mas 100% determinístico e disponível mesmo com o LLM fora do ar.
 */
export function gerarDiagnosticoFallback(
  contexto: ContextoAtual,
  casosSimilares: CasoSimilar[]
): Diagnostico {
  const acionados = [...contexto.sinais]
    .filter((s) => s.acionado === true)
    .sort((a, b) => b.pontos - a.pontos);

  const principal = acionados[0];
  const diagnosticoPrincipal = principal
    ? `Principal ofensor: ${principal.metrica} (peso ${principal.peso}, ${principal.pontos.toFixed(1)} pontos de contribuição). ` +
      `Score de risco atual: ${contexto.pontuacao.toFixed(1)}/100 (faixa ${contexto.faixa_risco ?? "indefinida"}). ` +
      `Diagnóstico gerado por regras do motor de risco (IA indisponível no momento).`
    : `Nenhum sinal de risco individual foi acionado, mas o score combinado é ${contexto.pontuacao.toFixed(1)}/100 (faixa ${contexto.faixa_risco ?? "indefinida"}). ` +
      `Diagnóstico gerado por regras do motor de risco (IA indisponível no momento).`;

  const analiseLookalike = casosSimilares.length
    ? `${casosSimilares.length} caso(s) histórico(s) com perfil parecido foram encontrados na base ` +
      `(similaridade máxima ${(Math.max(...casosSimilares.map((c) => c.similaridade)) * 100).toFixed(0)}%), ` +
      `mas a leitura comparativa detalhada exige o analista de IA, que está indisponível no momento.`
    : "Nenhum caso histórico similar foi encontrado na base vetorial.";

  const plano = acionados.slice(0, 5).map((s) => {
    const obs = s.valor_observado ?? {};
    if (obs.omissao === true) {
      return `Verificar com o cliente por que "${s.metrica}" deixou de ser reportado e reativar o acompanhamento.`;
    }
    return `Investigar e agir sobre "${s.metrica}", sinal com maior contribuição de risco (${s.pontos.toFixed(1)} pontos).`;
  });

  return {
    diagnostico_principal: diagnosticoPrincipal,
    analise_lookalike: analiseLookalike,
    plano_acao_imediato: plano.length
      ? plano
      : ["Revisar manualmente a conta: nenhum sinal individual foi acionado pelo motor."],
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
