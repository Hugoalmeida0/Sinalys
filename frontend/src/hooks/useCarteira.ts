import { useApi } from "./useApi";
import type { ClientePainel } from "@/lib/painel/tipos";

interface RespostaCarteira {
  sem_predicao: number;
  clientes: ClientePainel[];
}

/**
 * Carteira completa (`GET /api/painel/clientes`). Sem modelo de risco ativo a
 * API responde 422, e a tela mostra uma carteira vazia em vez de um erro.
 */
export function useCarteira() {
  const { dados, carregando, erro } = useApi<RespostaCarteira>("/api/painel/clientes");
  const semModelo = erro?.status === 422;
  return {
    carregando,
    erro: erro && !semModelo && !dados ? erro.message : null,
    clientes: dados?.clientes ?? [],
    semPredicao: dados?.sem_predicao ?? 0,
  };
}
