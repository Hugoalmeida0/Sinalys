import { useState } from "react";

export interface PlanoIA {
  diagnostico: string;
  analiseLookalike: string | null;
  acoes: string[];
  geradoEm: string | null;

  origem: "ia" | "cache" | "fallback";
}

export function useAnaliseIA(clienteId: string, planoInicial: PlanoIA | null = null) {
  const [plano, setPlano] = useState<PlanoIA | null>(planoInicial);
  const [analisando, setAnalisando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [concluidas, setConcluidas] = useState<Record<number, boolean>>({});

  async function analisar(forcar = false) {
    setAnalisando(true);
    setErro(null);
    try {
      const resposta = await fetch("/api/inteligencia/analisar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cliente_id: clienteId, trigger_source: "manual", forcar }),
      });
      const corpo = await resposta.json().catch(() => ({}));
      if (!resposta.ok) {
        throw new Error(corpo?.erro ?? `Falha na análise (HTTP ${resposta.status}).`);
      }
      setPlano({
        diagnostico: corpo.diagnostico_principal,
        analiseLookalike: corpo.analise_lookalike ?? null,
        acoes: Array.isArray(corpo.plano_acao_imediato) ? corpo.plano_acao_imediato : [],
        geradoEm: new Date().toISOString(),
        origem: corpo.origem === "cache" || corpo.origem === "fallback" ? corpo.origem : "ia",
      });
      setConcluidas({});
      return true;
    } catch (e) {
      setErro((e as Error).message);
      return false;
    } finally {
      setAnalisando(false);
    }
  }

  function alternarAcao(index: number) {
    setConcluidas((prev) => ({ ...prev, [index]: !prev[index] }));
  }

  return { plano, analisando, erro, concluidas, analisar, alternarAcao };
}

export type UseAnaliseIA = ReturnType<typeof useAnaliseIA>;
