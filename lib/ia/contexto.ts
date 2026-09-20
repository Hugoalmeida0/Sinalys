import type { SupabaseClient } from "@supabase/supabase-js";
import type { FaixaRisco } from "@/lib/mock-data";
import { calcularScoreUrgencia } from "@/lib/motor/urgencia";
import { obterProjetoInfoCache } from "@/lib/painel/cache-estatico";
import type { ContextoAtual, SinalRisco } from "./tipos";

/** Lançado quando a entidade ainda não passou pelo motor matemático. */
export class SemPredicaoError extends Error {}

/** Lançado quando o identificador enviado não corresponde a nenhuma entidade do projeto. */
export class EntidadeNaoEncontradaError extends Error {}

/**
 * Resolve a entidade por UUID interno ou pelo `id_externo` da planilha de
 * origem (o "C001" dos exemplos de docs/instructions.md). Aceitar os dois evita
 * que o painel precise conhecer os UUIDs do banco.
 */
export async function resolverEntidade(
  supabase: SupabaseClient,
  projetoId: string,
  identificador: string
): Promise<{ id: string; id_externo: string; nome_exibicao: string | null } | null> {
  const ehUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identificador);

  const consulta = supabase
    .from("entidades")
    .select("id, id_externo, nome_exibicao")
    .eq("projeto_id", projetoId);

  const { data, error } = await (ehUuid
    ? consulta.eq("id", identificador)
    : consulta.eq("id_externo", identificador)
  ).maybeSingle();

  if (error) throw new Error(`Falha ao resolver entidade: ${error.message}`);
  return data ?? null;
}

/**
 * Monta o Contexto Atual (raio-x) a partir da última predição persistida da
 * entidade, incluindo os motivos traduzidos para o rótulo de negócio da métrica.
 *
 * Não recalcula o motor: o z-score de carteira depende de toda a carteira, então
 * recalcular uma entidade isolada seria caro e inconsistente. Se não existe
 * predição, lança `SemPredicaoError` para a rota responder 422.
 */
export async function montarContextoAtual(params: {
  supabase: SupabaseClient;
  projetoId: string;
  entidade: { id: string; id_externo: string; nome_exibicao: string | null };
  modeloId?: string;
}): Promise<ContextoAtual> {
  const { supabase, projetoId, entidade, modeloId } = params;

  let consultaPredicao = supabase
    .from("predicoes")
    .select("id, modelo_id, referencia_em, pontuacao, faixa_risco, cobertura, valor_impacto")
    .eq("projeto_id", projetoId)
    .eq("entidade_id", entidade.id);

  if (modeloId) consultaPredicao = consultaPredicao.eq("modelo_id", modeloId);

  const { data: predicao, error: erroPredicao } = await consultaPredicao
    .order("referencia_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (erroPredicao) throw new Error(`Falha ao buscar predição: ${erroPredicao.message}`);
  if (!predicao) {
    throw new SemPredicaoError(
      `Entidade "${entidade.id_externo}" não possui predição calculada. ` +
        "Rode POST /api/motor/calcular antes de solicitar o diagnóstico."
    );
  }

  // `projeto` vem do cache de 12h (config de tenant, muda raríssimo — ver
  // lib/painel/cache-estatico.ts); `motivos` depende só de `predicao`, já
  // resolvida acima — rodar as duas em paralelo poupa um round-trip.
  const [projeto, { data: motivos, error: erroMotivos }] = await Promise.all([
    obterProjetoInfoCache(projetoId),
    supabase
      .from("motivos_predicao")
      .select(
        "acionado, valor_observado, pontos, regras_modelo(codigo_sinal, peso, definicoes_metricas(rotulo, unidade))"
      )
      .eq("predicao_id", predicao.id),
  ]);

  if (erroMotivos) throw new Error(`Falha ao buscar motivos da predição: ${erroMotivos.message}`);

  const sinais: SinalRisco[] = (motivos ?? []).map((m) => {
    // O PostgREST devolve o relacionamento como objeto ou array conforme a cardinalidade inferida.
    const regra = normalizarRelacao(m.regras_modelo);
    const metrica = normalizarRelacao(regra?.definicoes_metricas);
    return {
      codigo_sinal: regra?.codigo_sinal ?? "desconhecido",
      metrica: metrica?.rotulo ?? "Métrica desconhecida",
      unidade: metrica?.unidade ?? null,
      acionado: m.acionado,
      valor_observado: m.valor_observado as Record<string, unknown> | null,
      peso: Number(regra?.peso ?? 0),
      pontos: Number(m.pontos),
    };
  });

  // Sinais mais pesados primeiro: é a ordem em que o prompt deve apresentá-los.
  sinais.sort((a, b) => b.pontos - a.pontos);

  const pontuacao = Number(predicao.pontuacao);
  const valorImpacto = predicao.valor_impacto == null ? null : Number(predicao.valor_impacto);

  return {
    entidade_id: entidade.id,
    id_externo: entidade.id_externo,
    nome_exibicao: entidade.nome_exibicao,
    rotulo_entidade: projeto?.rotulo_entidade ?? "Entidade",
    predicao_id: predicao.id,
    referencia_em: predicao.referencia_em,
    pontuacao,
    faixa_risco: (predicao.faixa_risco as FaixaRisco | null) ?? null,
    cobertura: predicao.cobertura == null ? null : Number(predicao.cobertura),
    valor_impacto: valorImpacto,
    score_urgencia: calcularScoreUrgencia(pontuacao, valorImpacto),
    sinais,
  };
}

function normalizarRelacao<T>(relacao: T | T[] | null | undefined): T | null {
  if (relacao == null) return null;
  return Array.isArray(relacao) ? (relacao[0] ?? null) : relacao;
}
