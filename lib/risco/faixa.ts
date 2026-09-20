export type FaixaRisco = "critico" | "alerta" | "atencao" | "saudavel";

export type TendenciaScore = "subindo" | "descendo" | "estavel";

export type Severidade = "critica" | "alta" | "media";

export const faixaRiscoLabel: Record<FaixaRisco, string> = {
  critico: "Risco crítico",
  alerta: "Risco em alerta",
  atencao: "Atenção",
  saudavel: "Saudável",
};

export const faixaRiscoLabelCurto: Record<FaixaRisco, string> = {
  critico: "Crítico",
  alerta: "Alerta",
  atencao: "Atenção",
  saudavel: "Saudável",
};

export function faixaRiscoFromScore(score: number, max: number): FaixaRisco {
  const pct = score / max;
  if (pct > 0.5) return "critico";
  if (pct >= 0.35) return "alerta";
  if (pct >= 0.25) return "atencao";
  return "saudavel";
}

export const severidadeLabel: Record<Severidade, string> = {
  critica: "Crítico",
  alta: "Alto",
  media: "Médio",
};

export const severidadeNome: Record<Severidade, string> = {
  critica: "Crítica",
  alta: "Alta",
  media: "Média",
};
