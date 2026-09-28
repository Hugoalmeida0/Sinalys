import { useEffect } from "react";

/**
 * Piso de exibição, contado a partir do início da navegação.
 *
 * Existe só para evitar o piscar de uma carga instantânea (cache quente, volta
 * pelo histórico). Quando o app demora de verdade, a montagem acontece bem
 * depois disso e a tela sai no exato momento em que a interface fica pronta —
 * segurar mais seria fingir carregamento.
 */
const PISO_EM_TELA_MS = 400;

/** Precisa acompanhar a transição de `.tela-abertura` no index.css. */
const DURACAO_SAIDA_MS = 260;

/**
 * Retira a tela de abertura.
 *
 * A tela em si mora no `index.html` (`#tela-abertura`) e é pintada no primeiro
 * frame, antes de qualquer JavaScript: não busca imagem, fonte nem rota, porque
 * qualquer requisição adiaria justamente o intervalo que ela existe para
 * cobrir. Este componente só a remove quando o React monta — o instante em que
 * a interface passa a responder ao toque.
 */
export function TelaDeAbertura() {
  useEffect(() => {
    const tela = document.getElementById("tela-abertura");
    if (!tela) return;

    const restante = Math.max(0, PISO_EM_TELA_MS - performance.now());
    const saida = setTimeout(() => tela.setAttribute("data-saindo", ""), restante);
    const remocao = setTimeout(() => tela.remove(), restante + DURACAO_SAIDA_MS);

    return () => {
      clearTimeout(saida);
      clearTimeout(remocao);
    };
  }, []);

  return null;
}
