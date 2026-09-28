import { Skeleton, SkeletonCard, SkeletonKpi, SkeletonLinhaLista, SkeletonPageHeader, SkeletonPagina } from "@/components/ui/Skeleton";

/**
 * Esqueletos das telas internas: mesma casca e mesmas proporções das páginas
 * reais, para o conteúdo cair exatamente onde o esqueleto estava.
 */

export function CarregandoPainel() {
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

export function CarregandoClientes() {
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

export function CarregandoCliente() {
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
        <div className="flex gap-2 overflow-hidden border-b border-slate-200 pb-3">
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
            <Skeleton className="mt-5 h-56 w-full rounded-xl" />
          </div>
          <SkeletonCard linhas={5} />
        </div>
      </div>

      <span className="sr-only">Carregando…</span>
    </div>
  );
}

/** Falha ao carregar uma tela: mostra o motivo e deixa tentar de novo. */
export function ErroCarregamento({ mensagem, aoTentarNovamente }: { mensagem: string; aoTentarNovamente: () => void }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-3 p-10 text-center">
      <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{mensagem}</p>
      <button
        type="button"
        onClick={aoTentarNovamente}
        className="rounded-xl px-4 py-2 text-sm font-semibold text-brand-royal ring-1 ring-brand-royal/30 ring-inset hover:bg-brand-pale"
      >
        Tentar novamente
      </button>
    </div>
  );
}
