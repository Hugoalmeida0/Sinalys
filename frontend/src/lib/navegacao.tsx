/**
 * Navegação do app sobre o react-router, com a mesma API que os componentes
 * usavam no Next.js (`<Link href>`, `useRouter().push/refresh`, `usePathname`).
 */

import { forwardRef, type AnchorHTMLAttributes } from "react";
import { Link as LinkRouter, useLocation, useNavigate } from "react-router-dom";
import { atualizarDados } from "./atualizacao";

type PropsLink = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { href: string };

export const Link = forwardRef<HTMLAnchorElement, PropsLink>(function Link({ href, ...props }, ref) {
  return <LinkRouter ref={ref} to={href} {...props} />;
});

export function usePathname(): string {
  return useLocation().pathname;
}

export function useRouter() {
  const navigate = useNavigate();
  return {
    push: (destino: string) => navigate(destino),
    replace: (destino: string) => navigate(destino, { replace: true }),
    /** Recarrega os dados das telas abertas sem trocar de rota. */
    refresh: () => atualizarDados(),
  };
}
