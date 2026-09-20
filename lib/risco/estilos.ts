import type { FaixaRisco, Severidade } from "./faixa";

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

export const faixaRiscoTextClasses: Record<FaixaRisco, string> = {
  critico: "text-red-600",
  alerta: "text-amber-600",
  atencao: "text-sky-600",
  saudavel: "text-emerald-600",
};

export const faixaRiscoIconClasses: Record<FaixaRisco, string> = {
  critico: "bg-red-50 text-red-500 ring-1 ring-inset ring-red-100",
  alerta: "bg-amber-50 text-amber-500 ring-1 ring-inset ring-amber-100",
  atencao: "bg-sky-50 text-sky-500 ring-1 ring-inset ring-sky-100",
  saudavel: "bg-emerald-50 text-emerald-500 ring-1 ring-inset ring-emerald-100",
};

export const scoreBadgeClasses: Record<FaixaRisco, string> = {
  critico: "bg-[#9f1239] text-white",
  alerta: "bg-[#d97706] text-white",
  atencao: "bg-brand-royal text-white",
  saudavel: "bg-emerald-600 text-white",
};

export const severidadeClasses: Record<Severidade, string> = {
  critica: "text-red-600 bg-red-50",
  alta: "text-amber-600 bg-amber-50",
  media: "text-sky-600 bg-sky-50",
};

export const severidadeChipClasses: Record<Severidade, string> = {
  critica: "bg-red-50 text-red-600 ring-1 ring-inset ring-red-100",
  alta: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-100",
  media: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-100",
};
