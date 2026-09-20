import type { FaixaRisco, TendenciaScore } from "@/lib/mock-data";

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
  /** Receita mensal (métrica reservada `receita_mensal`); 0 quando não mapeada. */
  mrr: number;
  /** MRR × 12 × (score / 100): receita anual ponderada pela probabilidade de risco. */
  receitaAnualRisco: number;
  /** Score de risco 0-100 do motor (predicoes.pontuacao). */
  scoreRisco: number;
  scoreMax: 100;
  faixaRisco: FaixaRisco;
  tendenciaScore: TendenciaScore;
  /** ISO date de `entidades.iniciado_em`, ou "" se desconhecido. */
  clienteDesde: string;
  /** Frase única com os principais sinais acionados. */
  resumoAlerta: string;
  /** Variação % do MRR frente à observação anterior (0 se não há histórico). */
  variacaoMrr: number;
  /** Chips dos principais sinais acionados (até 3). */
  sinais: string[];
  /** ISO date da predição usada (`predicoes.referencia_em`). */
  atualizadoEm: string;
  /** Proporção de regras avaliáveis na predição (0-1). */
  cobertura: number | null;
  /** Score de Urgência (risco × receita) — critério de ordenação da fila. */
  scoreUrgencia: number | null;
  /** ISO datetime até quando os alertas estão silenciados, ou null. */
  silenciadoAte: string | null;
  /** true quando há um evento de desfecho (código-alvo do projeto, ex. "cancelamento") registrado para o cliente. */
  cancelado: boolean;
  /** ISO date do desfecho mais recente, ou null se o cliente segue ativo. */
  canceladoEm: string | null;
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
