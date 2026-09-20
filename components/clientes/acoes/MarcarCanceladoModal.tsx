"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { XIcon } from "@/components/ui/icons";
import { MOTIVOS_CANCELAMENTO, CODIGOS_MOTIVO_CANCELAMENTO } from "@/lib/cancelamento/constantes";

export function MarcarCanceladoModal({
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
    setEnviando(false);
    setEnviado(false);
    setErro(null);
    onOpenChange(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setErro(null);
    setEnviando(true);
    try {
      const resposta = await fetch("/api/eventos/cancelar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente_id: clienteId,
          motivo_categoria: form.get("motivo_categoria"),
          motivo_detalhe: form.get("motivo_detalhe"),
          acao_realizada: form.get("acao_realizada") || undefined,
        }),
      });
      if (!resposta.ok) {
        const corpo = await resposta.json().catch(() => null);
        setErro(corpo?.erro ?? "Não foi possível registrar o cancelamento.");
        setEnviando(false);
        return;
      }
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

      <div className="relative w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">Marcar como cancelado</h2>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Fechar"
          >
            <XIcon className="h-4.5 w-4.5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 py-5">
          <p className="text-sm text-slate-500">
            <span className="font-semibold text-slate-700">
              {clienteId} – {clienteLabel}
            </span>{" "}
            será registrado como <span className="font-semibold text-red-600">cancelado</span>. O
            motivo entra no relatório de causas de cancelamento da carteira.
          </p>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-600">Motivo principal</span>
            <select
              name="motivo_categoria"
              required
              defaultValue=""
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-royal focus:outline-none"
            >
              <option value="" disabled>
                Selecione um motivo
              </option>
              {CODIGOS_MOTIVO_CANCELAMENTO.map((codigo) => (
                <option key={codigo} value={codigo}>
                  {MOTIVOS_CANCELAMENTO[codigo]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-600">Detalhe (opcional)</span>
            <textarea
              name="motivo_detalhe"
              rows={2}
              placeholder="Ex.: comparou com concorrente que oferece o mesmo módulo sem custo adicional."
              className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-royal focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-600">
              O que foi tentado antes do cancelamento (opcional)
            </span>
            <textarea
              name="acao_realizada"
              rows={2}
              placeholder="Se algo foi tentado e não foi suficiente, descreva aqui — ajuda a IA a não repetir a mesma recomendação com clientes parecidos."
              className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-royal focus:outline-none"
            />
          </label>

          {erro && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
              {erro}
            </p>
          )}
          {enviado && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
              Cancelamento registrado.
            </p>
          )}

          <div className="mt-1 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={enviando || enviado}>
              {enviando ? "Registrando..." : "Confirmar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
