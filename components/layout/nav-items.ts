import {
  HomeIcon,
  PlaybookIcon,
  ReportsIcon,
  SettingsIcon,
  UploadIcon,
  UsersIcon,
  type IconProps,
} from "@/components/icons";
import type { ComponentType } from "react";

export type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<IconProps>;
};

// Atenção: components/layout/MobileNav.tsx referencia navItems[0..2] por
// índice (Início, Clientes, Playbook) — inserir novos itens depois do
// índice 2 para não deslocar a navegação inferior no mobile.
export const navItems: NavItem[] = [
  { href: "/", label: "Início", icon: HomeIcon },
  { href: "/clientes", label: "Clientes", icon: UsersIcon },
  { href: "/playbook", label: "Playbook", icon: PlaybookIcon },
  { href: "/relatorios", label: "Relatórios", icon: ReportsIcon },
  { href: "/ingestao", label: "Ingestão", icon: UploadIcon },
  { href: "/configuracoes", label: "Configurações", icon: SettingsIcon },
];
