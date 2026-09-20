import { faixaRiscoFromScore } from "@/lib/risco/faixa";
import type { ResultadoPredicaoEntidade, ResultadoRegraEntidade } from "./tipos";

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
