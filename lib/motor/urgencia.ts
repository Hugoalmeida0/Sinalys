/**
 * Task 3.3 — Matriz de Urgência: `Score de Urgência = Score de Risco ×
 * Receita Mensal` (docs/motor-matematico.md §4). Não é persistido em coluna
 * própria — `predicoes.pontuacao` e `predicoes.valor_impacto` já guardam os
 * dois fatores, então o score de urgência é derivado sob demanda ao montar a
 * fila de priorização.
 *
 * Retorna `null` quando a entidade não tem receita mensal mapeada (métrica
 * reservada `receita_mensal` ausente) — nesse caso a urgência é desconhecida,
 * não zero, e a entidade cai para o fim da fila (ver `ordenarFilaUrgencia`).
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
