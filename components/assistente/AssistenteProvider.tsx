"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type AssistenteContexto = {
  aberto: boolean;

  abrir: (assunto?: string) => void;
  fechar: () => void;
  alternar: () => void;
  rascunho: string;
  setRascunho: (texto: string) => void;
};

const Contexto = createContext<AssistenteContexto | null>(null);

export function AssistenteProvider({ children }: { children: React.ReactNode }) {
  const [aberto, setAberto] = useState(false);
  const [rascunho, setRascunho] = useState("");

  const abrir = useCallback((assunto?: string) => {
    if (assunto) setRascunho(assunto);
    setAberto(true);
  }, []);

  const fechar = useCallback(() => setAberto(false), []);
  const alternar = useCallback(() => setAberto((v) => !v), []);

  const valor = useMemo(
    () => ({ aberto, abrir, fechar, alternar, rascunho, setRascunho }),
    [aberto, abrir, fechar, alternar, rascunho],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useAssistente() {
  const ctx = useContext(Contexto);
  if (!ctx) {
    throw new Error("useAssistente precisa estar dentro de <AssistenteProvider>.");
  }
  return ctx;
}
