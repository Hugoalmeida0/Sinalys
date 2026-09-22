"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { XIcon } from "@/components/ui/icons";
import { vibrar } from "@/lib/ui/tatil";

/**
 * Apresentação em três toques, só na primeira visita.
 *
 * Quem abre o sistema pela primeira vez não sabe onde olhar, e o silêncio
 * inicial é o que faz a pessoa concluir "é mais um dashboard". Cada passo
 * aponta para um elemento real da tela — marcado com `data-tour` — em vez de
 * descrever a interface por cima dela.
 */

type Passo = {
  alvo: string;
  titulo: string;
  texto: string;
  /** Onde encaixar o cartão em relação ao elemento destacado. */
  posicao: "abaixo" | "acima";
};

const PASSOS: Passo[] = [
  {
    alvo: '[data-tour="fila"]',
    titulo: "Comece por aqui",
    texto:
      "Esta é a fila do dia: os clientes ordenados por risco vezes impacto financeiro. O topo é quem merece atenção agora.",
    posicao: "acima",
  },
  {
    alvo: '[data-tour="assistente"]',
    titulo: "Pergunte em português",
    texto:
      "A Sinalys responde sobre a sua carteira com base nos dados reais — quem está em risco, por quê, e o que fazer.",
    posicao: "acima",
  },
  {
    alvo: '[data-tour="clientes"]',
    titulo: "Entre num cliente",
    texto:
      "No detalhe você vê a evolução do score, os sinais que pesaram e um simulador de cenários.",
    posicao: "acima",
  },
];

const CHAVE = "sinalys:tour-concluido";
const MARGEM = 8;

export function TourPrimeiraVisita() {
  const [indice, setIndice] = useState<number | null>(null);
  const [area, setArea] = useState<DOMRect | null>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(CHAVE) === "1") return;
    } catch {
      return; // sem armazenamento, não insiste a cada navegação
    }
    // Espera a tela assentar: os alvos do primeiro passo só existem depois que
    // a fila do dia sai do esqueleto.
    const t = setTimeout(() => setIndice(0), 1200);
    return () => clearTimeout(t);
  }, []);

  const encerrar = useCallback(() => {
    setIndice(null);
    try {
      localStorage.setItem(CHAVE, "1");
    } catch {
      /* segue sem persistir */
    }
  }, []);

  const passo = indice === null ? null : PASSOS[indice];

  // Mede o alvo antes de pintar, e remede em scroll/resize.
  useLayoutEffect(() => {
    if (!passo) return;

    const medir = () => {
      const el = document.querySelector(passo.alvo);
      if (!el) return setArea(null);
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      setArea(el.getBoundingClientRect());
    };

    medir();
    const t = setTimeout(medir, 420); // depois do scroll suave
    window.addEventListener("resize", medir);
    window.addEventListener("scroll", medir, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", medir);
      window.removeEventListener("scroll", medir, true);
    };
  }, [passo]);

  useEffect(() => {
    if (indice === null) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") encerrar();
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [indice, encerrar]);

  if (indice === null || !passo) return null;

  function avancar() {
    vibrar("toque");
    if (indice === null) return;
    if (indice >= PASSOS.length - 1) encerrar();
    else setIndice(indice + 1);
  }

  const ultimo = indice === PASSOS.length - 1;

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="Apresentação rápida">
      {/* Tocar fora avança, como em qualquer tour. */}
      <button
        type="button"
        aria-label="Avançar"
        onClick={avancar}
        className="absolute inset-0 h-full w-full cursor-default bg-veu/65"
      />

      {/* Holofote: um anel recortando o elemento real, sem escondê-lo. */}
      {area && (
        <span
          aria-hidden
          className="pointer-events-none absolute rounded-2xl ring-4 ring-brand-cyan transition-all duration-300"
          style={{
            top: area.top - MARGEM,
            left: area.left - MARGEM,
            width: area.width + MARGEM * 2,
            height: area.height + MARGEM * 2,
            boxShadow: "0 0 0 9999px rgba(2, 8, 23, 0.65)",
          }}
        />
      )}

      <div
        className="absolute inset-x-4 max-w-sm rounded-2xl bg-white p-4 shadow-float sm:left-1/2 sm:-translate-x-1/2"
        style={posicionar(area, passo.posicao)}
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-brand-ink">{passo.titulo}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{passo.texto}</p>
          </div>
          <button
            type="button"
            onClick={encerrar}
            aria-label="Pular apresentação"
            className="-mt-1 -mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5" aria-label={`Passo ${indice + 1} de ${PASSOS.length}`}>
            {PASSOS.map((_, i) => (
              <span
                key={i}
                aria-hidden
                className={`h-1.5 rounded-full transition-all ${
                  i === indice ? "w-5 bg-brand-royal" : "w-1.5 bg-slate-200"
                }`}
              />
            ))}
          </span>

          <span className="flex items-center gap-1">
            <button
              type="button"
              onClick={encerrar}
              className="min-h-11 rounded-xl px-3 text-xs font-semibold text-slate-400 transition-colors hover:text-slate-600"
            >
              Pular
            </button>
            <button
              type="button"
              onClick={avancar}
              className="min-h-11 rounded-xl bg-brand-royal px-4 text-xs font-bold text-puro transition-colors hover:bg-[#1d4ed8]"
            >
              {ultimo ? "Entendi" : "Próximo"}
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}

/** Encaixa o cartão perto do alvo sem sair da tela. */
function posicionar(area: DOMRect | null, preferencia: Passo["posicao"]): React.CSSProperties {
  if (typeof window === "undefined" || !area) {
    return { bottom: "12vh" };
  }

  const ALTURA_CARTAO = 190;
  const alturaVp = window.innerHeight;

  const cabeAcima = area.top - MARGEM - ALTURA_CARTAO > 12;
  const cabeAbaixo = area.bottom + MARGEM + ALTURA_CARTAO < alturaVp - 12;

  if (preferencia === "acima" && cabeAcima) return { top: area.top - MARGEM - ALTURA_CARTAO };
  if (cabeAbaixo) return { top: area.bottom + MARGEM + 12 };
  if (cabeAcima) return { top: area.top - MARGEM - ALTURA_CARTAO };

  // Não cabe de nenhum lado: ancora na metade mais livre.
  return area.top > alturaVp / 2 ? { top: 16 } : { bottom: 16 };
}
