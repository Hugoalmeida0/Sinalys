import { useSyncExternalStore } from "react";

/**
 * Sinal global de "os dados mudaram".
 *
 * Depois de registrar um contato, salvar pesos ou recalcular a fila, quem
 * gravou chama `atualizarDados()` e toda tela aberta busca a API de novo,
 * mantendo o conteúdo atual na tela até a resposta chegar.
 */

let versao = 0;
const ouvintes = new Set<() => void>();

export function atualizarDados() {
  versao += 1;
  ouvintes.forEach((ouvinte) => ouvinte());
}

function inscrever(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  return () => ouvintes.delete(ouvinte);
}

export function useVersaoDados(): number {
  return useSyncExternalStore(inscrever, () => versao);
}
