import type { ReactNode } from "react";
import { AssistenteProvider } from "@/components/assistente/AssistenteProvider";
import { AssistenteWidget } from "@/components/assistente/AssistenteWidget";
import { MobileHeader } from "./MobileHeader";
import { MobileNav } from "./MobileNav";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <AssistenteProvider>
      <div className="flex min-h-screen bg-brand-darkest">
        <Sidebar />

        <div className="app-canvas flex min-w-0 flex-1 flex-col">
          <MobileHeader />
          <Topbar />

          <main className="flex-1 pb-24 lg:pb-0">{children}</main>
        </div>

        <MobileNav />
        <AssistenteWidget />
      </div>
    </AssistenteProvider>
  );
}
