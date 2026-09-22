import { BellIcon, SearchIcon } from "@/components/ui/icons";
import { BotaoEmBreve } from "@/components/ui/BotaoEmBreve";
import type { UsuarioSessao } from "@/lib/auth/usuario";
import { BotaoSair } from "./BotaoSair";

export function Topbar({ usuario }: { usuario: UsuarioSessao }) {
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
        <BotaoEmBreve
          recurso="Notificações"
          className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100"
          aria-label="Notificações"
        >
          <BellIcon className="h-5 w-5" />
        </BotaoEmBreve>

        <div className="flex items-center gap-3 rounded-xl py-1.5 pr-2 pl-1.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-navy text-xs font-bold text-white">
            {usuario.iniciais}
          </span>
          <span className="text-left leading-tight">
            <span className="block text-sm font-bold text-brand-ink">{usuario.nome}</span>
            <span className="block text-xs text-slate-500">{usuario.cargo ?? usuario.email}</span>
          </span>
          <BotaoSair className="ml-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-brand-ink disabled:opacity-60" />
        </div>
      </div>
    </header>
  );
}
