/**
 * Task 3.3 / G.1 — Matriz de Urgência (docs/motor-matematico.md §4).
 *
 * O produto puro `risco × receita` (versão original) é dominado pela receita:
 * uma conta grande e saudável passa na frente de uma pequena em alerta.
 * O Score de Prioridade limita o efeito do dinheiro a um fator entre 0,5 e
 * 1,5 sobre o risco, com a receita em escala log relativa à carteira ativa:
 *
 *   impacto_rel = ln(MRR / MRR_min) / ln(MRR_max / MRR_min)   ∈ [0, 1]
 *   prioridade  = risco × (0,5 + impacto_rel)                  ∈ [0, 1,5 × risco]
 *
 * Assim uma grande com score médio passa uma pequena com score alto, mas uma
 * grande saudável não passa ninguém em alerta. Nada disso é persistido:
 * `predicoes.pontuacao` continua sendo só risco (dinheiro é impacto, nunca
 * risco — TASKS-ATUALIZACAO F.5) e a prioridade é derivada ao montar a fila.
 */

/** Fator mínimo/máximo que o impacto aplica sobre o risco. */
const FATOR_IMPACTO_MIN = 0.5;
const FATOR_IMPACTO_MAX = 1.5;

/**
 * Impacto relativo quando a receita da entidade é desconhecida (G.2): usa o
 * porte cadastral como aproximação e, sem porte, o meio da carteira. Nunca
 * zero — "não sei quanto paga" não é "não paga nada".
 */
const IMPACTO_REL_POR_PORTE: Record<string, number> = {
  pequeno: 0.25,
  medio: 0.5,
  grande: 0.75,
};
const IMPACTO_REL_DESCONHECIDO = 0.5;

function normalizarPorte(porte: string | null | undefined): string {
  return (porte ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

/** Faixa de receita da carteira ativa, base da escala log. */
export interface FaixaReceita {
  min: number;
  max: number;
}

/** Calcula a faixa (min/max) das receitas conhecidas e positivas; null quando não há duas distintas. */
export function calcularFaixaReceita(receitas: (number | null | undefined)[]): FaixaReceita | null {
  const validas = receitas.filter((r): r is number => r != null && Number.isFinite(r) && r > 0);
  if (validas.length < 2) return null;
  const min = Math.min(...validas);
  const max = Math.max(...validas);
  return max > min ? { min, max } : null;
}

/**
 * Posição da receita na carteira, em escala log (0 = menor conta, 1 = maior).
 * Sem receita conhecida cai para o porte; sem faixa de carteira (todas iguais
 * ou só uma conta) todo mundo vale 0,5.
 */
export function calcularImpactoRelativo(params: {
  receita: number | null;
  faixa: FaixaReceita | null;
  porte?: string | null;
}): number {
  const { receita, faixa, porte } = params;
  if (receita == null || !Number.isFinite(receita) || receita <= 0) {
    return IMPACTO_REL_POR_PORTE[normalizarPorte(porte)] ?? IMPACTO_REL_DESCONHECIDO;
  }
  if (!faixa) return IMPACTO_REL_DESCONHECIDO;
  const rel = Math.log(receita / faixa.min) / Math.log(faixa.max / faixa.min);
  return Math.min(1, Math.max(0, rel));
}

/** Score de Prioridade (0-100): risco modulado pelo impacto relativo. Critério de ordenação da fila. */
export function calcularScorePrioridade(pontuacaoRisco: number, impactoRelativo: number): number {
  const fator = FATOR_IMPACTO_MIN + (FATOR_IMPACTO_MAX - FATOR_IMPACTO_MIN) * impactoRelativo;
  return Math.min(100, Math.max(0, pontuacaoRisco * fator));
}

/**
 * Versão original (produto bruto), mantida para o contexto do assistente e a
 * rota `/api/motor/fila`, que não têm a carteira inteira à mão. Retorna
 * `null` quando a entidade não tem receita mapeada.
 */
export function calcularScoreUrgencia(pontuacaoRisco: number, valorImpacto: number | null): number | null {
  if (valorImpacto == null) return null;
  return pontuacaoRisco * valorImpacto;
}

export interface ItemFilaUrgencia {
  entidade_id: string;
  pontuacao: number;
  valor_impacto: number | null;
  score_urgencia: number | null;
}

/** Ordena a fila de priorização de CS pelo Score de Urgência (desc); entidades sem receita mapeada vão para o final, ordenadas por risco. */
export function ordenarFilaUrgencia<T extends { pontuacao: number; valor_impacto: number | null }>(
  predicoes: T[]
): (T & { score_urgencia: number | null })[] {
  return predicoes
    .map((p) => ({ ...p, score_urgencia: calcularScoreUrgencia(p.pontuacao, p.valor_impacto) }))
    .sort((a, b) => {
      if (a.score_urgencia == null && b.score_urgencia == null) return b.pontuacao - a.pontuacao;
      if (a.score_urgencia == null) return 1;
      if (b.score_urgencia == null) return -1;
      return b.score_urgencia - a.score_urgencia;
    });
}
