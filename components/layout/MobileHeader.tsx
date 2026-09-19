"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { BellIcon, MenuIcon, XIcon } from "@/components/icons";
import { navItems } from "./nav-items";

export function MobileHeader() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
        <div className="flex items-center gap-2">
          <Image
            src="/sinalys-symbol-color.png"
            alt=""
            width={24}
            height={24}
            className="h-6 w-6"
          />
          <span className="text-base font-bold text-brand-navy">Sinalys</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-500"
            aria-label="Notificações"
          >
            <BellIcon className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
          </button>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600"
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
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 flex w-72 max-w-[80%] flex-col bg-white shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-slate-100 px-4">
              <span className="text-sm font-semibold text-slate-900">Menu</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
                aria-label="Fechar"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-1 flex-col gap-1 p-3">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    <Icon className="h-5 w-5 text-slate-400" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
