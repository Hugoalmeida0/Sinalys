"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

/**
 * Copia o link público de Health Score (app/health/[token]) para a área de
 * transferência — o jeito mais simples de "fechar o loop com o cliente
 * final" sem depender de e-mail transacional (fora do escopo gratuito do MVP).
 */
export function CompartilharHealthScore({ token, baseUrl }: { token: string; baseUrl: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiarLink() {
    const url = `${baseUrl}/health/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      window.prompt("Copie o link do Health Score:", url);
    }
  }

  return (
    <Button size="sm" variant="secondary" onClick={copiarLink}>
      {copiado ? "Link copiado!" : "Compartilhar com o cliente"}
    </Button>
  );
}
