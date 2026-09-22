"use client";

import { useEffect } from "react";

/**
 * Registra o service worker.
 *
 * É o que falta para o Chrome considerar o site instalável: sem um service
 * worker com ouvinte de `fetch`, o evento `beforeinstallprompt` não dispara e
 * o botão de instalar em um toque nunca aparece — sobra apenas a instrução
 * manual, que no iOS é o único caminho de qualquer forma.
 */
export function RegistrarServiceWorker() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    // Espera a carga terminar para não disputar banda com o conteúdo da tela.
    const registrar = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // Falhar aqui não impede o uso do app: apenas não haverá instalação
        // em um toque.
      });
    };

    if (document.readyState === "complete") registrar();
    else window.addEventListener("load", registrar, { once: true });

    return () => window.removeEventListener("load", registrar);
  }, []);

  return null;
}
