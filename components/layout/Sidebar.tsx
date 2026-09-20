"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "./nav-items";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="navy-surface sticky top-0 hidden h-screen w-64 shrink-0 flex-col self-start overflow-hidden lg:flex">
      <OndaDecorativa />

      <div className="relative flex h-16 items-center px-6 pt-4">
        <Image
          src="/sinalys-logo-horizontal-white.png"
          alt="Sinalys"
          width={296}
          height={106}
          priority
          className="h-9 w-auto"
        />
      </div>

      <nav className="relative flex flex-1 flex-col gap-1.5 px-4 py-6">
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
              aria-current={isActive ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition-colors ${
                isActive
                  ? "bg-brand-royal text-white shadow-[0_10px_24px_-12px_rgba(37,99,235,0.95)]"
                  : "text-blue-100/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="relative px-6 pb-7">
        <p className="text-sm font-bold text-white">Sinalys</p>
        <p className="mt-0.5 text-xs leading-snug text-blue-100/60">
          Dados que
          <br />
          antecipam o futuro.
        </p>
      </div>
    </aside>
  );
}

function OndaDecorativa() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 256 320"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-80 w-full opacity-70"
      fill="none"
    >
      <path
        d="M-20 300C40 250 60 190 150 170c70-16 100-50 126-96"
        stroke="#60a5fa"
        strokeOpacity="0.32"
        strokeWidth="1.6"
      />
      <path
        d="M-20 318C50 268 66 210 156 190c70-16 104-52 130-100"
        stroke="#60a5fa"
        strokeOpacity="0.22"
        strokeWidth="1.6"
      />
      <path
        d="M-30 336C44 292 72 232 162 212c72-16 108-54 134-104"
        stroke="#93c5fd"
        strokeOpacity="0.14"
        strokeWidth="1.6"
      />
    </svg>
  );
}
