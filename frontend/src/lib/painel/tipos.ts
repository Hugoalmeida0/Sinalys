import type { FaixaRisco, Severidade, TendenciaScore } from "@/lib/risco/faixa";
import type { MotivoCancelamento } from "@/lib/cancelamento/constantes";
import type { ConfigHealthPublico } from "@/lib/health/configuracao";

export interface ClientePainel {
  id: string;

  entidadeId: string;
  nome: string;
  segmento: string;
  porte: string;

  tipo: string;

  mrr: number | null;

  receitaAnualRisco: number | null;

  scoreRisco: number;
  scoreMax: 100;
  faixaRisco: FaixaRisco;
  tendenciaScore: TendenciaScore;

  clienteDesde: string;

  resumoAlerta: string;

  variacaoMrr: number | null;

  sinais: string[];

  atualizadoEm: string;

  cobertura: number | null;

  scorePrioridade: number;

  impactoRelativo: number;

  silenciadoAte: string | null;

  cancelado: boolean;

  canceladoEm: string | null;

  teste: boolean;

  testeOrigem: string | null;

  motivoCancelamento: { categoria: MotivoCancelamento; detalhe: string | null } | null;

  tokenCompartilhamento: string;

  healthPublico: ConfigHealthPublico;
}

export interface KpisPainel {
  receitaEmRiscoAno: number;
  clientesEmAlerta: number;
  totalCarteira: number;

  antecedenciaMediaMeses: number | null;
  antecedenciaMedianaMeses: number | null;
  antecedenciaMaximaMeses: number | null;

  desfechosAntecipados: number;
  clientesContatados7d: number;

  receitaSalva30d: number;

  clientesRecuperados30d: number;
}

export interface Evidencia {
  id: string;
  severidade: Severidade;
  titulo: string;
}

export interface ProximaAcao {
  id: string;
  titulo: string;
  concluida: boolean;
}

export interface EventoHistorico {
  id: string;
  data: string;
  tipo: "contato" | "sinal" | "sistema" | "reuniao";
  titulo: string;
  descricao: string;
  autor?: string;
}

export interface PontoScore {
  mes: string;
  score: number;
}
