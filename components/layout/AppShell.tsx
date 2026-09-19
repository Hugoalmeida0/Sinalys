import type { ReactNode } from "react";
import { MobileHeader } from "./MobileHeader";
import { MobileNav } from "./MobileNav";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader />
        <Topbar />

        <main className="flex-1 pb-20 lg:pb-0">{children}</main>
      </div>

      <MobileNav />
    </div>
  );
}
