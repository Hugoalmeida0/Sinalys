"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRightIcon, XIcon } from "@/components/icons";
import { SinalysMascot } from "@/components/ui/SinalysMascot";
import { useAssistente } from "./AssistenteProvider";

type Mensagem = {
  id: number;
  autor: "sinalys" | "usuario";
  texto: string;
};

const SAUDACAO: Mensagem = {
  id: 0,
  autor: "sinalys",
  texto:
    "Oi, Ana! Sou a Sinalys. Posso resumir sua carteira, explicar o score de um cliente ou sugerir os próximos passos.",
};

const sugestoes = [
  "Quais clientes correm mais risco hoje?",
  "Por que o C080 está em risco crítico?",
  "Resuma minha carteira do mês",
];

export function AssistenteWidget() {
  // O rascunho vive no provider: assim um card pode abrir o chat já com a
  // pergunta preenchida, sem sincronizar estado dentro de efeito.
  const { aberto, abrir, fechar, rascunho, setRascunho } = useAssistente();
  const [mensagens, setMensagens] = useState<Mensagem[]>([SAUDACAO]);
  const fimDaLista = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (aberto) {
      campo.current?.focus();
      fimDaLista.current?.scrollIntoView({ block: "end" });
    }
  }, [aberto, mensagens]);

  // Esc fecha o painel.
  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") fechar();
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aberto, fechar]);

  function enviar(texto: string) {
    const conteudo = texto.trim();
    if (!conteudo) return;

    setMensagens((atuais) => [
      ...atuais,
      { id: atuais.length, autor: "usuario", texto: conteudo },
      {
        id: atuais.length + 1,
        autor: "sinalys",
        texto:
          "Ainda não estou ligada ao motor de respostas — assim que a integração entrar no ar, respondo com base nos dados reais da sua carteira.",
      },
    ]);
    setRascunho("");
  }

  return (
    <>
      {/* Botão flutuante com o emblema do mascote. */}
      <button
        type="button"
        onClick={() => (aberto ? fechar() : abrir())}
        aria-expanded={aberto}
        aria-label={aberto ? "Fechar assistente" : "Abrir assistente da Sinalys"}
        className="fixed right-5 bottom-24 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-brand-deep shadow-[0_18px_36px_-12px_rgba(37,99,235,0.85)] ring-1 ring-white/10 transition-transform hover:scale-105 active:scale-95 lg:bottom-6"
      >
        {aberto ? (
          <XIcon className="h-6 w-6 text-white" />
        ) : (
          <SinalysMascot variante="emblema" className="h-14 w-14" />
        )}
        {!aberto && (
          <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-400 ring-2 ring-[#081a3f]" />
        )}
      </button>

      {aberto && (
        <>
          {/* Fundo só no mobile, onde o painel ocupa quase a tela toda. */}
          <button
            type="button"
            aria-label="Fechar assistente"
            onClick={fechar}
            className="fixed inset-0 z-40 bg-slate-900/40 sm:hidden"
          />

          <section
            aria-label="Assistente da Sinalys"
            className="fixed inset-x-3 bottom-44 z-50 flex max-h-[70vh] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-float sm:inset-x-auto sm:right-5 sm:bottom-44 sm:w-96 lg:bottom-26"
          >
            <header className="navy-surface flex items-center gap-3 px-4 py-3.5 text-white">
              <SinalysMascot variante="emblema" className="h-10 w-10 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">Sinalys</p>
                <p className="flex items-center gap-1.5 text-xs text-blue-100/70">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Assistente de risco
                </p>
              </div>
              <button
                type="button"
                onClick={fechar}
                aria-label="Fechar"
                className="flex h-8 w-8 items-center justify-center rounded-full text-blue-100/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </header>

            <div className="scroll-slim flex-1 overflow-y-auto bg-slate-50/60 px-4 py-4">
              <ul className="flex flex-col gap-3">
                {mensagens.map((m) => (
                  <li
                    key={m.id}
                    className={`flex ${m.autor === "usuario" ? "justify-end" : "justify-start"}`}
                  >
                    <p
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                        m.autor === "usuario"
                          ? "rounded-br-md bg-brand-royal text-white"
                          : "rounded-bl-md border border-slate-200/80 bg-white text-slate-600"
                      }`}
                    >
                      {m.texto}
                    </p>
                  </li>
                ))}
              </ul>

              {mensagens.length === 1 && (
                <div className="mt-4 flex flex-col gap-2">
                  {sugestoes.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => enviar(s)}
                      className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-left text-sm font-medium text-slate-600 transition-colors hover:border-brand-royal hover:text-brand-royal"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              <div ref={fimDaLista} />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                enviar(rascunho);
              }}
              className="flex items-center gap-2 border-t border-slate-100 bg-white p-3"
            >
              <input
                ref={campo}
                value={rascunho}
                onChange={(e) => setRascunho(e.target.value)}
                placeholder="Pergunte sobre seus clientes..."
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-sm text-slate-700 transition-colors placeholder:text-slate-400 focus:border-brand-royal focus:bg-white focus:outline-none"
              />
              <button
                type="submit"
                disabled={!rascunho.trim()}
                aria-label="Enviar pergunta"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-royal text-white transition-colors hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowRightIcon className="h-4 w-4" />
              </button>
            </form>
          </section>
        </>
      )}
    </>
  );
}
