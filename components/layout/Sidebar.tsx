"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "./nav-items";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
      <div className="flex h-16 items-center gap-2 px-6">
        <Image
          src="/sinalys-symbol-color.png"
          alt=""
          width={28}
          height={28}
          className="h-7 w-7"
        />
        <span className="text-lg font-bold text-brand-navy">Sinalys</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-brand-pale text-brand-navy"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon
                className={`h-5 w-5 ${isActive ? "text-brand-royal" : "text-slate-400"}`}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 p-4">
        <p className="text-[11px] leading-snug text-slate-400">
          Sinalys é um produto{" "}
          <span className="font-semibold text-slate-500">Globalsys</span>
        </p>
      </div>
    </aside>
  );
}
