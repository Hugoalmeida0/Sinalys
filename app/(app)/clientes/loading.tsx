import {
  Skeleton,
  SkeletonKpi,
  SkeletonLinhaLista,
  SkeletonPageHeader,
  SkeletonPagina,
} from "@/components/ui/Skeleton";

/** Carteira de clientes: resumo em 4 cards + filtros + lista paginada. */
export default function Loading() {
  return (
    <SkeletonPagina>
      <SkeletonPageHeader />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonKpi key={i} />
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-card">
        <div className="flex flex-col gap-3 p-5 xl:flex-row xl:items-center">
          <Skeleton className="h-11 w-full rounded-xl xl:max-w-sm" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:ml-auto xl:flex">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-11 rounded-xl xl:w-44" />
            ))}
          </div>
        </div>

        <div className="divide-y divide-slate-100 border-t border-slate-100">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonLinhaLista key={i} />
          ))}
        </div>
      </div>
    </SkeletonPagina>
  );
}
