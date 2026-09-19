import type { FaixaRisco } from "./mock-data";

export const faixaRiscoLabel: Record<FaixaRisco, string> = {
  critico: "Risco crítico",
  alerta: "Risco em alerta",
  atencao: "Atenção",
  saudavel: "Saudável",
};

export const faixaRiscoClasses: Record<FaixaRisco, string> = {
  critico: "bg-red-600 text-white",
  alerta: "bg-amber-500 text-white",
  atencao: "bg-yellow-400 text-yellow-950",
  saudavel: "bg-emerald-500 text-white",
};

export const faixaRiscoSoftClasses: Record<FaixaRisco, string> = {
  critico: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200",
  alerta: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
  atencao: "bg-yellow-50 text-yellow-800 ring-1 ring-inset ring-yellow-200",
  saudavel: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
};

export function faixaRiscoFromScore(score: number, max: number): FaixaRisco {
  const pct = score / max;
  if (pct > 0.5) return "critico";
  if (pct >= 0.35) return "alerta";
  if (pct >= 0.25) return "atencao";
  return "saudavel";
}

export const scoreBadgeClasses: Record<FaixaRisco, string> = {
  critico: "bg-red-600 text-white",
  alerta: "bg-amber-500 text-white",
  atencao: "bg-yellow-400 text-yellow-950",
  saudavel: "bg-emerald-500 text-white",
};

export const severidadeClasses = {
  critica: "text-red-600 bg-red-50",
  alta: "text-amber-600 bg-amber-50",
  media: "text-yellow-700 bg-yellow-50",
} as const;
