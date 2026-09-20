import {
  HeartHandshakeIcon,
  HomeIcon,
  PlaybookIcon,
  ReportsIcon,
  SettingsIcon,
  UploadIcon,
  UsersIcon,
  type IconProps,
} from "@/components/icons";
import { EXIBIR_INGESTAO, EXIBIR_PLAYBOOK, EXIBIR_RELATORIOS } from "@/lib/config/features";
import type { ComponentType } from "react";

export type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<IconProps>;
};

// Atenção: components/layout/MobileNav.tsx referencia navItems[0..2] por
// índice (Início, Clientes, 3º item) — o 3º item hoje é Recuperação. Ligar
// Playbook/Ingestão/Relatórios de volta (lib/config/features.ts) desloca essa
// posição; revisar MobileNav se isso mudar a ordem esperada.
export const navItems: NavItem[] = [
  { href: "/", label: "Início", icon: HomeIcon },
  { href: "/clientes", label: "Clientes", icon: UsersIcon },
  { href: "/recuperacao", label: "Recuperação", icon: HeartHandshakeIcon },
  ...(EXIBIR_PLAYBOOK ? [{ href: "/playbook", label: "Playbook", icon: PlaybookIcon }] : []),
  ...(EXIBIR_RELATORIOS ? [{ href: "/relatorios", label: "Relatórios", icon: ReportsIcon }] : []),
  ...(EXIBIR_INGESTAO ? [{ href: "/ingestao", label: "Ingestão", icon: UploadIcon }] : []),
  { href: "/configuracoes", label: "Configurações", icon: SettingsIcon },
];
