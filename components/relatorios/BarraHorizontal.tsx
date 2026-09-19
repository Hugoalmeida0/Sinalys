import { formatCurrencyBRL } from "@/lib/format";

export function BarraHorizontal({
  dados,
}: {
  dados: readonly { segmento: string; valor: number }[];
}) {
  const max = Math.max(...dados.map((d) => d.valor));

  return (
    <div className="flex flex-col gap-3">
      {dados.map((d) => (
        <div key={d.segmento} className="flex items-center gap-3">
          <span className="w-20 shrink-0 text-xs text-slate-500">{d.segmento}</span>
          <div className="h-4 flex-1 rounded-full bg-slate-100">
            <div
              className="h-4 rounded-full bg-brand-royal"
              style={{ width: `${(d.valor / max) * 100}%` }}
            />
          </div>
          <span className="w-24 shrink-0 text-right text-xs font-semibold text-slate-700 tabular-nums">
            {formatCurrencyBRL(d.valor)}
          </span>
        </div>
      ))}
    </div>
  );
}
