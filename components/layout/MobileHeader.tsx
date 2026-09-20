"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BellIcon, MenuIcon, XIcon } from "@/components/ui/icons";
import type { UsuarioSessao } from "@/lib/auth/usuario";
import { BotaoSair } from "./BotaoSair";
import { navItems } from "./nav-items";

export function MobileHeader({ usuario }: { usuario: UsuarioSessao }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <header className="navy-surface flex h-16 items-center justify-between px-4 lg:hidden">
        <Image
          src="/sinalys-logo-horizontal-white.png"
          alt="Sinalys"
          width={296}
          height={106}
          priority
          className="h-7 w-auto"
        />

        <div className="flex items-center gap-1">
          <button
            type="button"
            className="relative flex h-10 w-10 items-center justify-center rounded-full text-blue-100/80"
            aria-label="Notificações"
          >
            <BellIcon className="h-5 w-5" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-[#0b1e48]" />
          </button>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-white"
            aria-label="Abrir menu"
          >
            <MenuIcon className="h-5 w-5" />
          </button>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            className="absolute inset-0 bg-slate-900/50"
            onClick={() => setOpen(false)}
          />
          <div className="navy-surface absolute inset-y-0 right-0 flex w-72 max-w-[82%] flex-col shadow-float">
            <div className="flex h-16 items-center justify-between px-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-royal text-[11px] font-bold text-white">
                  {usuario.iniciais}
                </span>
                <span className="leading-tight">
                  <span className="block text-sm font-bold text-white">{usuario.nome}</span>
                  <span className="block text-[11px] text-blue-100/60">
                    {usuario.cargo ?? usuario.email}
                  </span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-blue-100/70 hover:bg-white/10"
                aria-label="Fechar"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex flex-1 flex-col gap-1.5 p-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition-colors ${
                      isActive
                        ? "bg-brand-royal text-white"
                        : "text-blue-100/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="px-4 pb-2">
              <BotaoSair className="w-full rounded-xl px-3.5 py-3 text-left text-sm font-semibold text-blue-100/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-60" />
            </div>

            <div className="px-6 pb-7">
              <p className="text-sm font-bold text-white">Sinalys</p>
              <p className="mt-0.5 text-xs leading-snug text-blue-100/60">
                Dados que antecipam o futuro.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
