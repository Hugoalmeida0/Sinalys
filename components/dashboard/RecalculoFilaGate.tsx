"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LoaderIcon } from "@/components/ui/icons";

const CHAVE_RECALCULAR = "sinalys:recalcular-ao-entrar";

export function marcarRecalculoAoEntrar() {
  try {
    sessionStorage.setItem(CHAVE_RECALCULAR, "1");
  } catch {
  }
}

export function RecalculoFilaGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [calculando, setCalculando] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let marcado = false;
    try {
      marcado = sessionStorage.getItem(CHAVE_RECALCULAR) === "1";
      if (marcado) sessionStorage.removeItem(CHAVE_RECALCULAR);
    } catch {
    }
    if (!marcado) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCalculando(true);
    fetch("/api/motor/calcular", { method: "POST" })
      .catch(() => {
      })
      .finally(() => {
        setCalculando(false);
        startTransition(() => router.refresh());
      });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (calculando || isPending) return <FilaSkeleton />;
  return <>{children}</>;
}

function FilaSkeleton() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex items-center gap-3 rounded-2xl border border-brand-royal/20 bg-brand-pale px-4 py-3 text-sm font-medium text-brand-navy">
        <LoaderIcon className="h-4 w-4 shrink-0 animate-spin" />
        Calculando a fila de hoje…
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex flex-col gap-6">
          <div className="h-8 w-72 animate-pulse rounded-lg bg-slate-200" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200" />
            ))}
          </div>
        </div>
        <div className="h-48 animate-pulse rounded-2xl bg-slate-200" />
      </div>

      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-200" />
        ))}
      </div>
    </div>
  );
}
