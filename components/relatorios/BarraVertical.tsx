export function BarraVertical({
  dados,
}: {
  dados: readonly { mes: string; score: number }[];
}) {
  const max = Math.max(...dados.map((d) => d.score));

  return (
    <div className="flex h-40 items-end gap-3 sm:gap-4">
      {dados.map((d, index) => {
        const isLast = index === dados.length - 1;
        return (
          <div key={d.mes} className="flex flex-1 flex-col items-center gap-2">
            <div className="relative flex h-32 w-full max-w-6 items-end justify-center">
              {isLast && (
                <span className="absolute -top-5 text-xs font-semibold text-brand-royal tabular-nums">
                  {d.score.toFixed(1)}
                </span>
              )}
              <div
                className={`w-full rounded-t-[4px] ${isLast ? "bg-brand-royal" : "bg-brand-light/60"}`}
                style={{ height: `${(d.score / max) * 100}%` }}
              />
            </div>
            <span className="text-xs text-slate-400">{d.mes}</span>
          </div>
        );
      })}
    </div>
  );
}
