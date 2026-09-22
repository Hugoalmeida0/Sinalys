"use client";

import { useEffect, useRef, useState } from "react";

function movimentoReduzido() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

/**
 * Anima um número de zero até o valor final.
 *
 * Um KPI que sobe até o total comunica que o número foi calculado, não
 * digitado. Quem pediu menos movimento no sistema recebe o valor final de
 * imediato, sem animação nenhuma.
 */
export function useContagem(alvo: number, duracaoMs = 700) {
  // `null` = a animação ainda não começou; o valor exibido vem do fallback
  // abaixo, evitando qualquer setState síncrono dentro do efeito.
  const [valor, setValor] = useState<number | null>(null);
  const quadro = useRef<number | null>(null);

  useEffect(() => {
    if (movimentoReduzido() || !Number.isFinite(alvo)) return;

    const inicio = performance.now();
    // easeOutCubic: arranca rápido e assenta suave no valor final.
    const suavizar = (t: number) => 1 - Math.pow(1 - t, 3);

    const passo = (agora: number) => {
      const progresso = Math.min(1, (agora - inicio) / duracaoMs);
      setValor(alvo * suavizar(progresso));
      if (progresso < 1) quadro.current = requestAnimationFrame(passo);
    };

    quadro.current = requestAnimationFrame(passo);
    return () => {
      if (quadro.current !== null) cancelAnimationFrame(quadro.current);
    };
  }, [alvo, duracaoMs]);

  if (valor !== null) return valor;
  // Antes do primeiro quadro: zero quando vai animar, valor final quando não.
  return movimentoReduzido() || !Number.isFinite(alvo) ? alvo : 0;
}
