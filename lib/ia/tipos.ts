import type { FaixaRisco } from "@/lib/mock-data";

/** Um sinal de risco do motor matemático, já traduzido para linguagem de negócio. */
export interface SinalRisco {
  codigo_sinal: string;
  metrica: string;
  unidade: string | null;
  /** null = regra não avaliável (dados insuficientes), distinto de "não acionada". */
  acionado: boolean | null;
  /** Conteúdo de `motivos_predicao.valor_observado` (valor bruto ou marcador de omissão). */
  valor_observado: Record<string, unknown> | null;
  peso: number;
  pontos: number;
}

/**
 * "Raio-X" do cliente no momento da análise — o Contexto Atual de
 * docs/inteligencia.md §2. Montado a partir da última predição persistida pelo
 * Módulo 3 (decisão registrada no TASKS.md/Módulo 4).
 */
export interface ContextoAtual {
  entidade_id: string;
  id_externo: string;
  nome_exibicao: string | null;
  rotulo_entidade: string;
  predicao_id: string;
  referencia_em: string;
  pontuacao: number;
  faixa_risco: FaixaRisco | null;
  cobertura: number | null;
  valor_impacto: number | null;
  score_urgencia: number | null;
  sinais: SinalRisco[];
}

/** Um caso histórico recuperado do banco vetorial (Contexto Histórico / lookalike). */
export interface CasoSimilar {
  id: string;
  entidade_id: string;
  nome_exibicao: string | null;
  contexto_texto: string;
  acao_realizada: string;
  desfecho: "recuperado" | "cancelado";
  /** Similaridade de cosseno, 0 a 1 — quanto maior, mais parecido. */
  similaridade: number;
  criado_em: string;
}
