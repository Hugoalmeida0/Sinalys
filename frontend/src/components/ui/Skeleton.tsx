/**
 * Blocos de carregamento que imitam a forma do conteúdo real.
 *
 * A ideia não é "mostrar que está carregando", e sim reservar o espaço exato
 * que o conteúdo vai ocupar: quando os dados chegam, nada salta de lugar e a
 * transição parece que a tela revelou a informação em vez de ter travado.
 */

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`skeleton rounded-lg ${className}`} />;
}

/** Cabeçalho de página: título grande + linha de apoio. */
export function SkeletonPageHeader() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-9 w-64 max-w-[80%] rounded-xl" />
      <Skeleton className="h-4 w-96 max-w-full" />
    </div>
  );
}

/** Card de KPI: rótulo, número grande e rodapé. */
export function SkeletonKpi() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
      </div>
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-3 w-28" />
    </div>
  );
}

/** Linha de lista: pílula de score, nome, subtítulo e valor à direita. */
export function SkeletonLinhaLista() {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-4 w-16 shrink-0" />
    </div>
  );
}

export function SkeletonCard({ linhas = 3, className = "" }: { linhas?: number; className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card ${className}`}>
      <Skeleton className="h-5 w-48 max-w-[70%]" />
      <div className="mt-5 flex flex-col gap-3">
        {Array.from({ length: linhas }).map((_, i) => (
          // A última linha sai mais curta, como um parágrafo de verdade.
          <Skeleton key={i} className={`h-4 ${i === linhas - 1 ? "w-2/3" : "w-full"}`} />
        ))}
      </div>
    </div>
  );
}

/**
 * Casca comum das telas internas: mesmo padding e mesma largura máxima das
 * páginas reais, para o esqueleto cair exatamente onde o conteúdo vai cair.
 */
export function SkeletonPagina({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Carregando conteúdo"
      className="mx-auto flex max-w-[1600px] flex-col gap-6 p-4 sm:p-6 lg:p-8"
    >
      {children}
      <span className="sr-only">Carregando…</span>
    </div>
  );
}
