import { BellIcon, SearchIcon } from "@/components/icons";
import { usuarioAtual } from "@/lib/mock-data";

export function Topbar() {
  return (
    <header className="hidden h-16 shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-6 lg:flex">
      <div className="relative w-full max-w-sm">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          placeholder="Buscar cliente..."
          className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-3 pl-9 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-royal focus:bg-white focus:outline-none"
        />
      </div>

      <div className="ml-auto flex items-center gap-4">
        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
          aria-label="Notificações"
        >
          <BellIcon className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-navy text-xs font-semibold text-white">
            {usuarioAtual.iniciais}
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-slate-900">{usuarioAtual.nome}</p>
            <p className="text-xs text-slate-500">{usuarioAtual.cargo}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
