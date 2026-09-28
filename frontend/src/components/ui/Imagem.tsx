import type { ImgHTMLAttributes } from "react";

/**
 * Imagem estática de /public. `fill` ocupa o contêiner posicionado (como o
 * `next/image`); `priority` pede carregamento imediato em vez de preguiçoso.
 */
export function Imagem({
  fill = false,
  priority = false,
  className = "",
  ...props
}: ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; priority?: boolean }) {
  return (
    <img
      {...props}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={fill ? `absolute inset-0 h-full w-full ${className}` : className}
    />
  );
}
