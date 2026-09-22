"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Garante que cada rota comece no topo.
 *
 * Se a pessoa rolou até o fim da lista de clientes e toca em "Início", abrir a
 * tela nova já rolada passa a impressão de que carregou errado. O App Router
 * costuma cuidar disso, mas com fronteiras de Suspense a altura muda depois da
 * troca de rota — e aí a restauração pode parar no lugar errado.
 */
export function RolarAoTopo() {
  const caminho = usePathname();

  useEffect(() => {
    // `instant` evita competir com a animação de entrada dos cards.
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [caminho]);

  return null;
}
