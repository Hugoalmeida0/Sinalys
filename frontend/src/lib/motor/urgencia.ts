const FATOR_IMPACTO_MIN = 0.5;
const FATOR_IMPACTO_MAX = 1.5;

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

export interface FaixaReceita {
  min: number;
  max: number;
}

export function calcularFaixaReceita(receitas: (number | null | undefined)[]): FaixaReceita | null {
  const validas = receitas.filter((r): r is number => r != null && Number.isFinite(r) && r > 0);
  if (validas.length < 2) return null;
  const min = Math.min(...validas);
  const max = Math.max(...validas);
  return max > min ? { min, max } : null;
}

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

export function calcularScorePrioridade(pontuacaoRisco: number, impactoRelativo: number): number {
  const fator = FATOR_IMPACTO_MIN + (FATOR_IMPACTO_MAX - FATOR_IMPACTO_MIN) * impactoRelativo;
  return Math.min(100, Math.max(0, pontuacaoRisco * fator));
}

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
