import {
  HomeIcon,
  PlaybookIcon,
  ReportsIcon,
  SettingsIcon,
  UsersIcon,
  type IconProps,
} from "@/components/icons";
import type { ComponentType } from "react";

export type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<IconProps>;
};

export const navItems: NavItem[] = [
  { href: "/", label: "Início", icon: HomeIcon },
  { href: "/clientes", label: "Clientes", icon: UsersIcon },
  { href: "/playbook", label: "Playbook", icon: PlaybookIcon },
  { href: "/relatorios", label: "Relatórios", icon: ReportsIcon },
  { href: "/configuracoes", label: "Configurações", icon: SettingsIcon },
];
