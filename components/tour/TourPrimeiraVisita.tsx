"use client";

import { useCallback, useEffect, useState } from "react";
import { XIcon } from "@/components/ui/icons";
import { vibrar } from "@/lib/ui/tatil";

/**
 * Apresentação da barra inferior, só na primeira visita e só no celular.
 *
 * Todos os passos apontam para itens da mesma barra fixa, o que torna o
 * posicionamento previsível: o cartão fica sempre logo acima dela. Não há
 * rolagem, nem medição de elemento em meio à página, nem espera por conteúdo
 * assíncrono — o que elimina as formas mais comuns de um tour travar.
 *
 * Princípio que rege o arquivo: **em nenhuma situação a pessoa pode ficar
 * presa**. Se um alvo não for encontrado, o passo é pulado; se nenhum for, o
 * tour se encerra sozinho; o botão de fechar existe em todos os estados; e a
 * conclusão é gravada logo na abertura, então nem recarregar traz o tour de
 * volta.
 */

type Passo = { alvo: string; titulo: string; texto: string };

const PASSOS: Passo[] = [
  {
    alvo: '[data-tour="nav-/"]',
    titulo: "Início",
    texto:
      "O painel do dia: a exposição ponderada da carteira, quantos clientes precisam de atenção e a fila já priorizada.",
  },
  {
    alvo: '[data-tour="nav-/clientes"]',
    titulo: "Clientes",
    texto:
      "A carteira inteira, com busca e filtros. Toque em qualquer cliente para ver o score, os sinais de risco e o simulador.",
  },
  {
    alvo: '[data-tour="nav-assistente"]',
    titulo: "Fale com a Sinalys",
    texto:
      "Pergunte em português sobre a sua carteira. A resposta vem dos dados reais — quem está em risco, por quê e o que fazer.",
  },
  {
    alvo: '[data-tour="nav-/recuperacao"]',
    titulo: "Recuperação",
    texto:
      "Clientes que já cancelaram, com a causa provável e um plano gerado pela IA para tentar trazê-los de volta.",
  },
  {
    alvo: '[data-tour="nav-/configuracoes"]',
    titulo: "Mais",
    texto: "Configurações, integrações e os pesos do modelo de risco.",
  },
];

const CHAVE = "sinalys:tour-concluido";
const MARGEM = 10;
/** Se nada for medido neste tempo, o tour desiste em vez de insistir. */
const LIMITE_SEM_ALVO_MS = 4000;

function jaViu() {
  try {
    return localStorage.getItem(CHAVE) === "1";
  } catch {
    // Sem armazenamento não há como lembrar; melhor não exibir do que repetir
    // o tour a cada navegação.
    return true;
  }
}

function marcarVisto() {
  try {
    localStorage.setItem(CHAVE, "1");
  } catch {
    /* segue sem persistir */
  }
}

export function TourPrimeiraVisita() {
  const [indice, setIndice] = useState<number | null>(null);
  const [area, setArea] = useState<DOMRect | null>(null);

  const encerrar = useCallback(() => {
    setIndice(null);
    setArea(null);
    marcarVisto();
  }, []);

  // Abertura. A conclusão é gravada aqui, e não no fim: se a pessoa fechar o
  // app, recarregar ou perder a conexão no meio, o tour não volta a aparecer.
  useEffect(() => {
    if (jaViu()) return;

    const t = setTimeout(() => {
      // A barra inferior só existe no celular; sem ela não há o que apresentar.
      const barra = document.querySelector('[data-tour="nav-assistente"]');
      if (!barra || !(barra as HTMLElement).offsetParent) {
        marcarVisto();
        return;
      }
      marcarVisto();
      setIndice(0);
    }, 900);

    return () => clearTimeout(t);
  }, []);

  // Mede o alvo do passo atual. Nada de scroll: os alvos estão numa barra fixa.
  useEffect(() => {
    if (indice === null) return;

    // O índice sempre vem de um setter limitado ao tamanho da lista; se ainda
    // assim vier fora de faixa, o render devolve null e nada é medido.
    const passo = PASSOS[indice];
    if (!passo) return;

    let vivo = true;

    const medir = () => {
      if (!vivo) return;
      const el = document.querySelector(passo.alvo);
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      setArea(r);
    };

    medir();

    // Em aparelho lento a barra pode não estar pintada ainda: tenta de novo por
    // alguns instantes e, se mesmo assim não achar, pula o passo em vez de
    // deixar a pessoa olhando para uma tela escura sem destaque.
    const inicio = Date.now();
    const intervalo = setInterval(() => {
      const el = document.querySelector(passo.alvo);
      const r = el?.getBoundingClientRect();
      if (r && r.width > 0) {
        setArea(r);
        clearInterval(intervalo);
        return;
      }
      if (Date.now() - inicio > LIMITE_SEM_ALVO_MS) {
        clearInterval(intervalo);
        if (!vivo) return;
        setIndice((i) => (i === null ? null : i + 1 < PASSOS.length ? i + 1 : null));
      }
    }, 250);

    window.addEventListener("resize", medir);
    window.addEventListener("orientationchange", medir);

    return () => {
      vivo = false;
      clearInterval(intervalo);
      window.removeEventListener("resize", medir);
      window.removeEventListener("orientationchange", medir);
    };
  }, [indice]);

  useEffect(() => {
    if (indice === null) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") encerrar();
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [indice, encerrar]);

  if (indice === null) return null;

  const passo = PASSOS[indice];
  if (!passo) return null;

  const ultimo = indice === PASSOS.length - 1;

  function avancar() {
    vibrar("toque");
    setArea(null);
    setIndice((i) => {
      if (i === null) return null;
      if (i + 1 >= PASSOS.length) {
        marcarVisto();
        return null;
      }
      return i + 1;
    });
  }

  return (
    <div
      className="fixed inset-0 z-[70]"
      role="dialog"
      aria-modal="true"
      aria-label={`Apresentação rápida, passo ${indice + 1} de ${PASSOS.length}`}
    >
      {/*
        Tocar em qualquer lugar avança. O escurecimento vem da sombra do
        holofote, que recorta o item da barra; este botão só captura o toque.
        Quando ainda não há alvo medido, ele mesmo escurece — assim a tela
        nunca fica num estado ambíguo.
      */}
      <button
        type="button"
        aria-label="Avançar"
        onClick={avancar}
        className={`absolute inset-0 h-full w-full cursor-default ${area ? "" : "bg-slate-950/75"}`}
      />

      {area && (
        <span
          aria-hidden
          className="holofote pointer-events-none absolute rounded-2xl transition-all duration-300"
          style={{
            top: area.top - MARGEM,
            left: area.left - MARGEM,
            width: area.width + MARGEM * 2,
            height: area.height + MARGEM * 2,
          }}
        />
      )}

      {/*
        Cartão ancorado acima da barra inferior. Posição fixa, sem cálculo
        dependente do alvo: não há como ele cair fora da tela.
      */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[calc(7rem+env(safe-area-inset-bottom))] px-4">
        <div className="pointer-events-auto mx-auto max-w-sm rounded-2xl bg-white p-4 shadow-float">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-brand-ink">{passo.titulo}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{passo.texto}</p>
            </div>

            <button
              type="button"
              onClick={encerrar}
              aria-label="Fechar apresentação"
              className="-mt-1 -mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <span
              className="flex items-center gap-1.5"
              aria-label={`Passo ${indice + 1} de ${PASSOS.length}`}
            >
              {PASSOS.map((_, i) => (
                <span
                  key={i}
                  aria-hidden
                  className={`h-1.5 rounded-full transition-all ${
                    i === indice ? "w-5 bg-brand-royal" : "w-1.5 bg-slate-200"
                  }`}
                />
              ))}
            </span>

            <span className="flex items-center gap-1">
              <button
                type="button"
                onClick={encerrar}
                className="min-h-11 rounded-xl px-3 text-xs font-semibold text-slate-500 transition-colors hover:text-slate-700"
              >
                Pular
              </button>
              <button
                type="button"
                onClick={avancar}
                className="min-h-11 rounded-xl bg-brand-royal px-4 text-xs font-bold text-white transition-colors hover:bg-[#1d4ed8]"
              >
                {ultimo ? "Entendi" : "Próximo"}
              </button>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
