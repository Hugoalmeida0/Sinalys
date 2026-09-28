import { useRouter } from "@/lib/navegacao";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { vibrar } from "@/lib/ui/tatil";
import { XIcon } from "@/components/ui/icons";
import { apiFetch } from "@/lib/api";

export function MarcarResolvidoModal({
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
      const resposta = await apiFetch("/api/inteligencia/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente_id: clienteId,
          desfecho: "recuperado",
          acao_realizada: form.get("acao_realizada"),
        }),
      });
      if (!resposta.ok) {
        const corpo = await resposta.json().catch(() => null);
        setErro(corpo?.erro ?? "Não foi possível registrar o desfecho.");
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
          <h2 className="text-base font-semibold text-slate-900">Marcar como resolvido</h2>
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
          <p className="text-sm text-slate-500">
            <span className="font-semibold text-slate-700">
              {clienteId} – {clienteLabel}
            </span>{" "}
            será registrado como <span className="font-semibold text-emerald-600">recuperado</span>.
            Descreva o que foi feito: esse caso passa a orientar as recomendações da IA para
            clientes parecidos.
          </p>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-600">Ação realizada</span>
            <textarea
              name="acao_realizada"
              required
              minLength={10}
              rows={4}
              placeholder="Ex.: reunião com o gestor, renegociação de prazo e reonboarding do time..."
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
              Desfecho registrado. Obrigado pelo feedback!
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
