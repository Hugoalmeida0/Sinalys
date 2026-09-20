import { BellIcon, ChevronDownIcon, SearchIcon } from "@/components/icons";
import { usuarioAtual } from "@/lib/mock-data";

export function Topbar() {
  return (
    <header className="hidden h-18 shrink-0 items-center gap-6 border-b border-slate-200/70 bg-white px-6 lg:flex">
      <div className="relative w-full max-w-lg">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          placeholder="Buscar cliente, segmento ou código..."
          className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-3 pr-4 pl-11 text-sm text-slate-700 transition-colors placeholder:text-slate-400 focus:border-brand-royal focus:bg-white focus:outline-none"
        />
      </div>

      <div className="ml-auto flex items-center gap-5">
        <button
          type="button"
          className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100"
          aria-label="Notificações"
        >
          <BellIcon className="h-5 w-5" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
        </button>

        <button
          type="button"
          className="flex items-center gap-3 rounded-xl py-1.5 pr-2 pl-1.5 transition-colors hover:bg-slate-50"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-navy text-xs font-bold text-white">
            {usuarioAtual.iniciais}
          </span>
          <span className="text-left leading-tight">
            <span className="block text-sm font-bold text-brand-ink">{usuarioAtual.nome}</span>
            <span className="block text-xs text-slate-500">{usuarioAtual.cargo}</span>
          </span>
          <ChevronDownIcon className="h-4 w-4 text-slate-400" />
        </button>
      </div>
    </header>
  );
}
