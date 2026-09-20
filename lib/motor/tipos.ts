import type { FaixaRisco } from "@/lib/mock-data";

/**
 * Sentido em que uma métrica indica risco. Decisão registrada em
 * `regras_modelo.config_regra.direcao` (por regra/modelo, não global à
 * métrica) — ver discussão no TASKS.md/Módulo 3.
 */
export type DirecaoRisco = "maior_pior" | "menor_pior";

export type TipoRegra = "zscore_carteira" | "media_movel";

interface ConfigRegraBase {
  direcao: DirecaoRisco;
  /**
   * Pontuação (0-100) quando a métrica está ausente para a entidade. Sem
   * este campo a omissão é "não avaliável" (reduz cobertura, não pontua).
   */
  pontuacao_omissao?: number;
  /** Limite de |z| para saturar a normalização em 100. */
  clip_z?: number;
}

export interface ConfigRegraZscoreCarteira extends ConfigRegraBase {
  tipo: "zscore_carteira";
  /**
   * Quantas observações mais recentes da entidade são agregadas (média)
   * antes da comparação com a carteira. 1 = só a última observação.
   */
  janela_observacoes?: number;
}

export interface ConfigRegraMediaMovel extends ConfigRegraBase {
  tipo: "media_movel";
  /** Tamanho (dias) da janela recente comparada contra o histórico da própria entidade. */
  janela_dias: number;
}

export type ConfigRegra = ConfigRegraZscoreCarteira | ConfigRegraMediaMovel;

export interface RegraModeloRegistro {
  id: string;
  metrica_id: string;
  codigo_sinal: string;
  config_regra: ConfigRegra;
  peso: number;
}

export interface ObservacaoNumerica {
  entidade_id: string;
  observado_em: string;
  valor_numero: number;
}

/** Resultado da avaliação de uma regra para uma entidade específica. */
export interface ResultadoRegraEntidade {
  regra_modelo_id: string;
  peso: number;
  /** null = não avaliável (dados insuficientes na carteira/histórico), distinto de "não acionado". */
  acionado: boolean | null;
  valor_observado: Record<string, unknown> | null;
  valor_normalizado: number | null;
  pontos: number;
}

export interface ResultadoPredicaoEntidade {
  entidade_id: string;
  pontuacao: number;
  faixa_risco: FaixaRisco;
  cobertura: number;
  valor_impacto: number | null;
  motivos: ResultadoRegraEntidade[];
}
