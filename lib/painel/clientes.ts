import type { SupabaseClient } from "@supabase/supabase-js";
import { buscarTodasLinhas } from "@/lib/supabase/paginar";
import type { FaixaRisco, TendenciaScore } from "@/lib/risco/faixa";
import {
  calcularFaixaReceita,
  calcularImpactoRelativo,
  calcularScorePrioridade,
} from "@/lib/motor/urgencia";
import type { MotivoCancelamento } from "@/lib/cancelamento/constantes";
import { obterMetricaReceitaIdCache, obterProjetoInfoCache } from "./cache-estatico";
import { lerConfigHealthPublico } from "@/lib/health/configuracao";
import type { ClientePainel } from "./tipos";

const MAX_SINAIS = 3;

const LIMIAR_TENDENCIA = 3;
const RESUMO_SEM_SINAIS = "Todos os indicadores dentro do esperado";

export interface ResultadoClientesPainel {
  modeloId: string;
  clientes: ClientePainel[];

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

function atributoBooleano(atributos: unknown, chave: string): boolean {
  if (!atributos || typeof atributos !== "object") return false;
  return (atributos as Record<string, unknown>)[chave] === true;
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

export async function montarClientesPainel(params: {
  supabase: SupabaseClient;
  projetoId: string;
  modeloId: string;
  agora?: Date;
}): Promise<ResultadoClientesPainel> {
  const { supabase, projetoId, modeloId } = params;
  const agora = params.agora ?? new Date();
  const agoraIso = agora.toISOString();

  const [
    { data: entidades, error: erroEnt },
    { data: predicoes, error: erroPred },
    projeto,
    { data: eventos, error: erroEventos },
    metricaReceitaId,
  ] = await Promise.all([
    supabase
      .from("entidades")
      .select("id, id_externo, nome_exibicao, iniciado_em, atributos, token_compartilhamento")
      .eq("projeto_id", projetoId),
    buscarTodasLinhas<PredicaoLinha>(() =>
      supabase
        .from("predicoes")
        .select("id, entidade_id, referencia_em, pontuacao, faixa_risco, cobertura, valor_impacto")
        .eq("projeto_id", projetoId)
        .eq("modelo_id", modeloId)
        .order("entidade_id", { ascending: true })
        .order("referencia_em", { ascending: false })
    ),
    obterProjetoInfoCache(projetoId),
    buscarTodasLinhas(() =>
      supabase
        .from("eventos_desfecho")
        .select("entidade_id, codigo_evento, ocorrido_em, motivo_categoria, motivo_detalhe")
        .eq("projeto_id", projetoId)
        .order("entidade_id", { ascending: true })
    ),
    obterMetricaReceitaIdCache(projetoId),
  ]);
  if (erroEnt) throw new Error(`Falha ao buscar entidades: ${erroEnt.message}`);
  if (erroPred) throw new Error(`Falha ao buscar predições: ${erroPred.message}`);
  if (erroEventos) throw new Error(`Falha ao buscar desfechos: ${erroEventos.message}`);

  const canceladoEmPorEntidade = new Map<string, string>();
  const motivoPorEntidade = new Map<
    string,
    { categoria: MotivoCancelamento; detalhe: string | null }
  >();
  if (projeto?.codigo_evento_alvo) {
    for (const evento of eventos) {
      if (evento.codigo_evento !== projeto.codigo_evento_alvo) continue;
      const atual = canceladoEmPorEntidade.get(evento.entidade_id);
      if (!atual || evento.ocorrido_em > atual) {
        canceladoEmPorEntidade.set(evento.entidade_id, evento.ocorrido_em);
        if (evento.motivo_categoria) {
          motivoPorEntidade.set(evento.entidade_id, {
            categoria: evento.motivo_categoria as MotivoCancelamento,
            detalhe: evento.motivo_detalhe,
          });
        } else {
          motivoPorEntidade.delete(evento.entidade_id);
        }
      }
    }
  }

  const ultima = new Map<string, PredicaoLinha>();
  const anterior = new Map<string, PredicaoLinha>();
  for (const p of (predicoes ?? []) as PredicaoLinha[]) {
    if (!ultima.has(p.entidade_id)) ultima.set(p.entidade_id, p);
    else if (!anterior.has(p.entidade_id)) anterior.set(p.entidade_id, p);
  }

  const predicaoIds = Array.from(ultima.values()).map((p) => p.id);
  const entidadeIds = Array.from(ultima.keys());

  const [motivosRes, silenciamentosRes, obsRes] = await Promise.all([
    predicaoIds.length
      ? supabase
          .from("motivos_predicao")
          .select(
            "predicao_id, acionado, valor_observado, pontos, regras_modelo(codigo_sinal, config_regra, definicoes_metricas(rotulo, unidade, codigo))"
          )
          .in("predicao_id", predicaoIds)
          .eq("acionado", true)
      : Promise.resolve({ data: [], error: null }),
    entidadeIds.length
      ? supabase
          .from("silenciamentos_alerta")
          .select("entidade_id, silenciado_ate")
          .eq("projeto_id", projetoId)
          .gt("silenciado_ate", agoraIso)
          .in("entidade_id", entidadeIds)
      : Promise.resolve({ data: [], error: null }),
    metricaReceitaId && entidadeIds.length
      ? buscarTodasLinhas(() =>
          supabase
            .from("observacoes")
            .select("entidade_id, valor_numero")
            .eq("projeto_id", projetoId)
            .eq("metrica_id", metricaReceitaId)
            .in("entidade_id", entidadeIds)
            .not("valor_numero", "is", null)
            .lte("observado_em", agoraIso)
            .order("entidade_id", { ascending: true })
            .order("observado_em", { ascending: false })
        )
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (motivosRes.error) throw new Error(`Falha ao buscar motivos: ${motivosRes.error.message}`);
  if (silenciamentosRes.error) {
    throw new Error(`Falha ao buscar silenciamentos: ${silenciamentosRes.error.message}`);
  }
  if (obsRes.error) throw new Error(`Falha ao buscar receita: ${obsRes.error.message}`);

  const motivosPorPredicao = new Map<string, MotivoLinha[]>();
  for (const m of (motivosRes.data ?? []) as unknown as MotivoLinha[]) {
    const lista = motivosPorPredicao.get(m.predicao_id) ?? [];
    lista.push(m);
    motivosPorPredicao.set(m.predicao_id, lista);
  }

  const receitaHistorico = new Map<string, number[]>();
  for (const o of obsRes.data ?? []) {
    const lista = receitaHistorico.get(o.entidade_id) ?? [];
    if (lista.length < 2) lista.push(Number(o.valor_numero));
    receitaHistorico.set(o.entidade_id, lista);
  }

  const silenciadoAte = new Map<string, string>();
  for (const s of silenciamentosRes.data ?? []) {
    const atual = silenciadoAte.get(s.entidade_id);
    if (!atual || s.silenciado_ate > atual) silenciadoAte.set(s.entidade_id, s.silenciado_ate);
  }

  const faixaReceita = calcularFaixaReceita(
    (entidades ?? [])
      .filter((e) => !canceladoEmPorEntidade.has(e.id))
      .map((e) => numero(ultima.get(e.id)?.valor_impacto ?? null))
  );

  const clientes: ClientePainel[] = [];
  let semPredicao = 0;

  for (const e of entidades ?? []) {
    const p = ultima.get(e.id);
    if (!p) {
      semPredicao += 1;
      continue;
    }

    const pontuacao = numero(p.pontuacao) ?? 0;

    const mrr = numero(p.valor_impacto);
    const porte = atributoTexto(e.atributos, "porte");
    const motivos = (motivosPorPredicao.get(p.id) ?? []).sort(
      (a, b) => Number(b.pontos) - Number(a.pontos)
    );
    const sinais = motivos.slice(0, MAX_SINAIS).map(descreverSinal);

    const [receitaAtual, receitaAnterior] = receitaHistorico.get(e.id) ?? [];
    const variacaoMrr =
      receitaAtual != null && receitaAnterior
        ? Math.round(((receitaAtual - receitaAnterior) / receitaAnterior) * 100)
        : null;

    const impactoRelativo = calcularImpactoRelativo({ receita: mrr, faixa: faixaReceita, porte });

    clientes.push({
      id: e.id_externo,
      entidadeId: e.id,
      nome: e.nome_exibicao || e.id_externo,
      segmento: atributoTexto(e.atributos, "segmento"),
      porte,
      tipo: atributoTexto(e.atributos, "plano"),
      mrr,
      receitaAnualRisco: mrr == null ? null : Math.round(mrr * 12 * (pontuacao / 100)),
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
      scorePrioridade: Math.round(calcularScorePrioridade(pontuacao, impactoRelativo) * 10) / 10,
      impactoRelativo,
      silenciadoAte: silenciadoAte.get(e.id) ?? null,
      cancelado: canceladoEmPorEntidade.has(e.id),
      canceladoEm: canceladoEmPorEntidade.get(e.id) ?? null,
      teste: atributoBooleano(e.atributos, "teste_motor"),
      testeOrigem: atributoTexto(e.atributos, "teste_origem") || null,
      motivoCancelamento: motivoPorEntidade.get(e.id) ?? null,
      tokenCompartilhamento: e.token_compartilhamento,
      healthPublico: lerConfigHealthPublico(e.atributos),
    });
  }

  return { modeloId, clientes, semPredicao };
}

export const FAIXAS_FILA_PADRAO: FaixaRisco[] = ["critico", "alerta"];

export function compararPrioridade(a: ClientePainel, b: ClientePainel): number {
  return b.scorePrioridade - a.scorePrioridade || b.scoreRisco - a.scoreRisco;
}

export function montarFilaDoDia(
  clientes: ClientePainel[],
  opcoes: { faixas?: FaixaRisco[]; incluirSilenciados?: boolean } = {}
): ClientePainel[] {
  const faixas = new Set(opcoes.faixas ?? FAIXAS_FILA_PADRAO);
  return clientes
    .filter((c) => !c.cancelado)
    .filter((c) => faixas.has(c.faixaRisco))
    .filter((c) => opcoes.incluirSilenciados || !c.silenciadoAte)
    .sort(compararPrioridade);
}

export const TODAS_FAIXAS: FaixaRisco[] = ["critico", "alerta", "atencao", "saudavel"];

export const TAMANHO_RESUMO_FILA = 5;

export function montarResumoFila(
  clientes: ClientePainel[],
  limite = TAMANHO_RESUMO_FILA
): ClientePainel[] {
  return montarFilaDoDia(clientes, { faixas: TODAS_FAIXAS }).slice(0, limite);
}
