"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, getToolName, isToolUIPart, type UIMessage } from "ai";
import { ArrowRightIcon, LoaderIcon, MicrofoneIcon, PlusIcon, XIcon } from "@/components/ui/icons";
import { SinalysMascot } from "@/components/ui/SinalysMascot";
import { useDitado } from "@/hooks/useDitado";
import { traduzirErroIA } from "@/lib/ui/erros-ia";
import { vibrar } from "@/lib/ui/tatil";
import { useAssistente } from "./AssistenteProvider";
import { TextoFormatado } from "./TextoFormatado";
import { clienteDaRota, ROTULOS_FERRAMENTAS, sugestoesParaTela } from "./sugestoes";

export function AssistenteWidget({ nomeUsuario }: { nomeUsuario: string }) {
  const { aberto, abrir, fechar, rascunho, setRascunho } = useAssistente();
  const caminho = usePathname();
  const clienteId = clienteDaRota(caminho);

  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/inteligencia/chat" }), []);
  const { messages, sendMessage, regenerate, status, error, stop, setMessages, clearError } =
    useChat({ transport });
  const falha = error ? traduzirErroIA(error.message) : null;

  const ocupado = status === "submitted" || status === "streaming";
  const ditado = useDitado(setRascunho);
  const fimDaLista = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (aberto) {
      campo.current?.focus();
      fimDaLista.current?.scrollIntoView({ block: "end" });
    }
  }, [aberto, messages, status]);

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
    if (!conteudo || ocupado) return;
    clearError();
    vibrar("toque");
    ditado.parar();

    void sendMessage({ text: conteudo }, { body: { tela: { caminho, clienteId } } });
    setRascunho("");
  }

  // Refaz a última pergunta: descarta a resposta parcial, se houver, e reenvia.
  function tentarNovamente() {
    if (ocupado) return;
    clearError();
    vibrar("toque");
    void regenerate({ body: { tela: { caminho, clienteId } } });
  }

  const primeiroNome = nomeUsuario.split(/\s+/)[0] || nomeUsuario;
  const sugestoes = sugestoesParaTela(caminho, clienteId);

  return (
    <>

      <button
        type="button"
        onClick={() => (aberto ? fechar() : abrir())}
        aria-expanded={aberto}
        aria-label={aberto ? "Fechar assistente" : "Abrir assistente da Sinalys"}
        // No mobile quem abre o assistente é o mascote no centro da barra
        // inferior; manter também este botão flutuante seria um segundo
        // gatilho para a mesma ação, ainda por cima cobrindo o conteúdo.
        className="fixed right-5 bottom-6 z-50 hidden h-16 w-16 items-center justify-center rounded-full bg-brand-deep shadow-[0_18px_36px_-12px_rgba(37,99,235,0.85)] ring-1 ring-white/10 transition-transform hover:scale-105 active:scale-95 lg:flex"
      >
        {aberto ? (
          <XIcon className="h-6 w-6 text-white" />
        ) : (
          <SinalysMascot variante="emblema" className="h-14 w-14" />
        )}
        {!aberto && (
          <span
            className={`absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-[#081a3f] ${
              ocupado ? "animate-pulse bg-amber-400" : "bg-emerald-400"
            }`}
          />
        )}
      </button>

      {aberto && (
        <>

          <button
            type="button"
            aria-label="Fechar assistente"
            onClick={fechar}
            className="fixed inset-0 z-40 bg-slate-900/40 sm:hidden"
          />

          {/*
            No mobile o painel é um bottom sheet ancorado no rodapé: `dvh` (e não
            `vh`) desconta a barra de URL do navegador e o teclado virtual, que
            antes empurravam o topo do painel para fora da área visível.
          */}
          <section
            aria-label="Assistente da Sinalys"
            className="fixed inset-x-0 bottom-0 z-50 flex h-[85dvh] max-h-[85dvh] flex-col overflow-hidden rounded-t-2xl border border-slate-200/80 bg-white pb-[env(safe-area-inset-bottom)] shadow-float sm:inset-x-auto sm:right-5 sm:bottom-44 sm:h-auto sm:max-h-[70dvh] sm:w-96 sm:rounded-2xl sm:pb-0 lg:bottom-26"
          >
            <header className="navy-surface flex items-center gap-3 px-4 py-3.5 text-white">
              <SinalysMascot variante="emblema" className="h-10 w-10 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">Sinalys</p>
                <p className="flex items-center gap-1.5 text-xs text-blue-100/70">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${ocupado ? "animate-pulse bg-amber-400" : "bg-emerald-400"}`}
                  />
                  {ocupado ? "Analisando…" : "Assistente de risco"}
                </p>
              </div>
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    stop();
                    setMessages([]);
                    clearError();
                  }}
                  aria-label="Nova conversa"
                  title="Nova conversa"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-blue-100/70 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <PlusIcon className="h-4 w-4" />
                </button>
              )}
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
                <li className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-slate-200/80 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-slate-600">
                    Oi, {primeiroNome}! Sou a Sinalys. Posso dizer quem merece atenção agora, explicar o
                    score de um cliente e sugerir como agir — sempre com base nos dados da sua carteira.
                  </div>
                </li>

                {messages.map((m) => (
                  <Mensagem key={m.id} mensagem={m} />
                ))}

                {status === "submitted" && (
                  <li className="flex justify-start">
                    <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-slate-200/80 bg-white px-3.5 py-2.5 text-sm text-slate-400">
                      <LoaderIcon className="h-4 w-4 animate-spin" />
                      Pensando…
                    </div>
                  </li>
                )}

                {falha && (
                  <li className="flex justify-start">
                    <div
                      role="alert"
                      className="max-w-[85%] rounded-2xl rounded-bl-md border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm leading-relaxed text-red-700"
                    >
                      <p>{falha.mensagem}</p>
                      {falha.podeTentarDeNovo && (
                        <button
                          type="button"
                          onClick={tentarNovamente}
                          className="mt-2 min-h-11 rounded-lg px-3 font-semibold text-red-700 ring-1 ring-red-200 ring-inset transition-colors hover:bg-red-100 sm:min-h-9"
                        >
                          Tentar novamente
                        </button>
                      )}
                    </div>
                  </li>
                )}
              </ul>

              {messages.length === 0 && (
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
                placeholder={clienteId ? `Pergunte sobre o ${clienteId}...` : "Pergunte sobre seus clientes..."}
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-sm text-slate-700 transition-colors placeholder:text-slate-400 focus:border-brand-royal focus:bg-white focus:outline-none"
              />
              {ditado.suportado && !ocupado && (
                <button
                  type="button"
                  onClick={ditado.alternar}
                  aria-pressed={ditado.ouvindo}
                  aria-label={ditado.ouvindo ? "Parar ditado" : "Ditar pergunta"}
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                    ditado.ouvindo
                      ? "animate-pulse bg-red-500 text-white"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  <MicrofoneIcon className="h-4 w-4" />
                </button>
              )}

              {ocupado ? (
                <button
                  type="button"
                  onClick={stop}
                  aria-label="Parar resposta"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-600 transition-colors hover:bg-slate-300"
                >
                  <span className="h-3 w-3 rounded-sm bg-current" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!rascunho.trim()}
                  aria-label="Enviar pergunta"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-royal text-white transition-colors hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowRightIcon className="h-4 w-4" />
                </button>
              )}
            </form>
          </section>
        </>
      )}
    </>
  );
}

function Mensagem({ mensagem }: { mensagem: UIMessage }) {
  if (mensagem.role === "user") {
    const texto = mensagem.parts
      .filter((p) => p.type === "text")
      .map((p) => p.text)
      .join("");
    return (
      <li className="flex justify-end">
        <p className="max-w-[85%] rounded-2xl rounded-br-md bg-brand-royal px-3.5 py-2.5 text-sm leading-relaxed text-white">
          {texto}
        </p>
      </li>
    );
  }

  return (
    <>
      {mensagem.parts.map((parte, i) => {
        if (parte.type === "text") {
          if (!parte.text.trim()) return null;
          return (
            <li key={i} className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-slate-200/80 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-slate-600">
                <TextoFormatado texto={parte.text} />
              </div>
            </li>
          );
        }
        if (isToolUIPart(parte)) {
          const nome = getToolName(parte);
          const rotulo = ROTULOS_FERRAMENTAS[nome] ?? { andamento: `Consultando ${nome}…`, concluido: `${nome} consultado` };
          const concluida = parte.state === "output-available";
          const falhou = parte.state === "output-error";
          return (
            <li key={i} className="flex justify-start">
              <p
                className={`flex items-center gap-1.5 px-1 text-xs ${
                  falhou ? "text-red-600" : "text-slate-400"
                }`}
              >
                {concluida || falhou ? (
                  <span className={`h-1.5 w-1.5 rounded-full ${falhou ? "bg-red-500" : "bg-emerald-400"}`} />
                ) : (
                  <LoaderIcon className="h-3 w-3 animate-spin" />
                )}
                {falhou ? `Falha ao consultar dados (${nome})` : concluida ? rotulo.concluido : rotulo.andamento}
              </p>
            </li>
          );
        }

        return null;
      })}
    </>
  );
}
