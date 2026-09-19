"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRightIcon, SearchIcon } from "@/components/icons";
import { Badge } from "@/components/ui/Badge";
import { ScorePill } from "@/components/ui/ScorePill";
import { formatCurrencyBRL } from "@/lib/format";
import type { Cliente, FaixaRisco } from "@/lib/mock-data";
import { faixaRiscoLabel, faixaRiscoSoftClasses } from "@/lib/risk";

const filtros: { label: string; value: FaixaRisco | "todos" }[] = [
  { label: "Todos", value: "todos" },
  { label: "Crítico", value: "critico" },
  { label: "Alerta", value: "alerta" },
  { label: "Atenção", value: "atencao" },
  { label: "Saudável", value: "saudavel" },
];

export function ClientesTable({ clientes }: { clientes: Cliente[] }) {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<FaixaRisco | "todos">("todos");

  const lista = useMemo(() => {
    return clientes
      .filter((c) => filtro === "todos" || c.faixaRisco === filtro)
      .filter((c) => {
        const termo = busca.trim().toLowerCase();
        if (!termo) return true;
        return (
          c.id.toLowerCase().includes(termo) || c.segmento.toLowerCase().includes(termo)
        );
      })
      .sort((a, b) => b.scoreRisco - a.scoreRisco);
  }, [clientes, busca, filtro]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por código ou segmento..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-3 pl-9 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-royal focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {filtros.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFiltro(f.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                filtro === f.value
                  ? "bg-brand-navy text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <ul className="divide-y divide-slate-100">
        {lista.map((cliente) => (
          <li key={cliente.id}>
            <Link
              href={`/clientes/${cliente.id}`}
              className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/60"
            >
              <ScorePill
                score={cliente.scoreRisco}
                max={cliente.scoreMax}
                faixa={cliente.faixaRisco}
              />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900">{cliente.id}</p>
                  <Badge className={faixaRiscoSoftClasses[cliente.faixaRisco]}>
                    {faixaRiscoLabel[cliente.faixaRisco]}
                  </Badge>
                </div>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {cliente.segmento} · {cliente.porte} · {cliente.tipo}
                </p>
                <p className="mt-1 hidden truncate text-xs text-slate-400 sm:block">
                  {cliente.resumoAlerta}
                </p>
              </div>

              <div className="hidden shrink-0 text-right sm:block">
                <p className="text-sm font-semibold text-slate-900">
                  {formatCurrencyBRL(cliente.mrr)}
                </p>
                <p className="text-xs text-slate-400">MRR</p>
              </div>

              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold text-red-600">
                  {formatCurrencyBRL(cliente.receitaAnualRisco)}
                </p>
                <p className="text-xs text-slate-400">em risco/ano</p>
              </div>

              <ChevronRightIcon className="h-4 w-4 shrink-0 text-slate-300" />
            </Link>
          </li>
        ))}

        {lista.length === 0 && (
          <li className="px-5 py-10 text-center text-sm text-slate-400">
            Nenhum cliente encontrado para esse filtro.
          </li>
        )}
      </ul>
    </div>
  );
}
