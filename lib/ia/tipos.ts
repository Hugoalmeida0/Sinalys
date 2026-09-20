import type { FaixaRisco } from "@/lib/risco/faixa";

export interface SinalRisco {
  codigo_sinal: string;
  metrica: string;
  unidade: string | null;

  acionado: boolean | null;

  valor_observado: Record<string, unknown> | null;
  peso: number;
  pontos: number;
}

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

export interface CasoSimilar {
  id: string;
  entidade_id: string;
  nome_exibicao: string | null;
  contexto_texto: string;
  acao_realizada: string;
  desfecho: "recuperado" | "cancelado";

  similaridade: number;
  criado_em: string;
}
