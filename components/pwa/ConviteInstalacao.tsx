"use client";

import { useEffect, useState } from "react";
import { XIcon } from "@/components/ui/icons";
import { useSuporteNavegador } from "@/hooks/useSuporteNavegador";
import { vibrar } from "@/lib/ui/tatil";

/**
 * Convite para levar o app à tela de início.
 *
 * Android expõe `beforeinstallprompt` e permite instalar com um toque. O iOS
 * não expõe nada equivalente, então lá o caminho é instruir: Compartilhar →
 * Adicionar à Tela de Início. Em quem já está em modo standalone, ou em
 * desktop, o convite simplesmente não aparece.
 */

type EventoInstalacao = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const CHAVE_DISPENSADO = "sinalys:convite-instalacao-dispensado";

function jaDispensou() {
  try {
    return localStorage.getItem(CHAVE_DISPENSADO) === "1";
  } catch {
    return false; // armazenamento bloqueado: mostra assim mesmo
  }
}

export function ConviteInstalacao() {
  // Capacidades do aparelho, lidas sem divergir na hidratação.
  const ehIOS = useSuporteNavegador(() => /iPad|iPhone|iPod/.test(navigator.userAgent));
  const dispensadoAntes = useSuporteNavegador(jaDispensou);
  const jaInstalado = useSuporteNavegador(
    () =>
      window.matchMedia?.("(display-mode: standalone)").matches === true ||
      (window.navigator as { standalone?: boolean }).standalone === true
  );
  // Instalar só faz sentido no celular.
  const ehCelular = useSuporteNavegador(
    () => /iPad|iPhone|iPod|Android/.test(navigator.userAgent) || window.innerWidth < 900
  );

  const [evento, setEvento] = useState<EventoInstalacao | null>(null);
  const [dispensadoAgora, setDispensadoAgora] = useState(false);

  useEffect(() => {
    // setState aqui acontece dentro da callback do evento, não no corpo do
    // efeito — não provoca render em cascata.
    const aoPoderInstalar = (e: Event) => {
      e.preventDefault();
      setEvento(e as EventoInstalacao);
    };

    window.addEventListener("beforeinstallprompt", aoPoderInstalar);
    return () => window.removeEventListener("beforeinstallprompt", aoPoderInstalar);
  }, []);

  function dispensar() {
    setDispensadoAgora(true);
    try {
      localStorage.setItem(CHAVE_DISPENSADO, "1");
    } catch {
      /* sem persistência, reaparece na próxima visita */
    }
  }

  async function instalar() {
    if (!evento) return;
    vibrar("toque");
    await evento.prompt();
    const { outcome } = await evento.userChoice;
    setEvento(null);
    if (outcome === "accepted") dispensar();
  }

  const visivel =
    ehCelular &&
    !jaInstalado &&
    !dispensadoAntes &&
    !dispensadoAgora &&
    // No iOS não há evento para esperar: o convite é a própria instrução.
    (ehIOS || evento !== null);

  if (!visivel) return null;

  return (
    <div className="mt-6 rounded-2xl border border-puro/15 bg-puro/10 p-4 text-left backdrop-blur">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-royal/90 text-base"
        >
          ⬇️
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-puro">Quer melhorar a experiência?</p>
          <p className="mt-1 text-xs leading-relaxed text-blue-50/85">
            {ehIOS ? (
              <>
                Toque em <strong className="font-semibold text-puro">Compartilhar</strong> e depois
                em <strong className="font-semibold text-puro">Adicionar à Tela de Início</strong>{" "}
                para abrir em tela cheia, sem a barra do navegador.
              </>
            ) : (
              <>
                Leve o Sinalys para a sua tela de início e abra em tela cheia, sem a barra do
                navegador.
              </>
            )}
          </p>

          {!ehIOS && evento && (
            <button
              type="button"
              onClick={instalar}
              className="mt-3 inline-flex min-h-11 items-center justify-center rounded-xl bg-puro px-4 py-2 text-xs font-bold text-brand-navy transition-colors hover:bg-blue-50"
            >
              Adicionar à tela de início
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={dispensar}
          aria-label="Dispensar convite"
          className="-mt-1 -mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-blue-100/70 transition-colors hover:bg-puro/10 hover:text-puro"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
