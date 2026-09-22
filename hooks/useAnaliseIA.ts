import { useState } from "react";
import { traduzirErroIA, type ErroIA } from "@/lib/ui/erros-ia";

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
  const [falha, setFalha] = useState<ErroIA | null>(null);
  const [concluidas, setConcluidas] = useState<Record<number, boolean>>({});

  async function analisar(forcar = false) {
    setAnalisando(true);
    setFalha(null);
    try {
      let resposta: Response;
      try {
        resposta = await fetch("/api/inteligencia/analisar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cliente_id: clienteId, trigger_source: "manual", forcar }),
        });
      } catch (e) {
        setFalha(traduzirErroIA((e as Error).message));
        return false;
      }
      const corpo = await resposta.json().catch(() => ({}));
      if (!resposta.ok) {
        // 404 e 422 já trazem o motivo de negócio (cliente não encontrado, sem
        // predição): esse texto fica, e repetir a análise não mudaria nada.
        setFalha(
          (resposta.status === 404 || resposta.status === 422) && corpo?.erro
            ? { mensagem: corpo.erro, podeTentarDeNovo: false }
            : traduzirErroIA(corpo?.erro, resposta.status)
        );
        return false;
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
      setFalha(traduzirErroIA((e as Error).message));
      return false;
    } finally {
      setAnalisando(false);
    }
  }

  function alternarAcao(index: number) {
    setConcluidas((prev) => ({ ...prev, [index]: !prev[index] }));
  }

  return {
    plano,
    analisando,
    erro: falha?.mensagem ?? null,
    podeTentarDeNovo: falha?.podeTentarDeNovo ?? false,
    concluidas,
    analisar,
    alternarAcao,
  };
}

export type UseAnaliseIA = ReturnType<typeof useAnaliseIA>;
