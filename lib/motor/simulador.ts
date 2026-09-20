import type { FaixaRisco } from "@/lib/mock-data";
import { faixaRiscoFromScore } from "@/lib/risk";
import { calcularScorePrioridade } from "./urgencia";

/**
 * Simulador de cenários ("what-if") do detalhe do cliente: responde "se eu
 * resolver este sinal, quanto o score cai?" sem chamar o motor.
 *
 * Reaproveita a fórmula de lib/motor/score.ts — score = Σ(pontos) / Σ(peso)
 * sobre as regras avaliáveis — mas em vez de recalcular tudo aplica só o
 * delta: reduzir um sinal em `r`% tira `pontos × r` do numerador, e o
 * denominador (Σ peso das regras avaliáveis) não muda. Partir do score
 * persistido + delta (e não de uma recomputação) mantém o "antes" idêntico ao
 * que o header e a fila mostram; o "depois" é exato sob a mesma fórmula.
 *
 * O que NÃO é simulado: o z-score de carteira (resolver um sinal deste
 * cliente move a média da carteira um pouco, mas o efeito é de segunda ordem)
 * e a cobertura (regras não avaliáveis continuam fora). É uma projeção
 * para prestação de contas, não uma nova predição — o texto na UI diz isso.
 */

export interface SinalSimulavel {
  codigo: string;
  metrica: string;
  /** Peso da regra no modelo (denominador do score). */
  peso: number;
  /** Contribuição atual ao numerador (peso × valor normalizado). */
  pontos: number;
  /** Frase pronta da evidência ("Atraso de pagamento em 45 dias, fora do padrão…"). */
  descricao: string;
}

export interface BaseSimulacao {
  scoreRisco: number;
  /** Σ peso das regras avaliáveis — denominador da média ponderada. */
  somaPesos: number;
  /** Receita mensal; null quando não mapeada (a projeção em R$ fica "—"). */
  mrr: number | null;
  impactoRelativo: number;
  sinais: SinalSimulavel[];
}

/** Redução (0-100%) aplicada a cada sinal, por código. Ausente = 0. */
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
  /** Pontos de score retirados pelo cenário (já arredondados). */
  reducaoScore: number;
  /** Sinais efetivamente alterados, com a redução aplicada. */
  ajustes: { sinal: SinalSimulavel; reducaoPct: number; pontosRetirados: number }[];
}

export function limitarReducao(valor: number): number {
  if (!Number.isFinite(valor)) return 0;
  return Math.min(100, Math.max(0, Math.round(valor)));
}

/** MRR × 12 × (score / 100) — mesma conta de `receitaAnualRisco` em lib/painel/clientes.ts. */
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

/** Cenário com todos os sinais listados zerados — o "teto" do que a ação de CS pode entregar. */
export function cenarioResolverTudo(sinais: SinalSimulavel[]): Cenario {
  return Object.fromEntries(sinais.map((s) => [s.codigo, 100]));
}
