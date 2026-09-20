import { faixaRiscoFromScore } from "@/lib/risk";
import type { ResultadoPredicaoEntidade, ResultadoRegraEntidade } from "./tipos";

/**
 * Task 3.2 — Score de Risco: consolida os resultados normalizados (Task 3.1)
 * de todas as regras do modelo em um único termômetro 0-100 por entidade.
 *
 * `docs/motor-matematico.md` descreve `Risco Base = Σ (Valor Normalizado ×
 * Peso)`, mas essa soma pura pode ultrapassar 100 quando há múltiplas regras
 * (violaria o CHECK 0-100 de `predicoes.pontuacao`). Por isso o score final é
 * a MÉDIA PONDERADA — `Σ(valor × peso) / Σ(peso)` — considerando apenas as
 * regras avaliáveis para a entidade; regras "não avaliáveis" (acionado=null)
 * ficam de fora do numerador e do denominador e reduzem a `cobertura`.
 *
 * Omissão (métrica ausente) só entra como avaliável quando a regra define
 * `pontuacao_omissao`; sem isso ela é "não avaliável" e a cobertura cai — o
 * painel usa a cobertura para distinguir "saudável" de "sem dados".
 */
export function calcularPredicaoEntidade(params: {
  entidadeId: string;
  motivos: ResultadoRegraEntidade[];
  valorImpacto: number | null;
}): ResultadoPredicaoEntidade {
  const { entidadeId, motivos, valorImpacto } = params;

  let numerador = 0;
  let denominador = 0;
  let avaliaveis = 0;

  for (const motivo of motivos) {
    if (motivo.valor_normalizado == null) continue;
    numerador += motivo.pontos;
    denominador += motivo.peso;
    avaliaveis += 1;
  }

  const pontuacao = denominador > 0 ? Math.min(100, Math.max(0, numerador / denominador)) : 0;
  const cobertura = motivos.length > 0 ? avaliaveis / motivos.length : 0;

  return {
    entidade_id: entidadeId,
    pontuacao: Number(pontuacao.toFixed(3)),
    faixa_risco: faixaRiscoFromScore(pontuacao, 100),
    cobertura: Number(cobertura.toFixed(4)),
    valor_impacto: valorImpacto,
    motivos,
  };
}
