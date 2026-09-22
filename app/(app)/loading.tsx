import {
  Skeleton,
  SkeletonCard,
  SkeletonKpi,
  SkeletonPageHeader,
  SkeletonPagina,
} from "@/components/ui/Skeleton";

/**
 * Fallback padrão das telas internas. Cobre qualquer rota do grupo (app) que
 * não tenha um loading.tsx próprio, para que nenhuma navegação fique sem
 * resposta visual enquanto o server component busca os dados.
 */
export default function Loading() {
  return (
    <SkeletonPagina>
      <SkeletonPageHeader />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonKpi key={i} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-card">
          <div className="border-b border-slate-100 p-5">
            <Skeleton className="h-5 w-52 max-w-[70%]" />
          </div>
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-4">
                <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-4 w-16 shrink-0" />
              </div>
            ))}
          </div>
        </div>

        <SkeletonCard linhas={4} />
      </div>
    </SkeletonPagina>
  );
}
