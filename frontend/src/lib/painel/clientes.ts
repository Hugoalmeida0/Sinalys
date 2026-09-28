import type { FaixaRisco } from "@/lib/risco/faixa";
import type { ClientePainel } from "./tipos";

/** Faixas que entram na fila do dia e contam como "em alerta" (mesma regra do backend). */
export const FAIXAS_FILA_PADRAO: FaixaRisco[] = ["critico", "alerta"];

export const TODAS_FAIXAS: FaixaRisco[] = ["critico", "alerta", "atencao", "saudavel"];

export const TAMANHO_RESUMO_FILA = 5;

export function compararPrioridade(a: ClientePainel, b: ClientePainel): number {
  return b.scorePrioridade - a.scorePrioridade || b.scoreRisco - a.scoreRisco;
}
