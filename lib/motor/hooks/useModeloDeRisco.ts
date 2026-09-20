import { useCallback, useEffect, useState } from "react";

/** Mesma forma de `RegraModeloDetalhada` (lib/motor/modelo.ts), do lado do cliente. */
export interface RegraModeloUI {
  id: string;
  metrica_id: string;
  metrica_codigo: string;
  metrica_rotulo: string;
  metrica_unidade: string | null;
  tipo: "zscore_carteira" | "media_movel";
  direcao: "maior_pior" | "menor_pior";
  janela_dias: number | null;
  janela_observacoes: number | null;
  pontuacao_omissao: number | null;
  peso: number;
}

export interface MetricaDisponivelUI {
  id: string;
  codigo: string;
  rotulo: string;
  unidade: string | null;
}

interface ModeloResposta {
  modelo_id: string;
  versao: number;
  regras: RegraModeloUI[];
  metricas_disponiveis: MetricaDisponivelUI[];
  recalculo?: { total_entidades: number; avisos: string[] };
}

export interface NovaRegraPayload {
  metrica_id: string;
  tipo: "zscore_carteira" | "media_movel";
  direcao: "maior_pior" | "menor_pior";
  peso: number;
  janela_dias?: number;
  janela_observacoes?: number;
  pontuacao_omissao?: number;
}

/**
 * Estado + ações da aba "Modelo de risco" (Módulo 5 — CRUD de pesos/regras).
 * Compartilhado entre a visão detalhada (aba própria) e o resumo (sidebar de
 * Configurações) para não duplicar a busca — ambas leem do mesmo hook.
 */
export function useModeloDeRisco() {
  const [modelo, setModelo] = useState<ModeloResposta | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const resposta = await fetch("/api/modelo");
      const corpo = await resposta.json().catch(() => ({}));
      if (!resposta.ok) throw new Error(corpo?.erro ?? "Não foi possível carregar o modelo de risco.");
      setModelo(corpo);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    // Busca inicial ao montar (sincroniza com o servidor, não deriva de
    // props/estado) — o setState síncrono é o próprio propósito do efeito.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar();
  }, [carregar]);

  const salvarPesos = useCallback(async (atualizacoes: { id: string; peso: number }[]): Promise<boolean> => {
    if (atualizacoes.length === 0) return true;
    setSalvando(true);
    setErro(null);
    try {
      const resposta = await fetch("/api/modelo/regras", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ atualizacoes }),
      });
      const corpo = await resposta.json().catch(() => ({}));
      if (!resposta.ok) throw new Error(corpo?.erro ?? "Não foi possível salvar os pesos.");
      setModelo(corpo);
      return true;
    } catch (e) {
      setErro((e as Error).message);
      return false;
    } finally {
      setSalvando(false);
    }
  }, []);

  const criarRegra = useCallback(async (payload: NovaRegraPayload): Promise<boolean> => {
    setSalvando(true);
    setErro(null);
    try {
      const resposta = await fetch("/api/modelo/regras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const corpo = await resposta.json().catch(() => ({}));
      if (!resposta.ok) throw new Error(corpo?.erro ?? "Não foi possível criar a regra.");
      setModelo(corpo);
      return true;
    } catch (e) {
      setErro((e as Error).message);
      return false;
    } finally {
      setSalvando(false);
    }
  }, []);

  return { modelo, carregando, salvando, erro, setErro, recarregar: carregar, salvarPesos, criarRegra };
}

export type UseModeloDeRisco = ReturnType<typeof useModeloDeRisco>;
