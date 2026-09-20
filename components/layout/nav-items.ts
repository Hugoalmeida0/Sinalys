import {
  HeartHandshakeIcon,
  HomeIcon,
  PlaybookIcon,
  ReportsIcon,
  SettingsIcon,
  UploadIcon,
  UsersIcon,
  type IconProps,
} from "@/components/ui/icons";
import { EXIBIR_INGESTAO, EXIBIR_PLAYBOOK, EXIBIR_RELATORIOS } from "@/lib/config/features";
import type { ComponentType } from "react";

export type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<IconProps>;
};

export const navItems: NavItem[] = [
  { href: "/", label: "Início", icon: HomeIcon },
  { href: "/clientes", label: "Clientes", icon: UsersIcon },
  { href: "/recuperacao", label: "Recuperação", icon: HeartHandshakeIcon },
  ...(EXIBIR_PLAYBOOK ? [{ href: "/playbook", label: "Playbook", icon: PlaybookIcon }] : []),
  ...(EXIBIR_RELATORIOS ? [{ href: "/relatorios", label: "Relatórios", icon: ReportsIcon }] : []),
  ...(EXIBIR_INGESTAO ? [{ href: "/ingestao", label: "Ingestão", icon: UploadIcon }] : []),
  { href: "/configuracoes", label: "Configurações", icon: SettingsIcon },
];
