"use client";

import { useEffect, useState } from "react";
import { GlobalsysWordmark } from "./GlobalsysWordmark";

/**
 * Piso de exibição, contado a partir do início da navegação.
 *
 * Existe só para evitar o piscar de uma carga instantânea (cache quente, volta
 * pelo histórico). Quando o app demora de verdade, a hidratação acontece bem
 * depois disso e a tela sai no exato momento em que a interface fica pronta —
 * segurar mais seria fingir carregamento.
 */
const PISO_EM_TELA_MS = 400;

/** Precisa acompanhar a transição de `.tela-abertura` no globals.css. */
const DURACAO_SAIDA_MS = 260;

/**
 * Tela de abertura do app.
 *
 * Vai no HTML do próprio documento e é pintada no primeiro frame: não busca
 * imagem, fonte nem rota. Qualquer requisição aqui adiaria justamente o
 * intervalo que ela existe para cobrir — do clique no link até a tela pronta,
 * que é quando o navegador mostraria uma página em branco.
 *
 * Ela sai na hidratação do React, que é o instante em que a interface passa a
 * responder ao toque. Sem JavaScript o `<noscript>` a apaga; do contrário ela
 * cobriria o app para sempre.
 */
export function TelaDeAbertura() {
  const [fase, setFase] = useState<"visivel" | "saindo" | "removida">("visivel");

  useEffect(() => {
    const restante = Math.max(0, PISO_EM_TELA_MS - performance.now());
    const saida = setTimeout(() => setFase("saindo"), restante);
    const remocao = setTimeout(() => setFase("removida"), restante + DURACAO_SAIDA_MS);

    return () => {
      clearTimeout(saida);
      clearTimeout(remocao);
    };
  }, []);

  if (fase === "removida") return null;

  return (
    <>
      <noscript
        dangerouslySetInnerHTML={{ __html: "<style>.tela-abertura{display:none}</style>" }}
      />
      <div
        className="tela-abertura"
        data-saindo={fase === "saindo" ? "" : undefined}
        role="status"
        aria-label="Carregando o Sinalys"
      >
        <div className="tela-abertura-conteudo">
          {/* Os arcos acendem de dentro para fora: o sinal sendo emitido. */}
          <svg className="tela-abertura-sinal" viewBox="0 0 64 64" aria-hidden="true">
            <circle cx="32" cy="46" r="4" />
            <path className="tela-abertura-arco" d="M23.5 37.5a12 12 0 0 1 17 0" />
            <path className="tela-abertura-arco" d="M16.4 30.4a22 22 0 0 1 31.2 0" />
            <path className="tela-abertura-arco" d="M9.4 23.4a32 32 0 0 1 45.2 0" />
          </svg>

          <p className="tela-abertura-marca">Sinalys</p>

          <div className="barra-rota tela-abertura-barra" />
        </div>

        <GlobalsysWordmark className="tela-abertura-rodape text-sm" />
      </div>
    </>
  );
}
