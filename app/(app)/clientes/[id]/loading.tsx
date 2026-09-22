import { Skeleton, SkeletonCard, SkeletonKpi } from "@/components/ui/Skeleton";

/** Detalhe do cliente: cabeçalho com badges, faixa de abas e 4 stats. */
export default function Loading() {
  return (
    <div role="status" aria-live="polite" aria-label="Carregando cliente">
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <Skeleton className="h-4 w-40" />

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Skeleton className="h-9 w-32 rounded-xl" />
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-28 rounded-full" />
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <div className="flex gap-2 border-b border-slate-200 pb-3">
          {["w-24", "w-28", "w-20", "w-24"].map((w, i) => (
            <Skeleton key={i} className={`h-6 shrink-0 ${w}`} />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonKpi key={i} />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
            <Skeleton className="h-5 w-56 max-w-[70%]" />
            {/* Área do gráfico de evolução do score. */}
            <Skeleton className="mt-5 h-56 w-full rounded-xl" />
          </div>
          <SkeletonCard linhas={5} />
        </div>
      </div>

      <span className="sr-only">Carregando…</span>
    </div>
  );
}
