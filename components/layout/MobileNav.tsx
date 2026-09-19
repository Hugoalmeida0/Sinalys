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
    <nav className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-center justify-around border-t border-slate-200 bg-white px-2 lg:hidden">
      {mobileItems.map((item, index) => {
        if (index === 2) {
          return (
            <button
              key="acao-rapida"
              type="button"
              className="flex h-12 w-12 -translate-y-3 items-center justify-center rounded-full bg-brand-royal text-white shadow-lg shadow-brand-royal/30"
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
            className={`flex flex-1 flex-col items-center gap-1 py-1 text-[11px] font-medium ${
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
