import type { SupabaseClient } from "@supabase/supabase-js";
import type { FaixaRisco, TendenciaScore } from "@/lib/mock-data";
import { CODIGO_METRICA_RECEITA_MENSAL } from "@/lib/motor/constantes";
import { calcularScoreUrgencia } from "@/lib/motor/urgencia";
import type { ClientePainel } from "./tipos";

/** Máximo de chips em "Principais sinais". */
const MAX_SINAIS = 3;
/** Variação mínima de score (pontos) para considerar tendência de subida/queda. */
const LIMIAR_TENDENCIA = 3;
const RESUMO_SEM_SINAIS = "Todos os indicadores dentro do esperado";

export interface ResultadoClientesPainel {
  modeloId: string;
  clientes: ClientePainel[];
  /** Entidades do projeto ainda sem predição sob o modelo (não entram na lista). */
  semPredicao: number;
}

interface PredicaoLinha {
  id: string;
  entidade_id: string;
  referencia_em: string;
  pontuacao: number | string | null;
  faixa_risco: string | null;
  cobertura: number | string | null;
  valor_impacto: number | string | null;
}

interface MetricaRelacao {
  rotulo: string;
  unidade: string | null;
  codigo: string;
}

interface RegraRelacao {
  codigo_sinal: string;
  config_regra: Record<string, unknown> | null;
  definicoes_metricas: MetricaRelacao | MetricaRelacao[] | null;
}

interface MotivoLinha {
  predicao_id: string;
  acionado: boolean | null;
  valor_observado: Record<string, unknown> | null;
  pontos: number | string;
  regras_modelo: RegraRelacao | RegraRelacao[] | null;
}

function normalizarRelacao<T>(relacao: T | T[] | null | undefined): T | null {
  if (relacao == null) return null;
  return Array.isArray(relacao) ? (relacao[0] ?? null) : relacao;
}

function numero(v: number | string | null | undefined): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function atributoTexto(atributos: unknown, chave: string): string {
  if (!atributos || typeof atributos !== "object") return "";
  const v = (atributos as Record<string, unknown>)[chave];
  return typeof v === "string" ? v : typeof v === "number" ? String(v) : "";
}

function formatarValorSinal(valor: number, unidade: string | null): string {
  const u = (unidade ?? "").toLowerCase();
  const n = valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  if (u === "percentual" || u === "%") return `${n}%`;
  if (u === "dias") return `${n} dias`;
  if (u === "horas" || u === "h") return `${n}h`;
  if (u === "brl") return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return n;
}

/** Texto curto de um motivo acionado, no padrão dos chips do mock ("Uso ↓ 63%"). */
function descreverSinal(m: MotivoLinha): string {
  const regra = normalizarRelacao(m.regras_modelo);
  const metrica = normalizarRelacao(regra?.definicoes_metricas);
  const rotulo = metrica?.rotulo ?? regra?.codigo_sinal ?? "Sinal";
  const obs = m.valor_observado ?? {};

  if (obs.omissao === true) return `${rotulo}: sem dados`;

  const bruto = obs.valor ?? obs.ultimo_valor;
  const valor = typeof bruto === "number" ? bruto : Number(bruto);
  if (!Number.isFinite(valor)) return rotulo;

  const direcao = regra?.config_regra?.direcao;
  const seta = direcao === "menor_pior" ? "↓" : direcao === "maior_pior" ? "↑" : "";
  return [rotulo, seta, formatarValorSinal(valor, metrica?.unidade ?? null)]
    .filter(Boolean)
    .join(" ");
}

function tendencia(atual: number, anterior: number | null): TendenciaScore {
  if (anterior == null) return "estavel";
  const delta = atual - anterior;
  if (delta >= LIMIAR_TENDENCIA) return "subindo";
  if (delta <= -LIMIAR_TENDENCIA) return "descendo";
  return "estavel";
}

/**
 * Monta a lista de clientes na forma do painel: última predição de cada
 * entidade sob o modelo + dados cadastrais + principais sinais + tendência +
 * variação de MRR + silenciamento vigente. Não filtra nem ordena — isso é
 * feito por `montarFilaDoDia` e pelas rotas.
 */
export async function montarClientesPainel(params: {
  supabase: SupabaseClient;
  projetoId: string;
  modeloId: string;
  agora?: Date;
}): Promise<ResultadoClientesPainel> {
  const { supabase, projetoId, modeloId } = params;
  const agora = params.agora ?? new Date();
  const agoraIso = agora.toISOString();

  const [{ data: entidades, error: erroEnt }, { data: predicoes, error: erroPred }] =
    await Promise.all([
      supabase
        .from("entidades")
        .select("id, id_externo, nome_exibicao, iniciado_em, atributos")
        .eq("projeto_id", projetoId),
      supabase
        .from("predicoes")
        .select("id, entidade_id, referencia_em, pontuacao, faixa_risco, cobertura, valor_impacto")
        .eq("projeto_id", projetoId)
        .eq("modelo_id", modeloId)
        .order("entidade_id", { ascending: true })
        .order("referencia_em", { ascending: false }),
    ]);
  if (erroEnt) throw new Error(`Falha ao buscar entidades: ${erroEnt.message}`);
  if (erroPred) throw new Error(`Falha ao buscar predições: ${erroPred.message}`);

  // Última e penúltima predição por entidade (para score atual e tendência).
  const ultima = new Map<string, PredicaoLinha>();
  const anterior = new Map<string, PredicaoLinha>();
  for (const p of (predicoes ?? []) as PredicaoLinha[]) {
    if (!ultima.has(p.entidade_id)) ultima.set(p.entidade_id, p);
    else if (!anterior.has(p.entidade_id)) anterior.set(p.entidade_id, p);
  }

  const predicaoIds = Array.from(ultima.values()).map((p) => p.id);
  const entidadeIds = Array.from(ultima.keys());

  const [motivosRes, receitaMetricaRes, silenciamentosRes] = await Promise.all([
    predicaoIds.length
      ? supabase
          .from("motivos_predicao")
          .select(
            "predicao_id, acionado, valor_observado, pontos, regras_modelo(codigo_sinal, config_regra, definicoes_metricas(rotulo, unidade, codigo))"
          )
          .in("predicao_id", predicaoIds)
          .eq("acionado", true)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("definicoes_metricas")
      .select("id")
      .eq("projeto_id", projetoId)
      .eq("codigo", CODIGO_METRICA_RECEITA_MENSAL)
      .maybeSingle(),
    entidadeIds.length
      ? supabase
          .from("silenciamentos_alerta")
          .select("entidade_id, silenciado_ate")
          .eq("projeto_id", projetoId)
          .gt("silenciado_ate", agoraIso)
          .in("entidade_id", entidadeIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (motivosRes.error) throw new Error(`Falha ao buscar motivos: ${motivosRes.error.message}`);
  if (silenciamentosRes.error) {
    throw new Error(`Falha ao buscar silenciamentos: ${silenciamentosRes.error.message}`);
  }

  const motivosPorPredicao = new Map<string, MotivoLinha[]>();
  for (const m of (motivosRes.data ?? []) as unknown as MotivoLinha[]) {
    const lista = motivosPorPredicao.get(m.predicao_id) ?? [];
    lista.push(m);
    motivosPorPredicao.set(m.predicao_id, lista);
  }

  // Duas últimas observações de receita por entidade → variação de MRR.
  const receitaHistorico = new Map<string, number[]>();
  if (receitaMetricaRes.data && entidadeIds.length) {
    const { data: obs, error } = await supabase
      .from("observacoes")
      .select("entidade_id, valor_numero")
      .eq("projeto_id", projetoId)
      .eq("metrica_id", receitaMetricaRes.data.id)
      .in("entidade_id", entidadeIds)
      .not("valor_numero", "is", null)
      .lte("observado_em", agoraIso)
      .order("entidade_id", { ascending: true })
      .order("observado_em", { ascending: false });
    if (error) throw new Error(`Falha ao buscar receita: ${error.message}`);
    for (const o of obs ?? []) {
      const lista = receitaHistorico.get(o.entidade_id) ?? [];
      if (lista.length < 2) lista.push(Number(o.valor_numero));
      receitaHistorico.set(o.entidade_id, lista);
    }
  }

  const silenciadoAte = new Map<string, string>();
  for (const s of silenciamentosRes.data ?? []) {
    const atual = silenciadoAte.get(s.entidade_id);
    if (!atual || s.silenciado_ate > atual) silenciadoAte.set(s.entidade_id, s.silenciado_ate);
  }

  const clientes: ClientePainel[] = [];
  let semPredicao = 0;

  for (const e of entidades ?? []) {
    const p = ultima.get(e.id);
    if (!p) {
      semPredicao += 1;
      continue;
    }

    const pontuacao = numero(p.pontuacao) ?? 0;
    const mrr = numero(p.valor_impacto) ?? 0;
    const motivos = (motivosPorPredicao.get(p.id) ?? []).sort(
      (a, b) => Number(b.pontos) - Number(a.pontos)
    );
    const sinais = motivos.slice(0, MAX_SINAIS).map(descreverSinal);

    const [receitaAtual, receitaAnterior] = receitaHistorico.get(e.id) ?? [];
    const variacaoMrr =
      receitaAtual != null && receitaAnterior
        ? Math.round(((receitaAtual - receitaAnterior) / receitaAnterior) * 100)
        : 0;

    clientes.push({
      id: e.id_externo,
      entidadeId: e.id,
      nome: e.nome_exibicao || e.id_externo,
      segmento: atributoTexto(e.atributos, "segmento"),
      porte: atributoTexto(e.atributos, "porte"),
      tipo: atributoTexto(e.atributos, "plano"),
      mrr,
      receitaAnualRisco: Math.round(mrr * 12 * (pontuacao / 100)),
      scoreRisco: Math.round(pontuacao),
      scoreMax: 100,
      faixaRisco: (p.faixa_risco as FaixaRisco | null) ?? "saudavel",
      tendenciaScore: tendencia(pontuacao, numero(anterior.get(e.id)?.pontuacao ?? null)),
      clienteDesde: e.iniciado_em ? String(e.iniciado_em).slice(0, 10) : "",
      resumoAlerta: sinais.length ? sinais.join("; ") : RESUMO_SEM_SINAIS,
      variacaoMrr,
      sinais,
      atualizadoEm: String(p.referencia_em).slice(0, 10),
      cobertura: numero(p.cobertura),
      scoreUrgencia: calcularScoreUrgencia(pontuacao, numero(p.valor_impacto)),
      silenciadoAte: silenciadoAte.get(e.id) ?? null,
    });
  }

  return { modeloId, clientes, semPredicao };
}

/** Faixas que entram na fila do dia por padrão. */
export const FAIXAS_FILA_PADRAO: FaixaRisco[] = ["critico", "alerta"];

/**
 * Fila de priorização: só as faixas pedidas, sem silenciados (a menos que
 * solicitado), ordenada por Score de Urgência (risco × receita) — a mesma
 * ordem de "receita em risco" exibida no painel. Sem receita mapeada vai para
 * o fim, ordenado por risco.
 */
export function montarFilaDoDia(
  clientes: ClientePainel[],
  opcoes: { faixas?: FaixaRisco[]; incluirSilenciados?: boolean } = {}
): ClientePainel[] {
  const faixas = new Set(opcoes.faixas ?? FAIXAS_FILA_PADRAO);
  return clientes
    .filter((c) => faixas.has(c.faixaRisco))
    .filter((c) => opcoes.incluirSilenciados || !c.silenciadoAte)
    .sort((a, b) => {
      if (a.scoreUrgencia == null && b.scoreUrgencia == null) return b.scoreRisco - a.scoreRisco;
      if (a.scoreUrgencia == null) return 1;
      if (b.scoreUrgencia == null) return -1;
      return b.scoreUrgencia - a.scoreUrgencia;
    });
}
