import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { InfoIcon } from "./icons";

const TEXTO =
  "Score de 0 a 100: índice operacional que resume os sinais de risco do cliente. Prioridade = risco × impacto financeiro na carteira.";

const MARGEM_VIEWPORT = 8;
const DISTANCIA_ANCORA = 4;
const LARGURA_MAXIMA = 288;

/**
 * Explica o score num popover aberto por toque ou clique.
 *
 * O `title` não aparece em tela de toque, por isso o texto mora aqui. O
 * fechamento por fora escuta `pointerdown`, e não `mousedown`: o Safari do
 * iPhone não dispara `mousedown` ao tocar numa área que não é clicável, e o
 * popover ficaria aberto.
 */
export function AjudaScore({ className = "" }: { className?: string }) {
  const [aberto, setAberto] = useState(false);
  const id = useId();
  const botaoRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const fechar = useCallback((devolverFoco: boolean) => {
    setAberto(false);
    if (devolverFoco) botaoRef.current?.focus();
  }, []);

  useLayoutEffect(() => {
    if (!aberto) return;

    function posicionar() {
      const popover = popoverRef.current;
      const ancora = botaoRef.current?.getBoundingClientRect();
      if (!popover || !ancora) return;

      // A largura vem antes da medição da altura, que depende da quebra do texto.
      const largura = Math.min(LARGURA_MAXIMA, window.innerWidth - MARGEM_VIEWPORT * 2);
      popover.style.width = `${largura}px`;

      const centro = ancora.left + ancora.width / 2;
      const left = Math.max(
        MARGEM_VIEWPORT,
        Math.min(centro - largura / 2, window.innerWidth - largura - MARGEM_VIEWPORT)
      );
      const altura = popover.offsetHeight;
      const abaixo = ancora.bottom + DISTANCIA_ANCORA;
      const naoCabeAbaixo = abaixo + altura > window.innerHeight - MARGEM_VIEWPORT;
      const acima = ancora.top - altura - DISTANCIA_ANCORA;
      const top = naoCabeAbaixo && acima > MARGEM_VIEWPORT ? acima : abaixo;

      popover.style.top = `${top}px`;
      popover.style.left = `${left}px`;
    }

    posicionar();
    window.addEventListener("scroll", posicionar, true);
    window.addEventListener("resize", posicionar);
    return () => {
      window.removeEventListener("scroll", posicionar, true);
      window.removeEventListener("resize", posicionar);
    };
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;

    popoverRef.current?.focus();

    function aoTocarFora(event: PointerEvent) {
      const alvo = event.target as Node;
      if (popoverRef.current?.contains(alvo) || botaoRef.current?.contains(alvo)) return;
      fechar(false);
    }
    function aoTeclar(event: KeyboardEvent) {
      if (event.key === "Escape") fechar(true);
    }

    document.addEventListener("pointerdown", aoTocarFora);
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("pointerdown", aoTocarFora);
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [aberto, fechar]);

  return (
    <>
      <button
        ref={botaoRef}
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-label="O que é o score?"
        aria-expanded={aberto}
        aria-controls={id}
        className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors hover:text-brand-royal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-royal ${
          aberto ? "text-brand-royal" : "text-slate-400"
        } ${className}`}
      >
        <InfoIcon className="h-5 w-5" />
      </button>

      {aberto &&
        createPortal(
          <div
            ref={popoverRef}
            id={id}
            role="dialog"
            aria-label="O que é o score"
            tabIndex={-1}
            // Sem nada focável dentro, o Tab sairia para o fim do documento,
            // onde o portal está. Volta para o botão, e a ordem segue dali.
            onKeyDown={(event) => {
              if (event.key === "Tab") {
                event.preventDefault();
                fechar(true);
              }
            }}
            style={{ position: "fixed", top: -9999, left: -9999 }}
            className="z-50 rounded-xl border border-slate-200 bg-white p-3.5 text-sm leading-relaxed text-slate-600 shadow-float focus:outline-none"
          >
            {TEXTO}
          </div>,
          document.body
        )}
    </>
  );
}
