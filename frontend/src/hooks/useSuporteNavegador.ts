import { useSyncExternalStore } from "react";

const semInscricao = () => () => {};

/**
 * Lê uma capacidade do navegador sem divergir na hidratação.
 *
 * Detectar com `useState` + `useEffect` provoca um render em cascata; detectar
 * direto no corpo do componente quebra a hidratação, porque no servidor não
 * existe `navigator`. `useSyncExternalStore` resolve os dois: entrega `false`
 * no servidor e o valor real no cliente, num único render.
 *
 * `detectar` precisa devolver sempre um primitivo estável.
 */
export function useSuporteNavegador(detectar: () => boolean) {
  return useSyncExternalStore(semInscricao, detectar, () => false);
}
