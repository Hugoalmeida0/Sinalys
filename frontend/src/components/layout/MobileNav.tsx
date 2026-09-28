import { Link, usePathname } from "@/lib/navegacao";
import type { ComponentType } from "react";
import { MoreIcon, type IconProps } from "@/components/ui/icons";
import { SinalysMascot } from "@/components/ui/SinalysMascot";
import { useAssistente } from "@/components/assistente/AssistenteProvider";
import { navItems } from "./nav-items";

const mobileItems = [
  navItems[0],
  navItems[1],
  null, // posição central: botão do assistente
  navItems[2],
  { href: "/configuracoes", label: "Mais", icon: MoreIcon },
];

export function MobileNav() {
  const pathname = usePathname();
  const { aberto, alternar } = useAssistente();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex h-[calc(4.5rem+env(safe-area-inset-bottom))] items-center justify-around border-t border-slate-200/80 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      {mobileItems.map((item) => {
        if (item === null) {
          return (
            <button
              key="assistente"
              type="button"
              onClick={alternar}
              aria-expanded={aberto}
              data-tour="nav-assistente"
              aria-label={aberto ? "Fechar assistente" : "Falar com a Sinalys"}
              className={`flex h-14 w-14 -translate-y-4 items-center justify-center rounded-2xl bg-brand-deep shadow-[0_14px_28px_-12px_rgba(10,45,107,0.95)] ring-1 ring-white/10 transition-transform active:scale-90 ${
                aberto ? "scale-95" : ""
              }`}
            >
              <SinalysMascot variante="padrao" className="h-11 w-11 drop-shadow" />
            </button>
          );
        }

        const isActive =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            data-tour={`nav-${item.href}`}
            className="flex flex-1 flex-col items-center gap-1 py-1"
          >
            <ItemNav icone={item.icon} rotulo={item.label} ativo={isActive} />
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Conteúdo do item de navegação. A troca de rota no SPA é imediata (os dados
 * da tela chegam depois, com esqueleto), então o item acende no próprio toque.
 */
function ItemNav({
  icone: Icon,
  rotulo,
  ativo,
}: {
  icone: ComponentType<IconProps>;
  rotulo: string;
  ativo: boolean;
}) {
  const destacado = ativo;

  return (
    <>
      <span className="relative flex h-5 w-5 items-center justify-center">
        <Icon
          className={`h-5 w-5 transition-colors duration-150 ${
            destacado ? "text-brand-royal" : "text-slate-400"
          }`}
        />
      </span>
      <span
        className={`text-[11px] font-semibold transition-colors duration-150 ${
          destacado ? "text-brand-royal" : "text-slate-400"
        }`}
      >
        {rotulo}
      </span>
    </>
  );
}
