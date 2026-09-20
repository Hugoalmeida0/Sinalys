import type { FaixaRisco, TendenciaScore } from "@/lib/mock-data";
import type { MotivoCancelamento } from "@/lib/cancelamento/constantes";
import type { ConfigHealthPublico } from "./health-config";

/**
 * Cliente na forma que o painel consome (mesmos campos do `Cliente` de
 * lib/mock-data.ts, para o front trocar o mock pela API sem refatorar), mais
 * alguns campos que só existem com dados reais.
 */
export interface ClientePainel {
  /** `entidades.id_externo` — o código visível ("C001"). */
  id: string;
  /** UUID interno, para chamadas que precisam dele. */
  entidadeId: string;
  nome: string;
  segmento: string;
  porte: string;
  /** Plano/contrato, de `entidades.atributos.plano`. */
  tipo: string;
  /** Receita mensal (métrica reservada `receita_mensal`); null quando não mapeada — nunca 0. */
  mrr: number | null;
  /** MRR × 12 × (score / 100): receita anual ponderada pela probabilidade de risco; null sem MRR. */
  receitaAnualRisco: number | null;
  /** Score de risco 0-100 do motor (predicoes.pontuacao). */
  scoreRisco: number;
  scoreMax: 100;
  faixaRisco: FaixaRisco;
  tendenciaScore: TendenciaScore;
  /** ISO date de `entidades.iniciado_em`, ou "" se desconhecido. */
  clienteDesde: string;
  /** Frase única com os principais sinais acionados. */
  resumoAlerta: string;
  /** Variação % do MRR frente à observação anterior; null sem histórico. */
  variacaoMrr: number | null;
  /** Chips dos principais sinais acionados (até 3). */
  sinais: string[];
  /** ISO date da predição usada (`predicoes.referencia_em`). */
  atualizadoEm: string;
  /** Proporção de regras avaliáveis na predição (0-1). */
  cobertura: number | null;
  /**
   * Score de Prioridade (0-100): risco × (0,5 + impacto relativo da receita
   * na carteira, escala log). Critério de ordenação da fila — ver
   * `lib/motor/urgencia.ts`.
   */
  scorePrioridade: number;
  /** Posição da receita na carteira ativa (0 = menor conta, 1 = maior); por porte quando sem MRR. */
  impactoRelativo: number;
  /** ISO datetime até quando os alertas estão silenciados, ou null. */
  silenciadoAte: string | null;
  /** true quando há um evento de desfecho (código-alvo do projeto, ex. "cancelamento") registrado para o cliente. */
  cancelado: boolean;
  /** ISO date do desfecho mais recente, ou null se o cliente segue ativo. */
  canceladoEm: string | null;
  /**
   * true para entidades criadas por `scripts/clientes-teste-motor.mts`
   * (`atributos.teste_motor`): cópias de clientes reais calculadas pelo motor
   * novo, para comparação lado a lado. Marcadas na UI, nunca silenciosas.
   */
  teste: boolean;
  /** `id_externo` do cliente real de origem, quando `teste`. */
  testeOrigem: string | null;
  /** Motivo estruturado do cancelamento mais recente, ou null se não capturado / cliente ativo. */
  motivoCancelamento: { categoria: MotivoCancelamento; detalhe: string | null } | null;
  /** Token opaco da página pública de Health Score (/health/[token]). */
  tokenCompartilhamento: string;
  /** Personalização da página pública escolhida pelo CS (`atributos.health_publico`). */
  healthPublico: ConfigHealthPublico;
}

export interface KpisPainel {
  receitaEmRiscoAno: number;
  clientesEmAlerta: number;
  totalCarteira: number;
  /** null quando não há desfechos antecipados para medir. */
  antecedenciaMediaMeses: number | null;
  antecedenciaMedianaMeses: number | null;
  antecedenciaMaximaMeses: number | null;
  /** Quantidade de desfechos usados no cálculo de antecedência. */
  desfechosAntecipados: number;
  clientesContatados7d: number;
  /** Receita anualizada de clientes que saíram de crítico/alerta para saudável nos últimos 30 dias. */
  receitaSalva30d: number;
  /** Quantidade de clientes que geraram essa recuperação. */
  clientesRecuperados30d: number;
}
