import type { ButtonHTMLAttributes } from "react";
import { useEmBreve } from "./EmBreve";

/**
 * Botão de recurso ainda não implementado. Existe como componente próprio
 * para que server components (Topbar, por exemplo) também consigam usar o
 * aviso sem virarem client components inteiros.
 */
export function BotaoEmBreve({
  recurso,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { recurso: string }) {
  const avisar = useEmBreve();

  return (
    <button type="button" onClick={() => avisar(recurso)} {...props}>
      {children}
    </button>
  );
}
