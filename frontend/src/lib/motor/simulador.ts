import { faixaRiscoFromScore, type FaixaRisco } from "@/lib/risco/faixa";
import { calcularScorePrioridade } from "./urgencia";

export interface SinalSimulavel {
  codigo: string;
  metrica: string;

  peso: number;

  pontos: number;

  descricao: string;
}

export interface BaseSimulacao {
  scoreRisco: number;

  somaPesos: number;

  mrr: number | null;
  impactoRelativo: number;
  sinais: SinalSimulavel[];
}

export type Cenario = Record<string, number>;

export interface ResultadoSimulacao {
  scoreAntes: number;
  scoreDepois: number;
  faixaAntes: FaixaRisco;
  faixaDepois: FaixaRisco;
  receitaRiscoAntes: number | null;
  receitaRiscoDepois: number | null;
  prioridadeAntes: number;
  prioridadeDepois: number;

  reducaoScore: number;

  ajustes: { sinal: SinalSimulavel; reducaoPct: number; pontosRetirados: number }[];
}

export function limitarReducao(valor: number): number {
  if (!Number.isFinite(valor)) return 0;
  return Math.min(100, Math.max(0, Math.round(valor)));
}

function receitaEmRisco(mrr: number | null, score: number): number | null {
  return mrr == null ? null : Math.round(mrr * 12 * (score / 100));
}

export function simularCenario(base: BaseSimulacao, cenario: Cenario): ResultadoSimulacao {
  const ajustes = base.sinais
    .map((sinal) => {
      const reducaoPct = limitarReducao(cenario[sinal.codigo] ?? 0);
      return { sinal, reducaoPct, pontosRetirados: sinal.pontos * (reducaoPct / 100) };
    })
    .filter((a) => a.reducaoPct > 0);

  const pontosRetirados = ajustes.reduce((soma, a) => soma + a.pontosRetirados, 0);
  const deltaScore = base.somaPesos > 0 ? pontosRetirados / base.somaPesos : 0;

  const scoreAntes = base.scoreRisco;
  const scoreDepois = Math.max(0, Math.round(scoreAntes - deltaScore));

  return {
    scoreAntes,
    scoreDepois,
    faixaAntes: faixaRiscoFromScore(scoreAntes, 100),
    faixaDepois: faixaRiscoFromScore(scoreDepois, 100),
    receitaRiscoAntes: receitaEmRisco(base.mrr, scoreAntes),
    receitaRiscoDepois: receitaEmRisco(base.mrr, scoreDepois),
    prioridadeAntes: Math.round(calcularScorePrioridade(scoreAntes, base.impactoRelativo) * 10) / 10,
    prioridadeDepois: Math.round(calcularScorePrioridade(scoreDepois, base.impactoRelativo) * 10) / 10,
    reducaoScore: scoreAntes - scoreDepois,
    ajustes,
  };
}

export function cenarioResolverTudo(sinais: SinalSimulavel[]): Cenario {
  return Object.fromEntries(sinais.map((s) => [s.codigo, 100]));
}
