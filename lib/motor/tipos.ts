import type { FaixaRisco } from "@/lib/risco/faixa";

export type DirecaoRisco = "maior_pior" | "menor_pior";

export type TipoRegra = "zscore_carteira" | "media_movel";

interface ConfigRegraBase {
  direcao: DirecaoRisco;

  pontuacao_omissao?: number;

  clip_z?: number;
}

export interface ConfigRegraZscoreCarteira extends ConfigRegraBase {
  tipo: "zscore_carteira";

  janela_observacoes?: number;
}

export interface ConfigRegraMediaMovel extends ConfigRegraBase {
  tipo: "media_movel";

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

export interface ResultadoRegraEntidade {
  regra_modelo_id: string;
  peso: number;

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
