import { createContext, useContext } from "react";

export interface UsuarioSessao {
  id: string;
  email: string;
  nome: string;
  cargo: string | null;
  iniciais: string;
  projetoId: string | null;
}

export const ContextoUsuario = createContext<UsuarioSessao | null>(null);

export function useUsuario(): UsuarioSessao {
  const usuario = useContext(ContextoUsuario);
  if (!usuario) throw new Error("useUsuario precisa estar dentro da área autenticada.");
  return usuario;
}
