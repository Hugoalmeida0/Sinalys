"use client";

import { useState, type FormEvent } from "react";
import { ArrowUpRightIcon, CalendarIcon, CheckIcon } from "@/components/ui/icons";
import {
  MAX_TAMANHO_MENSAGEM_SOLICITACAO,
  MAX_TAMANHO_NOME_SOLICITANTE,
} from "@/lib/health/agendamento";

const CLASSE_BOTAO =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-brand-navy shadow-lg transition-colors hover:bg-brand-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-60";

const CLASSE_CAMPO =
  "w-full rounded-lg border border-puro/20 bg-puro/10 px-3 py-2 text-sm text-puro placeholder:text-puro/50 focus:border-puro/60 focus:bg-puro/15 focus:outline-none";

export function AgendarCall({ token, linkAgendamento }: { token: string; linkAgendamento: string | null }) {
  if (linkAgendamento) {
    return (
      <a href={linkAgendamento} target="_blank" rel="noopener noreferrer" className={CLASSE_BOTAO}>
        <CalendarIcon className="h-4.5 w-4.5" />
        Agendar call de alinhamento
        <ArrowUpRightIcon className="h-4 w-4" />
      </a>
    );
  }
  return <FormularioPedido token={token} />;
}

function FormularioPedido({ token }: { token: string }) {
  const [aberto, setAberto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const preferencia = form.get("preferencia_em");
    setErro(null);
    setEnviando(true);
    try {
      const resposta = await fetch("/api/health/agendamento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          nome: form.get("nome"),
          email: form.get("email") || undefined,

          preferencia_em: preferencia ? new Date(String(preferencia)).toISOString() : undefined,
          mensagem: form.get("mensagem") || undefined,
          site: form.get("site") || undefined,
        }),
      });
      if (!resposta.ok) {
        const corpo = await resposta.json().catch(() => null);
        setErro(corpo?.erro ?? "Não foi possível enviar o pedido.");
        return;
      }
      setEnviado(true);
    } catch {
      setErro("Falha de conexão. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <p className="inline-flex items-center gap-2 rounded-xl bg-puro/15 px-5 py-3 text-sm font-semibold text-puro ring-1 ring-puro/30">
        <CheckIcon className="h-4 w-4" />
        Pedido enviado! Seu time de sucesso vai entrar em contato para confirmar o horário.
      </p>
    );
  }

  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)} className={CLASSE_BOTAO}>
        <CalendarIcon className="h-4.5 w-4.5" />
        Agendar call de alinhamento
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex w-full max-w-md flex-col gap-3 text-left"
      aria-label="Pedir uma call de alinhamento"
    >
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-puro/80">Seu nome</span>
        <input
          name="nome"
          required
          maxLength={MAX_TAMANHO_NOME_SOLICITANTE}
          autoComplete="name"
          className={CLASSE_CAMPO}
          placeholder="Como devemos te chamar"
        />
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-puro/80">E-mail (opcional)</span>
          <input name="email" type="email" autoComplete="email" className={CLASSE_CAMPO} placeholder="voce@empresa.com" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-puro/80">Melhor horário (opcional)</span>
          <input name="preferencia_em" type="datetime-local" className={`${CLASSE_CAMPO} [color-scheme:dark]`} />
        </label>
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-puro/80">Sobre o que quer conversar? (opcional)</span>
        <textarea
          name="mensagem"
          rows={2}
          maxLength={MAX_TAMANHO_MENSAGEM_SOLICITACAO}
          className={`${CLASSE_CAMPO} resize-none`}
          placeholder="Ex.: revisar o plano, treinar o time, dúvidas sobre um recurso…"
        />
      </label>

      <input name="site" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

      {erro && (
        <p role="alert" className="rounded-lg bg-red-500/20 px-3 py-2 text-xs font-medium text-red-100 ring-1 ring-red-300/40">
          {erro}
        </p>
      )}

      <div className="mt-1 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="rounded-xl px-4 py-2.5 text-sm font-semibold text-puro/80 hover:bg-puro/10"
        >
          Cancelar
        </button>
        <button type="submit" disabled={enviando} className={CLASSE_BOTAO}>
          {enviando ? "Enviando…" : "Enviar pedido"}
        </button>
      </div>
    </form>
  );
}
