"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangleIcon,
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  DownloadIcon,
  FileTextIcon,
  MoreIcon,
  SearchIcon,
} from "@/components/ui/icons";
import { SoftBadge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { formatDateLongPtBR, formatTimePtBR } from "@/lib/utils/formatacao";
import { historicoIngestoes, type IngestaoRegistro, type StatusIngestao } from "@/lib/mock/dados";

const statusVisual: Record<
  StatusIngestao,
  { label: string; classes: string; icone: typeof CheckIcon }
> = {
  processado: {
    label: "Processado",
    classes: "bg-emerald-50 text-emerald-700",
    icone: CheckIcon,
  },
  com_erros: {
    label: "Com erros",
    classes: "bg-red-50 text-red-600",
    icone: AlertTriangleIcon,
  },
  em_processamento: {
    label: "Em processamento",
    classes: "bg-amber-50 text-amber-700",
    icone: ClockIcon,
  },
};

const periodos = [
  { value: "todos", label: "Todos os períodos" },
  { value: "7", label: "Últimos 7 dias" },
  { value: "30", label: "Últimos 30 dias" },
];

export function HistoricoIngestoes() {
  const [busca, setBusca] = useState("");
  const [periodo, setPeriodo] = useState("todos");

  const [limite, setLimite] = useState<number | null>(null);

  function mudarPeriodo(valor: string) {
    setPeriodo(valor);
    setLimite(valor === "todos" ? null : Date.now() - Number(valor) * 24 * 60 * 60 * 1000);
  }

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return historicoIngestoes
      .filter((i) => !termo || i.arquivo.toLowerCase().includes(termo))
      .filter((i) => limite === null || new Date(i.enviadoEm).getTime() >= limite);
  }, [busca, limite]);

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-card">
      <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-bold text-brand-ink">Histórico de ingestões</h2>
          <p className="mt-1 text-sm text-slate-500">
            Acompanhe os arquivos enviados e seus status de processamento.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row lg:shrink-0">
          <div className="relative sm:w-64">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar arquivo..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2.5 pr-4 pl-11 text-sm text-slate-700 transition-colors placeholder:text-slate-400 focus:border-brand-royal focus:bg-white focus:outline-none"
            />
          </div>
          <Select
            value={periodo}
            options={periodos}
            onChange={mudarPeriodo}
            className="sm:w-52"
            icone={<CalendarIcon className="h-4 w-4 shrink-0 text-slate-400" />}
          />
        </div>
      </div>

      <div className="scroll-slim hidden overflow-x-auto lg:block">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-y border-slate-100 text-xs text-slate-500">
              <th className="py-3 pr-3 pl-5 font-semibold">Arquivo</th>
              <th className="py-3 pr-3 font-semibold">Enviado em</th>
              <th className="py-3 pr-3 font-semibold">Registros</th>
              <th className="py-3 pr-3 font-semibold">Status</th>
              <th className="py-3 pr-3 font-semibold">Processado em</th>
              <th className="py-3 pr-5 font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((registro) => (
              <tr
                key={registro.id}
                className="border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50/70"
              >
                <td className="py-3.5 pr-3 pl-5">
                  <div className="flex items-center gap-3">
                    <IconeArquivo registro={registro} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-brand-ink">
                        {registro.arquivo}
                      </p>
                      <p className="text-xs text-slate-400">{registro.tamanho}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3.5 pr-3 text-sm whitespace-nowrap text-slate-500">
                  <p>{formatDateLongPtBR(registro.enviadoEm)}</p>
                  <p className="text-xs text-slate-400">{formatTimePtBR(registro.enviadoEm)}</p>
                </td>
                <td className="py-3.5 pr-3 text-sm font-semibold text-slate-700">
                  {registro.registros.toLocaleString("pt-BR")}
                </td>
                <td className="py-3.5 pr-3">
                  <ChipStatus status={registro.status} />
                </td>
                <td className="py-3.5 pr-3 text-sm whitespace-nowrap text-slate-500">
                  {registro.processadoEm ? (
                    <>
                      <p>{formatDateLongPtBR(registro.processadoEm)}</p>
                      <p className="text-xs text-slate-400">
                        {formatTimePtBR(registro.processadoEm)}
                      </p>
                    </>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
                <td className="py-3.5 pr-5">
                  <AcoesRegistro registro={registro} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-slate-100 border-t border-slate-100 lg:hidden">
        {lista.map((registro) => (
          <li key={registro.id} className="flex flex-col gap-3 px-5 py-4">
            <div className="flex items-center gap-3">
              <IconeArquivo registro={registro} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-brand-ink">
                  {registro.arquivo}
                </p>
                <p className="text-xs text-slate-400">
                  {registro.tamanho} · {registro.registros.toLocaleString("pt-BR")} registros
                </p>
              </div>
              <ChipStatus status={registro.status} />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-400">
                Enviado em {formatDateLongPtBR(registro.enviadoEm)}
              </p>
              <AcoesRegistro registro={registro} />
            </div>
          </li>
        ))}
      </ul>

      {lista.length === 0 && (
        <p className="border-t border-slate-100 px-5 py-12 text-center text-sm text-slate-400">
          Nenhuma ingestão encontrada.
        </p>
      )}
    </div>
  );
}

function IconeArquivo({ registro }: { registro: IngestaoRegistro }) {
  const pendente = registro.status === "em_processamento";

  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
        pendente ? "bg-slate-100 text-slate-400" : "bg-emerald-50 text-emerald-600"
      }`}
    >
      {registro.arquivo.toLowerCase().endsWith(".csv") ? "CSV" : "XLS"}
    </span>
  );
}

function ChipStatus({ status }: { status: StatusIngestao }) {
  const { label, classes, icone: Icon } = statusVisual[status];

  return (
    <SoftBadge className={`${classes} px-3 py-1.5`}>
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {label}
    </SoftBadge>
  );
}

function AcoesRegistro({ registro }: { registro: IngestaoRegistro }) {
  const pendente = registro.status === "em_processamento";
  const podeBaixar = registro.status === "processado";

  return (
    <div className="flex items-center gap-3">
      {podeBaixar && (
        <button
          type="button"
          className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 transition-colors hover:text-brand-royal"
        >
          <DownloadIcon className="h-4 w-4" />
          Baixar
        </button>
      )}
      <button
        type="button"
        disabled={pendente}
        className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 transition-colors hover:text-brand-royal disabled:cursor-not-allowed disabled:text-slate-300"
      >
        <FileTextIcon className="h-4 w-4" />
        Ver log
      </button>
      <button
        type="button"
        aria-label={`Mais opções para ${registro.arquivo}`}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
      >
        <MoreIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
