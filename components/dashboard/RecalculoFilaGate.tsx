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

  /*
   * O painel que o servidor já entregou fica na tela durante o recálculo; o
   * `router.refresh()` do fim só troca os números. O aviso é fixo, fora do
   * fluxo: uma faixa no topo empurraria a página ao sumir, e o Safari do iPhone
   * não compensa esse salto na rolagem de quem já desceu até a fila.
   */
  return (
    <>
      {children}
      {(calculando || isPending) && (
        <div
          role="status"
          className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] left-1/2 z-30 flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-2.5 rounded-full border border-brand-royal/20 bg-brand-pale px-4 py-2.5 text-sm font-medium whitespace-nowrap text-brand-navy shadow-float lg:bottom-6"
        >
          <LoaderIcon className="h-4 w-4 shrink-0 animate-spin" />
          Atualizando a fila…
        </div>
      )}
    </>
  );
}
