"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDownIcon, HeartHandshakeIcon, LoaderIcon, TargetIcon } from "@/components/icons";
import { ConteudoAnaliseIA } from "@/components/ia/ConteudoAnaliseIA";
import { MarcarResolvidoModal } from "@/components/MarcarResolvidoModal";
import { Button } from "@/components/ui/Button";
import { SoftBadge } from "@/components/ui/Badge";
import { useAnaliseIA } from "@/lib/ia/hooks/useAnaliseIA";
import { formatCurrencyBRL, formatDateLongPtBR } from "@/lib/format";
import type { ClientePainel } from "@/lib/painel/tipos";

export function CampanhaRecuperacaoLista({ clientes }: { clientes: ClientePainel[] }) {
  const [expandidoId, setExpandidoId] = useState<string | null>(null);

  if (clientes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-10 text-center shadow-card">
        <HeartHandshakeIcon className="h-10 w-10 text-slate-300" />
        <p className="text-sm text-slate-500">Nenhum cliente cancelado registrado até agora.</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-4">
      {clientes.map((cliente) => (
        <CardCliente
          key={cliente.id}
          cliente={cliente}
          expandido={expandidoId === cliente.id}
          onExpandir={() => setExpandidoId(cliente.id)}
          onColapsar={() => setExpandidoId(null)}
        />
      ))}
    </ul>
  );
}

function CardCliente({
  cliente,
  expandido,
  onExpandir,
  onColapsar,
}: {
  cliente: ClientePainel;
  expandido: boolean;
  onExpandir: () => void;
  onColapsar: () => void;
}) {
  const router = useRouter();
  const [recuperadoOpen, setRecuperadoOpen] = useState(false);
  const estado = useAnaliseIA(cliente.id);
  const { plano, analisando, analisar } = estado;

  async function analisarERecarregar() {
    const ok = await analisar();
    if (ok) router.refresh();
  }

  async function aoClicarAnalisarOuVer() {
    if (plano) {
      // Já existe um plano nesta sessão: o botão só abre/fecha a leitura.
      if (expandido) onColapsar();
      else onExpandir();
      return;
    }
    onExpandir();
    await analisarERecarregar();
  }

  return (
    <li className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-4 p-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-bold text-brand-ink">{cliente.nome}</span>
            <SoftBadge className="bg-slate-200 text-slate-600">Cancelado</SoftBadge>
          </div>
          <p className="mt-0.5 text-sm text-slate-500">
            {[cliente.segmento, cliente.porte, cliente.tipo].filter(Boolean).join(" · ") ||
              "Sem dados cadastrais"}
          </p>

          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-500">
            <span>
              <span className="font-semibold text-brand-ink">{formatCurrencyBRL(cliente.mrr)}</span> de
              MRR perdido
            </span>
            {cliente.canceladoEm && (
              <span>Cancelado em {formatDateLongPtBR(cliente.canceladoEm)}</span>
            )}
          </div>

          {cliente.sinais.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {cliente.sinais.map((sinal) => (
                <SoftBadge key={sinal} className="bg-red-50 text-red-700">
                  {sinal}
                </SoftBadge>
              ))}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          <Button variant="secondary" size="sm" onClick={() => setRecuperadoOpen(true)}>
            <HeartHandshakeIcon className="h-4 w-4" />
            Marcar como recuperado
          </Button>
          <Button size="sm" onClick={aoClicarAnalisarOuVer} disabled={analisando} aria-expanded={expandido}>
            {analisando ? (
              <>
                <LoaderIcon className="h-4 w-4 animate-spin" />
                Analisando…
              </>
            ) : plano ? (
              <>
                {expandido ? "Ocultar plano" : "Ver plano"}
                <ChevronDownIcon
                  className={`h-4 w-4 transition-transform ${expandido ? "rotate-180" : ""}`}
                />
              </>
            ) : (
              <>
                <TargetIcon className="h-4 w-4" />
                Analisar perfil
              </>
            )}
          </Button>
        </div>
      </div>

      {expandido && (
        <div className="border-t border-slate-100 p-5">
          {plano && (
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                onClick={analisarERecarregar}
                disabled={analisando}
                className="text-sm font-medium text-brand-royal hover:underline disabled:opacity-50"
              >
                Reanalisar com os dados mais recentes
              </button>
            </div>
          )}
          <ConteudoAnaliseIA
            estado={estado}
            textoVazio="A IA cruza o perfil deste cliente no momento do cancelamento com casos parecidos do histórico da sua empresa e sugere um plano para tentar reativá-lo."
          />
        </div>
      )}

      <MarcarResolvidoModal
        open={recuperadoOpen}
        onOpenChange={setRecuperadoOpen}
        clienteId={cliente.id}
        clienteLabel={cliente.nome}
      />
    </li>
  );
}
