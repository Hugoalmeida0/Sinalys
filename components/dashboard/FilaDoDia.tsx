"use client";

import Link from "next/link";
import { useState } from "react";
import { AcoesCliente } from "@/components/AcoesCliente";
import { ChevronRightIcon } from "@/components/icons";
import { Select } from "@/components/ui/Select";
import { ScorePill } from "@/components/ui/ScorePill";
import { formatCurrencyBRL } from "@/lib/format";
import type { Cliente } from "@/lib/mock-data";

const segmentos = ["Todos os segmentos", "Varejo", "Saúde", "Educação", "Financeiro"];

export function FilaDoDia({ clientes }: { clientes: Cliente[] }) {
  const [segmento, setSegmento] = useState(segmentos[0]);

  const listaFiltrada =
    segmento === segmentos[0] ? clientes : clientes.filter((c) => c.segmento === segmento);

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3 p-5">
        <div>
          <h2 className="text-xl font-bold text-brand-ink">Sua fila do dia</h2>
          <p className="mt-1 text-sm text-slate-500">
            Ordenada por receita em risco. Foque no que mais importa.
          </p>
        </div>

        <Select
          value={segmento}
          options={segmentos.map((v) => ({ value: v, label: v }))}
          onChange={setSegmento}
          className="w-full shrink-0 sm:w-52"
        />
      </div>

      {/* Desktop: tabela */}
      <div className="scroll-slim hidden overflow-x-auto lg:block">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-y border-slate-100 text-xs text-slate-500">
              <th className="py-3 pr-3 pl-5 font-semibold">#</th>
              <th className="py-3 pr-4 font-semibold">Cliente</th>
              <th className="py-3 pr-4 font-semibold">MRR</th>
              <th className="py-3 pr-4 font-semibold">Receita em risco (ano)</th>
              <th className="py-3 pr-4 font-semibold">Score</th>
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
                    <p className="text-sm font-semibold text-brand-royal">{cliente.nome}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {cliente.id} · {cliente.segmento} · {cliente.porte}
                    </p>
                  </Link>
                </td>
                <td className="py-3.5 pr-4 text-sm font-medium whitespace-nowrap text-slate-700">
                  {formatCurrencyBRL(cliente.mrr)}
                </td>
                <td className="py-3.5 pr-4">
                  <p className="text-sm font-bold whitespace-nowrap text-red-600">
                    {formatCurrencyBRL(cliente.receitaAnualRisco)}
                  </p>
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

      {/* Mobile: lista compacta */}
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
                <p className="truncate text-sm font-semibold text-brand-ink">{cliente.nome}</p>
                <p className="truncate text-xs text-slate-400">
                  {cliente.id} · {cliente.segmento} · {cliente.porte}
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
