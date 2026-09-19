import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CODIGO_METRICA_RECEITA_MENSAL,
  PADRAO_CLIP_Z,
  PADRAO_JANELA_MEDIA_MOVEL_DIAS,
  PADRAO_PONTUACAO_OMISSAO,
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
    return { tipo: "zscore_carteira", direcao, pontuacao_omissao: pontuacaoOmissao, clip_z: clipZ };
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

/** Busca, por métrica, a última observação (respeitando `disponivel_em` — sem look-ahead) de cada entidade até `referenciaEm`. */
async function buscarValorMaisRecentePorEntidade(
  supabase: SupabaseClient,
  projetoId: string,
  metricaId: string,
  referenciaEmIso: string
): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from("observacoes")
    .select("entidade_id, valor_numero, observado_em")
    .eq("projeto_id", projetoId)
    .eq("metrica_id", metricaId)
    .not("valor_numero", "is", null)
    .lte("observado_em", referenciaEmIso)
    .lte("disponivel_em", referenciaEmIso)
    .order("entidade_id", { ascending: true })
    .order("observado_em", { ascending: false });

  if (error) throw new Error(`Falha ao buscar observações da métrica ${metricaId}: ${error.message}`);

  const resultado = new Map<string, number>();
  for (const linha of data ?? []) {
    if (!resultado.has(linha.entidade_id)) {
      resultado.set(linha.entidade_id, Number(linha.valor_numero));
    }
  }
  return resultado;
}

/** Busca o histórico completo (ordenado) de cada entidade para uma métrica, até `referenciaEm`. */
async function buscarHistoricoPorEntidade(
  supabase: SupabaseClient,
  projetoId: string,
  metricaId: string,
  referenciaEmIso: string
): Promise<Map<string, ObservacaoNumerica[]>> {
  const { data, error } = await supabase
    .from("observacoes")
    .select("entidade_id, valor_numero, observado_em")
    .eq("projeto_id", projetoId)
    .eq("metrica_id", metricaId)
    .not("valor_numero", "is", null)
    .lte("observado_em", referenciaEmIso)
    .lte("disponivel_em", referenciaEmIso)
    .order("observado_em", { ascending: true });

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
}

/**
 * Orquestra o motor matemático completo (Tasks 3.1-3.3) para todas as
 * entidades de um projeto, sob um modelo e data de referência, e persiste o
 * resultado em `predicoes`/`motivos_predicao`.
 */
export async function calcularPredicoesProjeto(params: {
  supabase: SupabaseClient;
  projetoId: string;
  modeloId: string;
  referenciaEm: Date;
}): Promise<CalcularPredicoesResultado> {
  const { supabase, projetoId, modeloId, referenciaEm } = params;
  const referenciaEmIso = referenciaEm.toISOString();
  const avisos: string[] = [];

  const { data: entidades, error: erroEntidades } = await supabase
    .from("entidades")
    .select("id")
    .eq("projeto_id", projetoId);
  if (erroEntidades) throw new Error(`Falha ao buscar entidades: ${erroEntidades.message}`);
  if (!entidades || entidades.length === 0) {
    return { predicoes: [], avisos: ["Nenhuma entidade cadastrada no projeto."] };
  }
  const entidadeIds = entidades.map((e) => e.id as string);

  const { data: regrasBrutas, error: erroRegras } = await supabase
    .from("regras_modelo")
    .select("id, metrica_id, codigo_sinal, config_regra, peso")
    .eq("projeto_id", projetoId)
    .eq("modelo_id", modeloId);
  if (erroRegras) throw new Error(`Falha ao buscar regras do modelo: ${erroRegras.message}`);
  if (!regrasBrutas || regrasBrutas.length === 0) {
    return { predicoes: [], avisos: ["Modelo não possui regras cadastradas em regras_modelo."] };
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
    return { predicoes: [], avisos };
  }

  // Pré-carrega, por métrica, os dados necessários (carteira e/ou histórico) antes de iterar por entidade.
  const valoresCarteiraPorMetrica = new Map<string, Map<string, number>>();
  const historicoPorMetrica = new Map<string, Map<string, ObservacaoNumerica[]>>();

  for (const regra of regras) {
    if (regra.config_regra.tipo === "zscore_carteira" && !valoresCarteiraPorMetrica.has(regra.metrica_id)) {
      valoresCarteiraPorMetrica.set(
        regra.metrica_id,
        await buscarValorMaisRecentePorEntidade(supabase, projetoId, regra.metrica_id, referenciaEmIso)
      );
    }
    if (regra.config_regra.tipo === "media_movel" && !historicoPorMetrica.has(regra.metrica_id)) {
      historicoPorMetrica.set(
        regra.metrica_id,
        await buscarHistoricoPorEntidade(supabase, projetoId, regra.metrica_id, referenciaEmIso)
      );
    }
  }

  // Z-score de carteira é o mesmo para todas as entidades de uma métrica — calcula uma vez por métrica.
  const zscorePorMetrica = new Map<string, Map<string, number>>();
  for (const [metricaId, valores] of valoresCarteiraPorMetrica) {
    const regraDaMetrica = regras.find(
      (r) => r.metrica_id === metricaId && r.config_regra.tipo === "zscore_carteira"
    )!;
    const config = regraDaMetrica.config_regra as Extract<ConfigRegra, { tipo: "zscore_carteira" }>;
    zscorePorMetrica.set(
      metricaId,
      calcularZScoreCarteira(valores, config.direcao, config.clip_z ?? PADRAO_CLIP_Z)
    );
  }

  // Receita mensal (Task 3.3) — métrica reservada, se definida no projeto.
  const { data: metricaReceita } = await supabase
    .from("definicoes_metricas")
    .select("id")
    .eq("projeto_id", projetoId)
    .eq("codigo", CODIGO_METRICA_RECEITA_MENSAL)
    .maybeSingle();

  let receitaPorEntidade = new Map<string, number>();
  if (metricaReceita) {
    receitaPorEntidade = await buscarValorMaisRecentePorEntidade(
      supabase,
      projetoId,
      metricaReceita.id,
      referenciaEmIso
    );
  } else {
    avisos.push(
      `Métrica reservada "${CODIGO_METRICA_RECEITA_MENSAL}" não está definida no projeto — Score de Urgência (Task 3.3) não poderá ser calculado.`
    );
  }

  const resultados: ResultadoPredicaoEntidade[] = [];

  for (const entidadeId of entidadeIds) {
    const motivos: ResultadoRegraEntidade[] = [];

    for (const regra of regras) {
      const pontuacaoOmissao = regra.config_regra.pontuacao_omissao ?? PADRAO_PONTUACAO_OMISSAO;

      if (regra.config_regra.tipo === "zscore_carteira") {
        const valores = valoresCarteiraPorMetrica.get(regra.metrica_id)!;
        const valorEntidade = valores.get(entidadeId);

        if (valorEntidade === undefined) {
          // Omissão: entidade sem observação para esta métrica (docs/motor-matematico.md §1).
          motivos.push({
            regra_modelo_id: regra.id,
            peso: regra.peso,
            acionado: true,
            valor_observado: { omissao: true },
            valor_normalizado: pontuacaoOmissao,
            pontos: regra.peso * pontuacaoOmissao,
          });
          continue;
        }

        const normalizadoPorEntidade = zscorePorMetrica.get(regra.metrica_id)!;
        const normalizado = normalizadoPorEntidade.get(entidadeId);
        if (normalizado === undefined) {
          // Carteira com menos de 2 valores conhecidos: comparação estatística impossível.
          motivos.push({
            regra_modelo_id: regra.id,
            peso: regra.peso,
            acionado: null,
            valor_observado: { valor: valorEntidade },
            valor_normalizado: null,
            pontos: 0,
          });
          continue;
        }

        motivos.push({
          regra_modelo_id: regra.id,
          peso: regra.peso,
          acionado: normalizado > 0,
          valor_observado: { valor: valorEntidade },
          valor_normalizado: normalizado,
          pontos: regra.peso * normalizado,
        });
        continue;
      }

      // media_movel
      const historicoPorEntidade = historicoPorMetrica.get(regra.metrica_id)!;
      const historicoEntidade = historicoPorEntidade.get(entidadeId) ?? [];

      if (historicoEntidade.length === 0) {
        // Omissão: nenhuma observação registrada para esta métrica nesta entidade.
        motivos.push({
          regra_modelo_id: regra.id,
          peso: regra.peso,
          acionado: true,
          valor_observado: { omissao: true },
          valor_normalizado: pontuacaoOmissao,
          pontos: regra.peso * pontuacaoOmissao,
        });
        continue;
      }

      const normalizado = calcularMediaMovel(
        historicoEntidade,
        referenciaEm,
        regra.config_regra.janela_dias,
        regra.config_regra.direcao,
        regra.config_regra.clip_z ?? PADRAO_CLIP_Z
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
        acionado: normalizado > 0,
        valor_observado: { ultimo_valor: historicoEntidade[historicoEntidade.length - 1].valor_numero },
        valor_normalizado: normalizado,
        pontos: regra.peso * normalizado,
      });
    }

    resultados.push(
      calcularPredicaoEntidade({
        entidadeId,
        motivos,
        valorImpacto: receitaPorEntidade.get(entidadeId) ?? null,
      })
    );
  }

  await persistirResultados(supabase, { projetoId, modeloId, referenciaEmIso, resultados });

  return { predicoes: resultados, avisos };
}

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

  for (const resultado of resultados) {
    const { data: existente, error: erroExistente } = await supabase
      .from("predicoes")
      .select("id")
      .eq("entidade_id", resultado.entidade_id)
      .eq("modelo_id", modeloId)
      .eq("referencia_em", referenciaEmIso)
      .maybeSingle();
    if (erroExistente) throw new Error(`Falha ao verificar predição existente: ${erroExistente.message}`);

    const predicaoId = existente?.id ?? randomUUID();

    const { error: erroUpsert } = await supabase.from("predicoes").upsert({
      id: predicaoId,
      projeto_id: projetoId,
      entidade_id: resultado.entidade_id,
      modelo_id: modeloId,
      referencia_em: referenciaEmIso,
      pontuacao: resultado.pontuacao,
      faixa_risco: resultado.faixa_risco,
      cobertura: resultado.cobertura,
      valor_impacto: resultado.valor_impacto,
    });
    if (erroUpsert) throw new Error(`Falha ao gravar predição: ${erroUpsert.message}`);

    const { error: erroDelete } = await supabase
      .from("motivos_predicao")
      .delete()
      .eq("predicao_id", predicaoId);
    if (erroDelete) throw new Error(`Falha ao limpar motivos da predição: ${erroDelete.message}`);

    if (resultado.motivos.length > 0) {
      const { error: erroInsert } = await supabase.from("motivos_predicao").insert(
        resultado.motivos.map((m) => ({
          predicao_id: predicaoId,
          regra_modelo_id: m.regra_modelo_id,
          acionado: m.acionado,
          valor_observado: m.valor_observado,
          pontos: m.pontos,
        }))
      );
      if (erroInsert) throw new Error(`Falha ao gravar motivos da predição: ${erroInsert.message}`);
    }
  }
}
