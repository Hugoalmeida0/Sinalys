"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreIcon, PlusIcon } from "@/components/icons";
import { navItems } from "./nav-items";

const mobileItems = [
  navItems[0],
  navItems[1],
  { href: "#", label: "", icon: PlusIcon },
  navItems[2],
  { href: "/configuracoes", label: "Mais", icon: MoreIcon },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex h-18 items-center justify-around border-t border-slate-200/80 bg-white/95 px-2 backdrop-blur lg:hidden">
      {mobileItems.map((item, index) => {
        if (index === 2) {
          return (
            <button
              key="acao-rapida"
              type="button"
              className="flex h-13 w-13 -translate-y-4 items-center justify-center rounded-2xl bg-brand-royal text-white shadow-[0_14px_28px_-12px_rgba(37,99,235,0.95)]"
              aria-label="Nova ação"
            >
              <PlusIcon className="h-6 w-6" />
            </button>
          );
        }

        const Icon = item.icon;
        const isActive =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-1 py-1 text-[11px] font-semibold transition-colors ${
              isActive ? "text-brand-royal" : "text-slate-400"
            }`}
          >
            <Icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
