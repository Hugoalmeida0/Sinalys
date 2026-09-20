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

  origem: "ia" | "cache" | "fallback";
}

export async function analisarRiscoEntidade(params: {
  supabase: SupabaseClient;
  projetoId: string;

  identificadorEntidade: string;
  modeloId?: string;
  origemGatilho?: "manual" | "cron";
  persistir?: boolean;

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

  const contexto = await montarContextoAtual({ supabase, projetoId, entidade, modeloId });

  if (!forcar) {
    const cache = await buscarDiagnosticoEmCache(supabase, projetoId, contexto.predicao_id);
    if (cache) return { ...cache, contexto };
  }

  const perfilRisco = descreverPerfilRisco(contexto);

  const casosSimilares = await buscarCasosSimilares({
    supabase,
    projetoId,
    perfilRisco,
    entidadeExcluida: entidade.id,
  });

  const modeloEmbedding = obterModeloEmbedding();

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
    console.error(`[ia/analisar] LLM falhou, usando fallback por regras: ${(erroLlm as Error).message}`);
    diagnostico = gerarDiagnosticoFallback(contexto, casosSimilares);
    origem = "fallback";
    modeloUsado = MODELO_IA_FALLBACK;
  }

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

export function normalizarDiagnostico(diagnostico: Diagnostico): Diagnostico {
  const plano = diagnostico.plano_acao_imediato

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
