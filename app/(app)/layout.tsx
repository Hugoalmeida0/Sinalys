import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { obterUsuarioSessao } from "@/lib/auth/usuario";

export default async function AppGroupLayout({ children }: { children: ReactNode }) {
  const usuario = await obterUsuarioSessao();
  if (!usuario) redirect("/login");

  return <AppShell usuario={usuario}>{children}</AppShell>;
}
