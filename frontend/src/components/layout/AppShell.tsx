import type { ReactNode } from "react";
import { AssistenteProvider } from "@/components/assistente/AssistenteProvider";
import { AssistenteWidget } from "@/components/assistente/AssistenteWidget";
import { TourPrimeiraVisita } from "@/components/tour/TourPrimeiraVisita";
import type { UsuarioSessao } from "@/lib/auth/sessao";
import { MobileHeader } from "./MobileHeader";
import { MobileNav } from "./MobileNav";
import { RolarAoTopo } from "./RolarAoTopo";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppShell({ usuario, children }: { usuario: UsuarioSessao; children: ReactNode }) {
  return (
    <AssistenteProvider>
      <RolarAoTopo />

      <div className="flex min-h-screen bg-brand-darkest">
        <Sidebar />

        <div className="app-canvas flex min-w-0 flex-1 flex-col">
          <MobileHeader usuario={usuario} />
          <Topbar usuario={usuario} />

          {/* Espaço para a navegação inferior fixa (4.5rem) + a safe area do aparelho. */}
          <main className="flex-1 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-0">
            {children}
          </main>
        </div>

        <MobileNav />
        <AssistenteWidget nomeUsuario={usuario.nome} />
      </div>

      <TourPrimeiraVisita />
    </AssistenteProvider>
  );
}
