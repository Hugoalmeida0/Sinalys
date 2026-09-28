import { useEffect, useState } from "react";
import { apiJson, ErroHttp } from "@/lib/api";
import { useVersaoDados } from "@/lib/atualizacao";

export interface EstadoApi<T> {
  dados: T | null;
  /** Primeira carga, sem nada para mostrar ainda. */
  carregando: boolean;
  /** Recarga em segundo plano: os dados anteriores continuam na tela. */
  atualizando: boolean;
  erro: ErroHttp | null;
}

/** Busca um recurso da API e busca de novo sempre que `atualizarDados()` for chamado. */
export function useApi<T>(caminho: string | null): EstadoApi<T> {
  const versao = useVersaoDados();
  const [estado, setEstado] = useState<EstadoApi<T>>({
    dados: null,
    carregando: Boolean(caminho),
    atualizando: false,
    erro: null,
  });

  useEffect(() => {
    if (!caminho) return;
    let ativo = true;
    setEstado((atual) => ({ ...atual, carregando: atual.dados === null, atualizando: atual.dados !== null }));

    apiJson<T>(caminho)
      .then((dados) => {
        if (ativo) setEstado({ dados, carregando: false, atualizando: false, erro: null });
      })
      .catch((e: unknown) => {
        const erro = e instanceof ErroHttp ? e : new ErroHttp((e as Error).message, 0);
        if (ativo) setEstado((atual) => ({ ...atual, carregando: false, atualizando: false, erro }));
      });

    return () => {
      ativo = false;
    };
  }, [caminho, versao]);

  return estado;
}
