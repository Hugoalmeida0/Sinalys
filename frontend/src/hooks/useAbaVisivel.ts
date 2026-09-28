import { useEffect, useRef } from "react";

/**
 * Mantém a aba ativa visível dentro da faixa rolável.
 *
 * Em telas estreitas as últimas abas ("Plano de ação", "Notificações") nascem
 * fora da área visível e nada indica que elas existem; sem isso, trocar de aba
 * por teclado ou por deep link deixa a seleção escondida.
 */
export function useAbaVisivel(ativa: unknown) {
  const faixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const alvo = faixa.current?.querySelector<HTMLElement>('[data-aba-ativa="true"]');
    alvo?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [ativa]);

  return faixa;
}
