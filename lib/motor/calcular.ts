import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buscarTodasLinhas } from "@/lib/supabase/paginar";
import {
  CODIGO_METRICA_RECEITA_MENSAL,
  LIMIAR_Z_ACIONADO,
  OMISSAO_SEM_PONTUACAO,
  PADRAO_CLIP_Z,
  PADRAO_JANELA_MEDIA_MOVEL_DIAS,
  PADRAO_JANELA_OBSERVACOES,
} from "./constantes";
import { calcularMediaMovel, calcularZScoreCarteira } from "./normalizacao";
import { calcularPredicaoEntidade } from "./score";
import type {
  ConfigRegra,
  ObservacaoNumerica,
  RegraModeloRegistro,
  ResultadoPredicaoEntidade,
  ResultadoRegraEntidade,
} from "./tipos";

function parseConfigRegra(raw: unknown): ConfigRegra | null {
  if (!raw || typeof raw !== "object") return null;
  const config = raw as Record<string, unknown>;
  const direcao = config.direcao;
  if (direcao !== "maior_pior" && direcao !== "menor_pior") return null;

  const pontuacaoOmissao =
    typeof config.pontuacao_omissao === "number" ? config.pontuacao_omissao : undefined;
  const clipZ = typeof config.clip_z === "number" ? config.clip_z : undefined;

  if (config.tipo === "zscore_carteira") {
    const janelaObservacoes =
      typeof config.janela_observacoes === "number" && config.janela_observacoes >= 1
        ? Math.floor(config.janela_observacoes)
        : PADRAO_JANELA_OBSERVACOES;
    return {
      tipo: "zscore_carteira",
      direcao,
      janela_observacoes: janelaObservacoes,
      pontuacao_omissao: pontuacaoOmissao,
      clip_z: clipZ,
    };
  }
  if (config.tipo === "media_movel") {
    const janelaDias =
      typeof config.janela_dias === "number" && config.janela_dias > 0
        ? config.janela_dias
        : PADRAO_JANELA_MEDIA_MOVEL_DIAS;
    return {
      tipo: "media_movel",
      direcao,
      janela_dias: janelaDias,
      pontuacao_omissao: pontuacaoOmissao,
      clip_z: clipZ,
    };
  }
  return null;
}

/** Valor recente de uma entidade para uma métrica: média das últimas N observações, mais a última isolada e quantas entraram. */
export interface ValorRecente {
  valor: number;
  ultimo_valor: number;
  observacoes: number;
}

/**
 * Busca, por métrica, as `janelaObservacoes` observações mais recentes
 * (respeitando `disponivel_em` — sem look-ahead) de cada entidade até
 * `referenciaEm` e devolve a média delas. Com janela 1 é só a última
 * observação; com 3 (padrão) um período isolado — um percentual sobre 1
 * chamado, um atraso de um mês — deixa de saturar o sinal sozinho.
 */
async function buscarValorRecentePorEntidade(
  supabase: SupabaseClient,
  projetoId: string,
  metricaId: string,
  referenciaEmIso: string,
  janelaObservacoes: number
): Promise<Map<string, ValorRecente>> {
  const { data, error } = await buscarTodasLinhas(() =>
    supabase
      .from("observacoes")
      .select("entidade_id, valor_numero, observado_em")
      .eq("projeto_id", projetoId)
      .eq("metrica_id", metricaId)
      .not("valor_numero", "is", null)
      .lte("observado_em", referenciaEmIso)
      .lte("disponivel_em", referenciaEmIso)
      .order("entidade_id", { ascending: true })
      .order("observado_em", { ascending: false })
  );

  if (error) throw new Error(`Falha ao buscar observações da métrica ${metricaId}: ${error.message}`);

  const acumulado = new Map<string, number[]>();
  for (const linha of data ?? []) {
    const lista = acumulado.get(linha.entidade_id) ?? [];
    if (lista.length < janelaObservacoes) lista.push(Number(linha.valor_numero));
    acumulado.set(linha.entidade_id, lista);
  }

  const resultado = new Map<string, ValorRecente>();
  for (const [entidadeId, valores] of acumulado) {
    resultado.set(entidadeId, {
      valor: valores.reduce((soma, v) => soma + v, 0) / valores.length,
      ultimo_valor: valores[0],
      observacoes: valores.length,
    });
  }
  return resultado;
}

/**
 * Task A.1 — referência padrão do motor: a data da observação mais recente
 * do projeto, não "agora". Com dados mensais que terminam em junho e o
 * relógio em setembro, "agora" deixa a janela recente da média móvel vazia e
 * mata toda regra `media_movel` (cobertura cai pela metade sem aviso).
 */
export async function resolverReferenciaPadrao(
  supabase: SupabaseClient,
  projetoId: string
): Promise<Date | null> {
  const { data, error } = await supabase
    .from("observacoes")
    .select("observado_em")
    .eq("projeto_id", projetoId)
    .order("observado_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Falha ao buscar última observação: ${error.message}`);
  return data ? new Date(data.observado_em) : null;
}

/** Task A.4 — uma predição por entidade por dia: a chave de dedup é o dia (UTC), não o instante. */
function truncarAoDia(data: Date): Date {
  return new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate()));
}

function fimDoDia(dia: Date): Date {
  return new Date(dia.getTime() + 86_400_000 - 1);
}

/** Busca o histórico completo (ordenado) de cada entidade para uma métrica, até `referenciaEm`. */
async function buscarHistoricoPorEntidade(
  supabase: SupabaseClient,
  projetoId: string,
  metricaId: string,
  referenciaEmIso: string
): Promise<Map<string, ObservacaoNumerica[]>> {
  const { data, error } = await buscarTodasLinhas(() =>
    supabase
      .from("observacoes")
      .select("entidade_id, valor_numero, observado_em")
      .eq("projeto_id", projetoId)
      .eq("metrica_id", metricaId)
      .not("valor_numero", "is", null)
      .lte("observado_em", referenciaEmIso)
      .lte("disponivel_em", referenciaEmIso)
      .order("entidade_id", { ascending: true })
      .order("observado_em", { ascending: true })
  );

  if (error) throw new Error(`Falha ao buscar histórico da métrica ${metricaId}: ${error.message}`);

  const resultado = new Map<string, ObservacaoNumerica[]>();
  for (const linha of data ?? []) {
    const lista = resultado.get(linha.entidade_id) ?? [];
    lista.push({
      entidade_id: linha.entidade_id,
      observado_em: linha.observado_em,
      valor_numero: Number(linha.valor_numero),
    });
    resultado.set(linha.entidade_id, lista);
  }
  return resultado;
}

export interface CalcularPredicoesResultado {
  predicoes: ResultadoPredicaoEntidade[];
  avisos: string[];
  /** Dia de referência efetivamente usado (truncado ao dia, UTC). */
  referenciaEm: Date;
}

/**
 * Orquestra o motor matemático completo (Tasks 3.1-3.3) para todas as
 * entidades de um projeto, sob um modelo e data de referência, e persiste o
 * resultado em `predicoes`/`motivos_predicao`.
 *
 * `referenciaEm` ausente = última observação do projeto (Task A.1). A
 * referência é sempre truncada ao dia: as observações consideradas vão até o
 * fim desse dia e a predição gravada é única por (entidade, dia) — rodar
 * duas vezes no mesmo dia atualiza em vez de duplicar (Task A.4).
 *
 * `somenteEntidades` restringe quais entidades têm predição calculada e
 * gravada; a estatística de carteira (z-score) continua sobre o projeto
 * inteiro, então o resultado é o mesmo que uma rodada completa teria dado.
 */
export async function calcularPredicoesProjeto(params: {
  supabase: SupabaseClient;
  projetoId: string;
  modeloId: string;
  referenciaEm?: Date | null;
  somenteEntidades?: string[];
}): Promise<CalcularPredicoesResultado> {
  const { supabase, projetoId, modeloId } = params;
  const avisos: string[] = [];

  const referenciaBase = params.referenciaEm ?? (await resolverReferenciaPadrao(supabase, projetoId));
  if (!referenciaBase) {
    return {
      predicoes: [],
      avisos: ["Projeto sem observações: não há data de referência para calcular."],
      referenciaEm: truncarAoDia(new Date()),
    };
  }
  const referenciaEm = truncarAoDia(referenciaBase);
  const referenciaEmIso = fimDoDia(referenciaEm).toISOString();

  const { data: entidades, error: erroEntidades } = await supabase
    .from("entidades")
    .select("id")
    .eq("projeto_id", projetoId);
  if (erroEntidades) throw new Error(`Falha ao buscar entidades: ${erroEntidades.message}`);
  if (!entidades || entidades.length === 0) {
    return { predicoes: [], avisos: ["Nenhuma entidade cadastrada no projeto."], referenciaEm };
  }
  const restricao = params.somenteEntidades ? new Set(params.somenteEntidades) : null;
  const entidadeIds = entidades
    .map((e) => e.id as string)
    .filter((id) => !restricao || restricao.has(id));

  const { data: regrasBrutas, error: erroRegras } = await supabase
    .from("regras_modelo")
    .select("id, metrica_id, codigo_sinal, config_regra, peso")
    .eq("projeto_id", projetoId)
    .eq("modelo_id", modeloId);
  if (erroRegras) throw new Error(`Falha ao buscar regras do modelo: ${erroRegras.message}`);
  if (!regrasBrutas || regrasBrutas.length === 0) {
    return { predicoes: [], avisos: ["Modelo não possui regras cadastradas em regras_modelo."], referenciaEm };
  }

  const regras: RegraModeloRegistro[] = [];
  for (const bruta of regrasBrutas) {
    const config = parseConfigRegra(bruta.config_regra);
    if (!config) {
      avisos.push(
        `Regra "${bruta.codigo_sinal}" (${bruta.id}) tem config_regra inválido/incompleto — ignorada.`
      );
      continue;
    }
    regras.push({
      id: bruta.id,
      metrica_id: bruta.metrica_id,
      codigo_sinal: bruta.codigo_sinal,
      config_regra: config,
      peso: Number(bruta.peso),
    });
  }
  if (regras.length === 0) {
    return { predicoes: [], avisos, referenciaEm };
  }

  // Pré-carrega, por (métrica, janela), os dados necessários (carteira e/ou histórico) antes de iterar por entidade.
  const valoresCarteiraPorChave = new Map<string, Map<string, ValorRecente>>();
  const historicoPorMetrica = new Map<string, Map<string, ObservacaoNumerica[]>>();
  const chaveCarteira = (regra: RegraModeloRegistro) =>
    `${regra.metrica_id}:${regra.config_regra.tipo === "zscore_carteira" ? regra.config_regra.janela_observacoes : 1}`;

  for (const regra of regras) {
    if (regra.config_regra.tipo === "zscore_carteira" && !valoresCarteiraPorChave.has(chaveCarteira(regra))) {
      valoresCarteiraPorChave.set(
        chaveCarteira(regra),
        await buscarValorRecentePorEntidade(
          supabase,
          projetoId,
          regra.metrica_id,
          referenciaEmIso,
          regra.config_regra.janela_observacoes ?? PADRAO_JANELA_OBSERVACOES
        )
      );
    }
    if (regra.config_regra.tipo === "media_movel" && !historicoPorMetrica.has(regra.metrica_id)) {
      historicoPorMetrica.set(
        regra.metrica_id,
        await buscarHistoricoPorEntidade(supabase, projetoId, regra.metrica_id, referenciaEmIso)
      );
    }
  }

  // Z-score de carteira é o mesmo para todas as entidades de uma regra — calcula uma vez por regra.
  const zscorePorRegra = new Map<string, Map<string, number>>();
  for (const regra of regras) {
    if (regra.config_regra.tipo !== "zscore_carteira") continue;
    const valores = valoresCarteiraPorChave.get(chaveCarteira(regra))!;
    const medias = new Map<string, number>();
    for (const [entidadeId, v] of valores) medias.set(entidadeId, v.valor);
    zscorePorRegra.set(
      regra.id,
      calcularZScoreCarteira(medias, regra.config_regra.direcao, regra.config_regra.clip_z ?? PADRAO_CLIP_Z)
    );
  }

  // Receita mensal (Task 3.3) — métrica reservada, se definida no projeto. Só a última observação.
  const { data: metricaReceita } = await supabase
    .from("definicoes_metricas")
    .select("id")
    .eq("projeto_id", projetoId)
    .eq("codigo", CODIGO_METRICA_RECEITA_MENSAL)
    .maybeSingle();

  let receitaPorEntidade = new Map<string, ValorRecente>();
  if (metricaReceita) {
    receitaPorEntidade = await buscarValorRecentePorEntidade(
      supabase,
      projetoId,
      metricaReceita.id,
      referenciaEmIso,
      1
    );
  } else {
    avisos.push(
      `Métrica reservada "${CODIGO_METRICA_RECEITA_MENSAL}" não está definida no projeto — o impacto financeiro (Score de Prioridade) usará o porte da entidade como aproximação.`
    );
  }

  /** Task D.2 — "acionado" exige um desvio real, não qualquer valor acima da média. */
  const limiarAcionado = (clipZ: number) => Math.min(100, (LIMIAR_Z_ACIONADO / clipZ) * 100);

  /** Task A.5 — omissão só pontua quando a regra diz quanto; do contrário é "não avaliável". */
  const motivoOmissao = (regra: RegraModeloRegistro): ResultadoRegraEntidade => {
    const pontuacaoOmissao = regra.config_regra.pontuacao_omissao ?? OMISSAO_SEM_PONTUACAO;
    if (pontuacaoOmissao == null) {
      return {
        regra_modelo_id: regra.id,
        peso: regra.peso,
        acionado: null,
        valor_observado: { omissao: true },
        valor_normalizado: null,
        pontos: 0,
      };
    }
    return {
      regra_modelo_id: regra.id,
      peso: regra.peso,
      acionado: pontuacaoOmissao >= limiarAcionado(regra.config_regra.clip_z ?? PADRAO_CLIP_Z),
      valor_observado: { omissao: true },
      valor_normalizado: pontuacaoOmissao,
      pontos: regra.peso * pontuacaoOmissao,
    };
  };

  const resultados: ResultadoPredicaoEntidade[] = [];

  for (const entidadeId of entidadeIds) {
    const motivos: ResultadoRegraEntidade[] = [];

    for (const regra of regras) {
      const clipZ = regra.config_regra.clip_z ?? PADRAO_CLIP_Z;

      if (regra.config_regra.tipo === "zscore_carteira") {
        const valores = valoresCarteiraPorChave.get(chaveCarteira(regra))!;
        const recente = valores.get(entidadeId);

        if (recente === undefined) {
          motivos.push(motivoOmissao(regra));
          continue;
        }

        const observado = {
          valor: recente.valor,
          ultimo_valor: recente.ultimo_valor,
          observacoes: recente.observacoes,
        };
        const normalizado = zscorePorRegra.get(regra.id)!.get(entidadeId);
        if (normalizado === undefined) {
          // Carteira com menos de 2 valores conhecidos: comparação estatística impossível.
          motivos.push({
            regra_modelo_id: regra.id,
            peso: regra.peso,
            acionado: null,
            valor_observado: observado,
            valor_normalizado: null,
            pontos: 0,
          });
          continue;
        }

        motivos.push({
          regra_modelo_id: regra.id,
          peso: regra.peso,
          acionado: normalizado >= limiarAcionado(clipZ),
          valor_observado: observado,
          valor_normalizado: normalizado,
          pontos: regra.peso * normalizado,
        });
        continue;
      }

      // media_movel
      const historicoPorEntidade = historicoPorMetrica.get(regra.metrica_id)!;
      const historicoEntidade = historicoPorEntidade.get(entidadeId) ?? [];

      if (historicoEntidade.length === 0) {
        motivos.push(motivoOmissao(regra));
        continue;
      }

      const normalizado = calcularMediaMovel(
        historicoEntidade,
        fimDoDia(referenciaEm),
        regra.config_regra.janela_dias,
        regra.config_regra.direcao,
        clipZ
      );

      if (normalizado === null) {
        motivos.push({
          regra_modelo_id: regra.id,
          peso: regra.peso,
          acionado: null,
          valor_observado: { observacoes: historicoEntidade.length },
          valor_normalizado: null,
          pontos: 0,
        });
        continue;
      }

      motivos.push({
        regra_modelo_id: regra.id,
        peso: regra.peso,
        acionado: normalizado >= limiarAcionado(clipZ),
        valor_observado: { ultimo_valor: historicoEntidade[historicoEntidade.length - 1].valor_numero },
        valor_normalizado: normalizado,
        pontos: regra.peso * normalizado,
      });
    }

    resultados.push(
      calcularPredicaoEntidade({
        entidadeId,
        motivos,
        valorImpacto: receitaPorEntidade.get(entidadeId)?.ultimo_valor ?? null,
      })
    );
  }

  await persistirResultados(supabase, {
    projetoId,
    modeloId,
    referenciaEmIso: referenciaEm.toISOString(),
    resultados,
  });

  return { predicoes: resultados, avisos, referenciaEm };
}

/** Tamanho de lote para inserts/upserts em massa (mesmo padrão de `lib/ingestao/normalizar.ts`). */
const TAMANHO_LOTE_PERSISTENCIA = 500;

function emLotes<T>(itens: T[], tamanho: number): T[][] {
  const lotes: T[][] = [];
  for (let i = 0; i < itens.length; i += tamanho) lotes.push(itens.slice(i, i + tamanho));
  return lotes;
}

/**
 * Grava `predicoes`/`motivos_predicao` em lote, não por entidade.
 *
 * Antes fazia 4 round-trips sequenciais *por entidade* (SELECT + UPSERT +
 * DELETE + INSERT) — para os ~80 clientes reais do projeto seed isso são 320
 * chamadas sequenciais, inviável para recalcular a cada login (Módulo 5,
 * Task 5.4/decisão do usuário). Reduzido para 1 SELECT em lote (reaproveita o
 * `id` de predições existentes, preservando a referência de `motivos_predicao`)
 * + upserts/deletes/inserts em lotes de 500.
 */
async function persistirResultados(
  supabase: SupabaseClient,
  params: {
    projetoId: string;
    modeloId: string;
    referenciaEmIso: string;
    resultados: ResultadoPredicaoEntidade[];
  }
): Promise<void> {
  const { projetoId, modeloId, referenciaEmIso, resultados } = params;
  if (resultados.length === 0) return;

  const entidadeIds = resultados.map((r) => r.entidade_id);

  const { data: existentes, error: erroExistentes } = await buscarTodasLinhas<{
    id: string;
    entidade_id: string;
  }>(() =>
    supabase
      .from("predicoes")
      .select("id, entidade_id")
      .eq("modelo_id", modeloId)
      .eq("referencia_em", referenciaEmIso)
      .in("entidade_id", entidadeIds)
  );
  if (erroExistentes) {
    throw new Error(`Falha ao buscar predições existentes: ${erroExistentes.message}`);
  }
  const idExistentePorEntidade = new Map(existentes.map((p) => [p.entidade_id, p.id]));

  // Resolvido aqui (não no upsert) para nunca sobrescrever o id de uma predição
  // já existente — trocar o id órfãaria os `motivos_predicao` já vinculados a ela.
  const predicaoIdPorEntidade = new Map(
    resultados.map((r) => [r.entidade_id, idExistentePorEntidade.get(r.entidade_id) ?? randomUUID()])
  );

  const linhasPredicoes = resultados.map((r) => ({
    id: predicaoIdPorEntidade.get(r.entidade_id)!,
    projeto_id: projetoId,
    entidade_id: r.entidade_id,
    modelo_id: modeloId,
    referencia_em: referenciaEmIso,
    pontuacao: r.pontuacao,
    faixa_risco: r.faixa_risco,
    cobertura: r.cobertura,
    valor_impacto: r.valor_impacto,
  }));

  for (const lote of emLotes(linhasPredicoes, TAMANHO_LOTE_PERSISTENCIA)) {
    const { error } = await supabase.from("predicoes").upsert(lote);
    if (error) throw new Error(`Falha ao gravar predições: ${error.message}`);
  }

  const predicaoIds = Array.from(predicaoIdPorEntidade.values());
  for (const lote of emLotes(predicaoIds, TAMANHO_LOTE_PERSISTENCIA)) {
    const { error } = await supabase.from("motivos_predicao").delete().in("predicao_id", lote);
    if (error) throw new Error(`Falha ao limpar motivos das predições: ${error.message}`);
  }

  const linhasMotivos = resultados.flatMap((r) =>
    r.motivos.map((m) => ({
      predicao_id: predicaoIdPorEntidade.get(r.entidade_id)!,
      regra_modelo_id: m.regra_modelo_id,
      acionado: m.acionado,
      valor_observado: m.valor_observado,
      pontos: m.pontos,
    }))
  );
  for (const lote of emLotes(linhasMotivos, TAMANHO_LOTE_PERSISTENCIA)) {
    const { error } = await supabase.from("motivos_predicao").insert(lote);
    if (error) throw new Error(`Falha ao gravar motivos das predições: ${error.message}`);
  }
}
