import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CODIGO_METRICA_RECEITA_MENSAL, PADRAO_JANELA_MEDIA_MOVEL_DIAS } from "./constantes";
import type { DirecaoRisco, TipoRegra } from "./tipos";

/**
 * Task 1 (Módulo 5) — CRUD do modelo de risco (pesos e regras).
 *
 * Escopo deliberadamente contido para o MVP: editar o peso de uma regra
 * existente e adicionar uma regra nova para uma métrica ainda não usada.
 * Sem exclusão de regra — `motivos_predicao.regra_modelo_id` referencia
 * `regras_modelo` sem `ON DELETE CASCADE`, então remover uma regra já usada
 * em alguma predição falha com violação de FK; expor "excluir" sem tratar
 * isso direito confundiria mais do que ajudaria. Sem edição de direção/janela
 * de regras existentes por ora — só peso, que é o pedido explícito do
 * usuário ("definir que atraso tem peso 3").
 */

export class ModeloNaoEncontradoError extends Error {}
export class RegraInvalidaError extends Error {}

interface MetricaRelacao {
  codigo: string;
  rotulo: string;
  unidade: string | null;
}

export interface RegraModeloDetalhada {
  id: string;
  codigo_sinal: string;
  metrica_id: string;
  metrica_codigo: string;
  metrica_rotulo: string;
  metrica_unidade: string | null;
  tipo: TipoRegra;
  direcao: DirecaoRisco;
  /** Só relevante para tipo "media_movel". */
  janela_dias: number | null;
  peso: number;
}

export interface MetricaDisponivel {
  id: string;
  codigo: string;
  rotulo: string;
  unidade: string | null;
}

export interface ModeloDetalhado {
  modelo_id: string;
  versao: number;
  regras: RegraModeloDetalhada[];
  /** Métricas numéricas do projeto ainda sem regra neste modelo — candidatas a nova regra. */
  metricas_disponiveis: MetricaDisponivel[];
}

function normalizarRelacao<T>(relacao: T | T[] | null | undefined): T | null {
  if (relacao == null) return null;
  return Array.isArray(relacao) ? (relacao[0] ?? null) : relacao;
}

/** Carrega o modelo ativo do projeto com suas regras (rotuladas) e as métricas ainda disponíveis para novas regras. */
export async function carregarModeloAtivoDetalhado(
  supabase: SupabaseClient,
  projetoId: string
): Promise<ModeloDetalhado | null> {
  const { data: modelo, error: erroModelo } = await supabase
    .from("modelos")
    .select("id, versao")
    .eq("projeto_id", projetoId)
    .eq("status", "ativo")
    .maybeSingle();
  if (erroModelo) throw new Error(`Falha ao buscar modelo ativo: ${erroModelo.message}`);
  if (!modelo) return null;

  const [{ data: regrasBrutas, error: erroRegras }, { data: metricas, error: erroMetricas }] =
    await Promise.all([
      supabase
        .from("regras_modelo")
        .select(
          "id, codigo_sinal, metrica_id, config_regra, peso, definicoes_metricas(codigo, rotulo, unidade)"
        )
        .eq("modelo_id", modelo.id),
      supabase
        .from("definicoes_metricas")
        .select("id, codigo, rotulo, unidade")
        .eq("projeto_id", projetoId)
        .eq("tipo_valor", "numero")
        // Receita mensal é o impacto financeiro da Matriz de Urgência, não um sinal de risco.
        .neq("codigo", CODIGO_METRICA_RECEITA_MENSAL),
    ]);
  if (erroRegras) throw new Error(`Falha ao buscar regras do modelo: ${erroRegras.message}`);
  if (erroMetricas) throw new Error(`Falha ao buscar métricas do projeto: ${erroMetricas.message}`);

  const metricaIdsUsadas = new Set((regrasBrutas ?? []).map((r) => r.metrica_id as string));

  const regras: RegraModeloDetalhada[] = (regrasBrutas ?? [])
    .map((r) => {
      const metrica = normalizarRelacao(r.definicoes_metricas as MetricaRelacao | MetricaRelacao[] | null);
      const config = (r.config_regra ?? {}) as Record<string, unknown>;
      return {
        id: r.id as string,
        codigo_sinal: r.codigo_sinal as string,
        metrica_id: r.metrica_id as string,
        metrica_codigo: metrica?.codigo ?? "",
        metrica_rotulo: metrica?.rotulo ?? (r.codigo_sinal as string),
        metrica_unidade: metrica?.unidade ?? null,
        tipo: (config.tipo as TipoRegra) ?? "zscore_carteira",
        direcao: (config.direcao as DirecaoRisco) ?? "maior_pior",
        janela_dias: typeof config.janela_dias === "number" ? config.janela_dias : null,
        peso: Number(r.peso),
      };
    })
    .sort((a, b) => b.peso - a.peso);

  const metricasDisponiveis: MetricaDisponivel[] = (metricas ?? [])
    .filter((m) => !metricaIdsUsadas.has(m.id as string))
    .map((m) => ({
      id: m.id as string,
      codigo: m.codigo as string,
      rotulo: m.rotulo as string,
      unidade: (m.unidade as string | null) ?? null,
    }));

  return { modelo_id: modelo.id as string, versao: modelo.versao as number, regras, metricas_disponiveis: metricasDisponiveis };
}

/** Atualiza o peso de uma ou mais regras já existentes no modelo ativo do projeto. */
export async function atualizarPesosRegras(params: {
  supabase: SupabaseClient;
  projetoId: string;
  modeloId: string;
  atualizacoes: { id: string; peso: number }[];
}): Promise<void> {
  const { supabase, projetoId, modeloId, atualizacoes } = params;

  for (const a of atualizacoes) {
    if (!Number.isFinite(a.peso) || a.peso < 0) {
      throw new RegraInvalidaError(`Peso inválido para a regra ${a.id}: deve ser um número maior ou igual a 0.`);
    }
  }

  // Poucas regras por modelo (unidades) — sequencial é aceitável aqui; o
  // tratamento em lote do Módulo 3 é para centenas/milhares de entidades.
  for (const a of atualizacoes) {
    const { data, error } = await supabase
      .from("regras_modelo")
      .update({ peso: a.peso })
      .eq("id", a.id)
      .eq("projeto_id", projetoId)
      .eq("modelo_id", modeloId)
      .select("id");
    if (error) throw new Error(`Falha ao atualizar peso da regra ${a.id}: ${error.message}`);
    if (!data || data.length === 0) {
      throw new RegraInvalidaError(`Regra ${a.id} não encontrada no modelo ativo deste projeto.`);
    }
  }
}

const TIPOS_REGRA_VALIDOS: TipoRegra[] = ["zscore_carteira", "media_movel"];
const DIRECOES_VALIDAS: DirecaoRisco[] = ["maior_pior", "menor_pior"];

/** Cria uma nova regra (sinal de risco) para o modelo ativo, sobre uma métrica ainda não usada nele. */
export async function criarRegraModelo(params: {
  supabase: SupabaseClient;
  projetoId: string;
  modeloId: string;
  metricaId: string;
  tipo: TipoRegra;
  direcao: DirecaoRisco;
  peso: number;
  janelaDias?: number;
}): Promise<string> {
  const { supabase, projetoId, modeloId, metricaId, tipo, direcao, peso, janelaDias } = params;

  if (!TIPOS_REGRA_VALIDOS.includes(tipo)) {
    throw new RegraInvalidaError(`Tipo de regra inválido: "${tipo}".`);
  }
  if (!DIRECOES_VALIDAS.includes(direcao)) {
    throw new RegraInvalidaError(`Direção de risco inválida: "${direcao}".`);
  }
  if (!Number.isFinite(peso) || peso < 0) {
    throw new RegraInvalidaError("Peso deve ser um número maior ou igual a 0.");
  }
  if (tipo === "media_movel" && janelaDias !== undefined && (!Number.isInteger(janelaDias) || janelaDias <= 0)) {
    throw new RegraInvalidaError("Janela (dias) deve ser um número inteiro maior que 0.");
  }

  const { data: metrica, error: erroMetrica } = await supabase
    .from("definicoes_metricas")
    .select("id, codigo, tipo_valor")
    .eq("id", metricaId)
    .eq("projeto_id", projetoId)
    .maybeSingle();
  if (erroMetrica) throw new Error(`Falha ao buscar métrica: ${erroMetrica.message}`);
  if (!metrica) throw new RegraInvalidaError("Métrica não encontrada neste projeto.");
  if (metrica.tipo_valor !== "numero") {
    throw new RegraInvalidaError("Só métricas numéricas podem virar regra de risco.");
  }
  if (metrica.codigo === CODIGO_METRICA_RECEITA_MENSAL) {
    throw new RegraInvalidaError("Receita mensal é o impacto financeiro, não pode virar sinal de risco.");
  }

  const codigoSinal = `${metrica.codigo}_${tipo}`;
  const configRegra =
    tipo === "media_movel"
      ? { tipo, direcao, janela_dias: janelaDias ?? PADRAO_JANELA_MEDIA_MOVEL_DIAS }
      : { tipo, direcao };

  const id = randomUUID();
  const { error } = await supabase.from("regras_modelo").insert({
    id,
    projeto_id: projetoId,
    modelo_id: modeloId,
    metrica_id: metricaId,
    codigo_sinal: codigoSinal,
    config_regra: configRegra,
    peso,
  });

  if (error) {
    // Unique (modelo_id, codigo_sinal) — só pode colidir se a métrica já tiver
    // uma regra deste mesmo tipo (corrida entre duas abas, por exemplo).
    if (error.code === "23505") {
      throw new RegraInvalidaError("Esta métrica já tem uma regra deste tipo no modelo.");
    }
    throw new Error(`Falha ao criar regra: ${error.message}`);
  }

  return id;
}
