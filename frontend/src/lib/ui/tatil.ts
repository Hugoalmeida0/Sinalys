/**
 * Retorno tátil curto em ações de confirmação.
 *
 * Só existe no Android; no iOS a API não é exposta e a chamada simplesmente
 * não faz nada — por isso nunca é o único retorno de uma ação, sempre um
 * reforço de algo que já aparece na tela.
 */

type Intensidade = "toque" | "confirmacao" | "erro";

const PADROES: Record<Intensidade, number | number[]> = {
  toque: 10,
  confirmacao: [12, 40, 18],
  erro: [30, 60, 30],
};

export function vibrar(intensidade: Intensidade = "toque") {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;

  // Alguns navegadores lançam se a página não teve interação do usuário.
  try {
    navigator.vibrate(PADROES[intensidade]);
  } catch {
    /* sem retorno tátil, segue em frente */
  }
}
