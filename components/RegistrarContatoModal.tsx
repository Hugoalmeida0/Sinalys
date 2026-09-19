"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { XIcon } from "@/components/icons";

const tiposContato = [
  "Ligação",
  "Reunião presencial",
  "Videochamada",
  "E-mail",
  "WhatsApp",
];

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
  const [enviado, setEnviado] = useState(false);

  if (!open) return null;

  function handleClose() {
    setEnviado(false);
    onOpenChange(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Mock: sem persistência real ainda — endpoint previsto na Task 5.3 (feedback loop).
    setEnviado(true);
    setTimeout(handleClose, 900);
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 py-5">
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
              required
              defaultValue=""
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-brand-royal focus:outline-none"
            >
              <option value="" disabled>
                Selecione
              </option>
              {tiposContato.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Data">
            <input
              type="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-brand-royal focus:outline-none"
            />
          </Field>

          <Field label="Resumo da conversa">
            <textarea
              required
              rows={3}
              placeholder="Descreva os principais pontos..."
              className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-royal focus:outline-none"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Próximo passo">
              <select
                defaultValue=""
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-brand-royal focus:outline-none"
              >
                <option value="" disabled>
                  Selecione
                </option>
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
                placeholder="dd/mm/aaaa"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-brand-royal focus:outline-none"
              />
            </Field>
          </div>

          {enviado && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
              Contato registrado com sucesso.
            </p>
          )}

          <div className="mt-1 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit">Salvar</Button>
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
