"use client";

import Link from "next/link";
import { useState } from "react";
import { AcoesCliente } from "@/components/AcoesCliente";
import { ChevronDownIcon, ChevronRightIcon } from "@/components/icons";
import { ScorePill } from "@/components/ui/ScorePill";
import { formatCurrencyBRL } from "@/lib/format";
import type { Cliente } from "@/lib/mock-data";

const segmentos = ["Todos os segmentos", "Varejo", "Saúde", "Educação", "Financeiro"];

export function FilaDoDia({ clientes }: { clientes: Cliente[] }) {
  const [segmento, setSegmento] = useState(segmentos[0]);
  const [menuOpen, setMenuOpen] = useState(false);

  const listaFiltrada =
    segmento === segmentos[0] ? clientes : clientes.filter((c) => c.segmento === segmento);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 p-5 pb-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Sua fila do dia</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Ordenada por receita em risco. Foque no que mais importa.
          </p>
        </div>

        <div
          className="relative"
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) setMenuOpen(false);
          }}
        >
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            {segmento}
            <ChevronDownIcon className="h-3.5 w-3.5" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
              {segmentos.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setSegmento(s);
                    setMenuOpen(false);
                  }}
                  className={`block w-full px-3 py-2 text-left text-xs font-medium hover:bg-slate-50 ${
                    s === segmento ? "text-brand-royal" : "text-slate-600"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Desktop: tabela */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full border-collapse">
          <tbody>
            {listaFiltrada.map((cliente, index) => (
              <tr key={cliente.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                <td className="w-10 py-3 pl-5 text-sm font-semibold text-slate-400">
                  {index + 1}
                </td>
                <td className="py-3 pr-4">
                  <Link href={`/clientes/${cliente.id}`} className="block">
                    <p className="text-sm font-semibold text-slate-900 hover:text-brand-royal">
                      {cliente.id}
                    </p>
                    <p className="text-xs text-slate-500">
                      {cliente.segmento} · {cliente.porte}
                    </p>
                  </Link>
                </td>
                <td className="py-3 pr-4 text-sm text-slate-600">
                  {formatCurrencyBRL(cliente.mrr)}
                </td>
                <td className="py-3 pr-4">
                  <p className="text-sm font-semibold text-red-600">
                    {formatCurrencyBRL(cliente.receitaAnualRisco)}
                  </p>
                </td>
                <td className="py-3 pr-4">
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
                <td className="max-w-xs py-3 pr-4">
                  <p className="text-xs leading-snug text-slate-500">{cliente.resumoAlerta}</p>
                </td>
                <td className="py-3 pr-3">
                  <AcoesCliente clienteId={cliente.id} clienteLabel={cliente.segmento} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: lista compacta */}
      <ul className="divide-y divide-slate-100 lg:hidden">
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
                <p className="text-sm font-semibold text-slate-900">{cliente.id}</p>
                <p className="truncate text-xs text-slate-500">
                  {cliente.segmento} · {cliente.porte}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold text-red-600">
                  {formatCurrencyBRL(cliente.receitaAnualRisco)}
                </p>
                <p className="text-xs text-slate-400">Score {cliente.scoreRisco}</p>
              </div>
              <ChevronRightIcon className="h-4 w-4 shrink-0 text-slate-300" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TendenciaIcon({ tendencia }: { tendencia: Cliente["tendenciaScore"] }) {
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
