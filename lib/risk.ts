import type { FaixaRisco } from "./mock-data";

export const faixaRiscoLabel: Record<FaixaRisco, string> = {
  critico: "Risco crítico",
  alerta: "Risco em alerta",
  atencao: "Atenção",
  saudavel: "Saudável",
};

/** Rótulo curto, usado em cards de resumo e chips compactos. */
export const faixaRiscoLabelCurto: Record<FaixaRisco, string> = {
  critico: "Crítico",
  alerta: "Alerta",
  atencao: "Atenção",
  saudavel: "Saudável",
};

export const faixaRiscoClasses: Record<FaixaRisco, string> = {
  critico: "bg-red-600 text-white",
  alerta: "bg-amber-500 text-white",
  atencao: "bg-sky-500 text-white",
  saudavel: "bg-emerald-500 text-white",
};

export const faixaRiscoSoftClasses: Record<FaixaRisco, string> = {
  critico: "bg-red-50 text-red-600 ring-1 ring-inset ring-red-100",
  alerta: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-100",
  atencao: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-100",
  saudavel: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100",
};

/** Cor do texto de destaque (percentuais, números grandes). */
export const faixaRiscoTextClasses: Record<FaixaRisco, string> = {
  critico: "text-red-600",
  alerta: "text-amber-600",
  atencao: "text-sky-600",
  saudavel: "text-emerald-600",
};

/** Círculo de ícone dos cards de resumo da carteira. */
export const faixaRiscoIconClasses: Record<FaixaRisco, string> = {
  critico: "bg-red-50 text-red-500 ring-1 ring-inset ring-red-100",
  alerta: "bg-amber-50 text-amber-500 ring-1 ring-inset ring-amber-100",
  atencao: "bg-sky-50 text-sky-500 ring-1 ring-inset ring-sky-100",
  saudavel: "bg-emerald-50 text-emerald-500 ring-1 ring-inset ring-emerald-100",
};

export function faixaRiscoFromScore(score: number, max: number): FaixaRisco {
  const pct = score / max;
  if (pct > 0.5) return "critico";
  if (pct >= 0.35) return "alerta";
  if (pct >= 0.25) return "atencao";
  return "saudavel";
}

/** Pílula circular do score — tons sólidos e escuros, como no design. */
export const scoreBadgeClasses: Record<FaixaRisco, string> = {
  critico: "bg-[#9f1239] text-white",
  alerta: "bg-[#d97706] text-white",
  atencao: "bg-brand-royal text-white",
  saudavel: "bg-emerald-600 text-white",
};

export const severidadeClasses = {
  critica: "text-red-600 bg-red-50",
  alta: "text-amber-600 bg-amber-50",
  media: "text-sky-600 bg-sky-50",
} as const;

/** Rótulo curto do chip de severidade. */
export const severidadeLabel = {
  critica: "Crítico",
  alta: "Alto",
  media: "Médio",
} as const;

/** Forma nominal, usada em "Severidade <nome>". */
export const severidadeNome = {
  critica: "Crítica",
  alta: "Alta",
  media: "Média",
} as const;

/** Chip à direita de cada sinal de risco na tela de detalhe. */
export const severidadeChipClasses = {
  critica: "bg-red-50 text-red-600 ring-1 ring-inset ring-red-100",
  alta: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-100",
  media: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-100",
} as const;
