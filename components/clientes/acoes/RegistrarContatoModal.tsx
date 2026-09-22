"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { vibrar } from "@/lib/ui/tatil";
import { XIcon } from "@/components/ui/icons";
import { TIPOS_CONTATO } from "@/lib/contatos/constantes";

const proximosPassos = [
  "Agendar reunião de alinhamento",
  "Enviar proposta comercial",
  "Escalar para time técnico",
  "Aguardar retorno do cliente",
  "Registrar no CRM",
];

export function RegistrarContatoModal({
  open,
  onOpenChange,
  clienteId,
  clienteLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteId: string;
  clienteLabel: string;
}) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (!open) return null;

  function handleClose() {
    setEnviado(false);
    setErro(null);
    setEnviando(false);
    onOpenChange(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const proximoPassoEm = form.get("proximo_passo_em");

    setErro(null);
    setEnviando(true);
    try {
      const resposta = await fetch("/api/contatos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente_id: clienteId,
          tipo: form.get("tipo"),
          realizado_em: form.get("realizado_em"),
          resumo: form.get("resumo"),
          proximo_passo: form.get("proximo_passo") || undefined,
          proximo_passo_em: proximoPassoEm || undefined,
        }),
      });
      if (!resposta.ok) {
        const corpo = await resposta.json().catch(() => null);
        setErro(corpo?.erro ?? "Não foi possível registrar o contato.");
        setEnviando(false);
        return;
      }
      vibrar("confirmacao");
      setEnviado(true);

      router.refresh();
      setTimeout(handleClose, 900);
    } catch {
      setErro("Falha de conexão. Tente novamente.");
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 bg-slate-900/40"
        onClick={handleClose}
      />

      <div className="relative flex max-h-[90dvh] w-full max-w-md flex-col rounded-xl bg-white shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">Registrar contato</h2>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Fechar"
          >
            <XIcon className="h-4.5 w-4.5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
          <Field label="Cliente">
            <input
              type="text"
              value={`${clienteId} – ${clienteLabel}`}
              disabled
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
            />
          </Field>

          <Field label="Tipo de contato">
            <select
              name="tipo"
              required
              defaultValue=""
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-brand-royal focus:outline-none"
            >
              <option value="" disabled>
                Selecione
              </option>
              {Object.entries(TIPOS_CONTATO).map(([codigo, rotulo]) => (
                <option key={codigo} value={codigo}>
                  {rotulo}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Data">
            <input
              type="date"
              name="realizado_em"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-brand-royal focus:outline-none"
            />
          </Field>

          <Field label="Resumo da conversa">
            <textarea
              name="resumo"
              required
              rows={3}
              placeholder="Descreva os principais pontos..."
              className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-royal focus:outline-none"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Próximo passo">
              <select
                name="proximo_passo"
                defaultValue=""
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-brand-royal focus:outline-none"
              >
                <option value="">Nenhum</option>
                {proximosPassos.map((passo) => (
                  <option key={passo} value={passo}>
                    {passo}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Data prevista">
              <input
                type="date"
                name="proximo_passo_em"
                placeholder="dd/mm/aaaa"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-brand-royal focus:outline-none"
              />
            </Field>
          </div>

          {erro && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
              {erro}
            </p>
          )}
          {enviado && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
              Contato registrado com sucesso.
            </p>
          )}

          <div className="mt-1 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={enviando || enviado}>
              {enviando ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}
