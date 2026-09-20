import Link from "next/link";
import { AcoesCliente } from "@/components/clientes/acoes/AcoesCliente";
import { ArrowRightIcon, ChevronRightIcon } from "@/components/ui/icons";
import { BadgeTeste } from "@/components/ui/Badge";
import { ScorePill } from "@/components/ui/ScorePill";
import { formatCurrencyBRLOuTraco } from "@/lib/utils/formatacao";
import { TAMANHO_RESUMO_FILA } from "@/lib/painel/clientes";
import type { ClientePainel } from "@/lib/painel/tipos";

const HREF_FILA_COMPLETA = "/clientes?ordem=prioridade";

export function FilaDoDia({
  clientes,
  mensagemVazia = "Nenhum cliente na fila hoje.",
}: {
  clientes: ClientePainel[];
  mensagemVazia?: string;
}) {
  const listaFiltrada = clientes;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3 p-5">
        <div>
          <h2 className="text-xl font-bold text-brand-ink">Breve resumo da sua fila hoje</h2>
          <p className="mt-1 text-sm text-slate-500">
            Os {TAMANHO_RESUMO_FILA} clientes que mais merecem atenção, ordenados por prioridade
            (risco × impacto financeiro).
          </p>
        </div>

        <Link
          href={HREF_FILA_COMPLETA}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-200 transition-colors hover:bg-slate-50 hover:ring-slate-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-royal"
        >
          Ver fila completa
          <ArrowRightIcon className="h-4 w-4" />
        </Link>
      </div>

      {listaFiltrada.length === 0 && (
        <p className="border-t border-slate-100 px-5 py-10 text-center text-sm text-slate-500">
          {mensagemVazia}
        </p>
      )}

      <div
        className={`scroll-slim hidden overflow-x-auto ${listaFiltrada.length === 0 ? "" : "lg:block"}`}
      >
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-y border-slate-100 text-xs text-slate-500">
              <th className="py-3 pr-3 pl-5 font-semibold">#</th>
              <th className="py-3 pr-4 font-semibold">Cliente</th>
              <th className="py-3 pr-4 font-semibold">MRR</th>
              <th className="py-3 pr-4 font-semibold">Receita em risco (ano)</th>
              <th className="py-3 pr-4 font-semibold">Prioridade</th>
              <th className="py-3 pr-4 font-semibold">Risco</th>
              <th className="py-3 pr-4 font-semibold">Principais sinais</th>
              <th className="py-3 pr-3 text-right font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody>
            {listaFiltrada.map((cliente, index) => (
              <tr
                key={cliente.id}
                className="border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50/70"
              >
                <td className="w-10 py-3.5 pl-5 text-sm font-semibold text-slate-400">
                  {index + 1}
                </td>
                <td className="py-3.5 pr-4">
                  <Link href={`/clientes/${cliente.id}`} className="block">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-brand-royal">{cliente.nome}</p>
                      {cliente.teste && <BadgeTeste origem={cliente.testeOrigem} />}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {[cliente.id, cliente.segmento, cliente.porte].filter(Boolean).join(" · ")}
                    </p>
                  </Link>
                </td>
                <td className="py-3.5 pr-4 text-sm font-medium whitespace-nowrap text-slate-700">
                  {formatCurrencyBRLOuTraco(cliente.mrr)}
                </td>
                <td className="py-3.5 pr-4">
                  <p className="text-sm font-bold whitespace-nowrap text-red-600">
                    {formatCurrencyBRLOuTraco(cliente.receitaAnualRisco)}
                  </p>
                </td>
                <td className="py-3.5 pr-4">
                  <PrioridadeBadge valor={cliente.scorePrioridade} />
                </td>
                <td className="py-3.5 pr-4">
                  <div className="flex items-center gap-1.5">
                    <ScorePill
                      score={cliente.scoreRisco}
                      max={cliente.scoreMax}
                      faixa={cliente.faixaRisco}
                      size="sm"
                    />
                    <TendenciaIcon tendencia={cliente.tendenciaScore} />
                  </div>
                </td>
                <td className="max-w-xs py-3.5 pr-4">
                  <p className="text-xs leading-snug text-slate-500">{cliente.resumoAlerta}</p>
                </td>
                <td className="py-3.5 pr-3">
                  <div className="flex justify-end">
                    <AcoesCliente clienteId={cliente.id} clienteLabel={cliente.nome} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-slate-100 border-t border-slate-100 lg:hidden">
        {listaFiltrada.map((cliente, index) => (
          <li key={cliente.id}>
            <Link
              href={`/clientes/${cliente.id}`}
              className="flex items-center gap-3 px-5 py-3 active:bg-slate-50"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-brand-ink">{cliente.nome}</p>
                  {cliente.teste && <BadgeTeste origem={cliente.testeOrigem} />}
                </div>
                <p className="truncate text-xs text-slate-400">
                  {[cliente.id, cliente.segmento, cliente.porte].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold text-red-600">
                  {formatCurrencyBRLOuTraco(cliente.receitaAnualRisco)}
                </p>
                <p className="text-xs text-slate-400">
                  Prioridade {Math.round(cliente.scorePrioridade)} · Risco {cliente.scoreRisco}
                </p>
              </div>
              <ChevronRightIcon className="h-4 w-4 shrink-0 text-slate-300" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PrioridadeBadge({ valor }: { valor: number }) {
  return (
    <span
      title="Risco × (0,5 + impacto financeiro relativo na carteira)"
      className="inline-flex h-8 min-w-10 items-center justify-center rounded-lg bg-brand-navy px-2 text-sm font-bold text-white tabular-nums"
    >
      {Math.round(valor)}
    </span>
  );
}

function TendenciaIcon({ tendencia }: { tendencia: ClientePainel["tendenciaScore"] }) {
  if (tendencia === "subindo") {
    return (
      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-50 text-red-500">
        <ChevronRightIcon className="h-3 w-3 -rotate-90" />
      </span>
    );
  }
  if (tendencia === "descendo") {
    return (
      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
        <ChevronRightIcon className="h-3 w-3 rotate-90" />
      </span>
    );
  }
  return null;
}
