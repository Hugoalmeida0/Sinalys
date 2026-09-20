import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { obterUsuarioSessao } from "@/lib/auth/usuario";

export default async function AppGroupLayout({ children }: { children: ReactNode }) {
  // O proxy.ts já bloqueia sem sessão; este redirect é a segunda barreira
  // (cookie inválido/expirado entre a checagem do proxy e a renderização).
  const usuario = await obterUsuarioSessao();
  if (!usuario) redirect("/login");

  return <AppShell usuario={usuario}>{children}</AppShell>;
}
