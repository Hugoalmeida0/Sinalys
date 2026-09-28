import { useEffect, useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

const MARGEM_VIEWPORT = 8;
const DISTANCIA_ANCORA = 6;

export function MenuFlutuante({
  open,
  anchorRef,
  onClose,
  children,
  width = 208,
}: {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  children: ReactNode;
  width?: number;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open) return;

    function calcular() {
      const menu = menuRef.current;
      const ancora = anchorRef.current?.getBoundingClientRect();
      if (!menu || !ancora) return;
      const alturaMenu = menu.offsetHeight;

      const left = Math.max(
        MARGEM_VIEWPORT,
        Math.min(ancora.right - width, window.innerWidth - width - MARGEM_VIEWPORT)
      );
      const abaixo = ancora.bottom + DISTANCIA_ANCORA;
      const naoCabeAbaixo = abaixo + alturaMenu > window.innerHeight - MARGEM_VIEWPORT;
      const acima = ancora.top - alturaMenu - DISTANCIA_ANCORA;
      const top = naoCabeAbaixo && acima > MARGEM_VIEWPORT ? acima : abaixo;

      menu.style.top = `${top}px`;
      menu.style.left = `${left}px`;
    }

    calcular();
    window.addEventListener("scroll", calcular, true);
    window.addEventListener("resize", calcular);
    return () => {
      window.removeEventListener("scroll", calcular, true);
      window.removeEventListener("resize", calcular);
    };
  }, [open, anchorRef, width]);

  useEffect(() => {
    if (!open) return;

    function aoClicarFora(event: MouseEvent) {
      const alvo = event.target as Node;
      if (menuRef.current?.contains(alvo) || anchorRef.current?.contains(alvo)) return;
      onClose();
    }
    function aoTeclar(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("mousedown", aoClicarFora);
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("mousedown", aoClicarFora);
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      style={{ position: "fixed", top: -9999, left: -9999, width }}
      className="z-50 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-float"
    >
      {children}
    </div>,
    document.body
  );
}
