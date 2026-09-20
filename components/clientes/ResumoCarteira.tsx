import {
  AlertTriangleIcon,
  CircleCheckIcon,
  InfoIcon,
  type IconProps,
} from "@/components/icons";
import type { FaixaRisco } from "@/lib/mock-data";
import {
  faixaRiscoIconClasses,
  faixaRiscoLabelCurto,
  faixaRiscoTextClasses,
} from "@/lib/risk";
import type { ComponentType } from "react";

const icones: Record<FaixaRisco, ComponentType<IconProps>> = {
  critico: AlertTriangleIcon,
  alerta: AlertTriangleIcon,
  atencao: InfoIcon,
  saudavel: CircleCheckIcon,
};

export type ResumoFaixa = { faixa: FaixaRisco; total: number; percentual: number };

export function ResumoCarteira({ resumo }: { resumo: ResumoFaixa[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {resumo.map(({ faixa, total, percentual }) => {
        const Icon = icones[faixa];

        return (
          <div
            key={faixa}
            className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card sm:p-5"
          >
            <div className="flex items-center gap-3.5">
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${faixaRiscoIconClasses[faixa]}`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-2xl leading-none font-bold text-brand-ink">{total}</p>
                <p className="mt-1 text-sm font-medium text-slate-600">
                  {faixaRiscoLabelCurto[faixa]}
                </p>
              </div>
            </div>
            <p className={`mt-3 text-xs font-semibold ${faixaRiscoTextClasses[faixa]}`}>
              {percentual}% da carteira
            </p>
          </div>
        );
      })}
    </div>
  );
}
