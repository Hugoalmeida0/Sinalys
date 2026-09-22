"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AcoesCliente } from "@/components/clientes/acoes/AcoesCliente";
import { PrioridadeBadge } from "@/components/dashboard/FilaDoDia";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  SearchIcon,
} from "@/components/ui/icons";
import { Button } from "@/components/ui/Button";
import { useEmBreve } from "@/components/ui/EmBreve";
import { ScorePill } from "@/components/ui/ScorePill";
import { Select } from "@/components/ui/Select";
import { BadgeTeste, SoftBadge } from "@/components/ui/Badge";
import { formatCurrencyBRLOuTraco, formatDateLongPtBR } from "@/lib/utils/formatacao";
import { compararPrioridade, FAIXAS_FILA_PADRAO } from "@/lib/painel/clientes";
import type { FaixaRisco } from "@/lib/risco/faixa";
import type { ClientePainel } from "@/lib/painel/tipos";
import { faixaRiscoLabelCurto } from "@/lib/risco/faixa";
import { faixaRiscoSoftClasses } from "@/lib/risco/estilos";

type FiltroRisco = FaixaRisco | "todos";

type FiltroSituacao = "ativos" | "inativos" | "todos";
export type Ordenacao = "prioridade" | "score" | "receita" | "mrr" | "atualizacao";

const opcoesSituacao: { value: FiltroSituacao; label: string }[] = [
  { value: "ativos", label: "Clientes ativos" },
  { value: "inativos", label: "Clientes inativos" },
  { value: "todos", label: "Ativos e inativos" },
];

const opcoesRisco: { value: FiltroRisco; label: string }[] = [
  { value: "todos", label: "Todos os riscos" },
  { value: "critico", label: "Crítico" },
  { value: "alerta", label: "Alerta" },
  { value: "atencao", label: "Atenção" },
  { value: "saudavel", label: "Saudável" },
];

const opcoesOrdenacao: { value: Ordenacao; label: string }[] = [
  { value: "prioridade", label: "Ordenar por prioridade" },
  { value: "score", label: "Ordenar por risco" },
  { value: "receita", label: "Ordenar por exposição" },
  { value: "mrr", label: "Ordenar por MRR" },
  { value: "atualizacao", label: "Ordenar por atualização" },
];

const POR_PAGINA = 8;

export function ClientesTable({
  clientes,
  ordemInicial = "prioridade",
}: {
  clientes: ClientePainel[];

  ordemInicial?: Ordenacao;
}) {
  const avisarEmBreve = useEmBreve();
  const [busca, setBusca] = useState("");
  const [situacao, setSituacao] = useState<FiltroSituacao>("ativos");
  const [risco, setRisco] = useState<FiltroRisco>("todos");
  const [segmento, setSegmento] = useState("todos");
  const [ordem, setOrdem] = useState<Ordenacao>(ordemInicial);
  const [pagina, setPagina] = useState(1);

  const opcoesSegmento = useMemo(() => {
    const unicos = Array.from(new Set(clientes.map((c) => c.segmento))).sort();
    return [
      { value: "todos", label: "Todos os segmentos" },
      ...unicos.map((s) => ({ value: s, label: s })),
    ];
  }, [clientes]);

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return clientes
      .filter((c) => situacao === "todos" || c.cancelado === (situacao === "inativos"))
      .filter((c) => risco === "todos" || c.faixaRisco === risco)
      .filter((c) => segmento === "todos" || c.segmento === segmento)
      .filter((c) => {
        if (!termo) return true;
        return (
          c.id.toLowerCase().includes(termo) ||
          c.nome.toLowerCase().includes(termo) ||
          c.segmento.toLowerCase().includes(termo)
        );
      })
      .sort((a, b) => {
        if (ordem === "prioridade") return compararPrioridade(a, b);
        if (ordem === "receita") return (b.receitaAnualRisco ?? -1) - (a.receitaAnualRisco ?? -1);
        if (ordem === "mrr") return (b.mrr ?? -1) - (a.mrr ?? -1);
        if (ordem === "atualizacao") return b.atualizadoEm.localeCompare(a.atualizadoEm);
        return b.scoreRisco - a.scoreRisco;
      });
  }, [clientes, busca, situacao, risco, segmento, ordem]);

  const totalPaginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const inicio = (paginaAtual - 1) * POR_PAGINA;
  const visiveis = lista.slice(inicio, inicio + POR_PAGINA);

  function aoFiltrar<T>(setter: (v: T) => void) {
    return (valor: T) => {
      setter(valor);
      setPagina(1);
    };
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-card">
      <div className="flex flex-col gap-3 p-5 xl:flex-row xl:items-center">
        <div className="relative w-full xl:max-w-sm">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={busca}
            onChange={(e) => aoFiltrar(setBusca)(e.target.value)}
            placeholder="Buscar por código, nome ou segmento..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2.5 pr-4 pl-11 text-sm text-slate-700 transition-colors placeholder:text-slate-400 focus:border-brand-royal focus:bg-white focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:ml-auto xl:flex xl:items-center">
          <Select
            value={situacao}
            options={opcoesSituacao}
            onChange={aoFiltrar(setSituacao)}
            className="xl:w-44"
          />
          <Select
            value={risco}
            options={opcoesRisco}
            onChange={aoFiltrar(setRisco)}
            className="xl:w-40"
          />
          <Select
            value={segmento}
            options={opcoesSegmento}
            onChange={aoFiltrar(setSegmento)}
            className="xl:w-52"
          />
          <Select
            value={ordem}
            options={opcoesOrdenacao}
            onChange={aoFiltrar(setOrdem)}
            className="xl:w-52"
          />
          <Button
            variant="secondary"
            onClick={() => avisarEmBreve("Exportar carteira")}
            className="justify-center sm:col-span-2 xl:col-auto"
          >
            <DownloadIcon className="h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      <div className="scroll-slim hidden overflow-x-auto lg:block">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-y border-slate-100 text-xs text-slate-500">
              <th className="py-3 pr-3 pl-5 font-semibold">Prioridade</th>
              <th className="py-3 pr-3 font-semibold">Risco</th>
              <th className="py-3 pr-3 font-semibold">Código</th>
              <th className="py-3 pr-3 font-semibold">Cliente</th>
              <th className="py-3 pr-3 font-semibold">Segmento</th>
              <th className="py-3 pr-3 font-semibold">MRR</th>
              <th className="py-3 pr-3 font-semibold">Exposição ponderada (ano)</th>
              <th className="py-3 pr-3 font-semibold">Principais sinais</th>
              <th className="py-3 pr-3 font-semibold">Última atualização</th>
              <th className="py-3 pr-5 text-right font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody>
            {visiveis.map((cliente) => (
              <tr
                key={cliente.id}
                className="border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50/70"
              >
                <td className="py-3.5 pr-3 pl-5">
                  <PrioridadeBadge valor={cliente.scorePrioridade} />
                </td>
                <td className="py-3.5 pr-3">
                  <ScorePill
                    score={cliente.scoreRisco}
                    max={cliente.scoreMax}
                    faixa={cliente.faixaRisco}
                  />
                </td>
                <td className="py-3.5 pr-3">
                  <Link
                    href={`/clientes/${cliente.id}`}
                    className="text-sm font-semibold text-slate-600 hover:text-brand-royal"
                  >
                    {cliente.id}
                  </Link>
                </td>
                <td className="py-3.5 pr-3">
                  <Link href={`/clientes/${cliente.id}`} className="block">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-brand-royal">{cliente.nome}</p>
                      {cliente.teste && <BadgeTeste origem={cliente.testeOrigem} />}
                      {cliente.cancelado && <BadgeCancelado />}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {cliente.porte} · {cliente.tipo}
                    </p>
                  </Link>
                </td>
                <td className="py-3.5 pr-3">
                  <SoftBadge>{cliente.segmento}</SoftBadge>
                </td>
                <td className="py-3.5 pr-3 text-sm font-medium whitespace-nowrap text-slate-700">
                  {formatCurrencyBRLOuTraco(cliente.mrr)}
                </td>
                <td
                  className={`py-3.5 pr-3 text-sm font-bold whitespace-nowrap ${
                    FAIXAS_FILA_PADRAO.includes(cliente.faixaRisco) ? "text-red-600" : "text-slate-700"
                  }`}
                >
                  {formatCurrencyBRLOuTraco(cliente.receitaAnualRisco)}
                </td>
                <td className="py-3.5 pr-3">
                  <ChipsDeSinais cliente={cliente} />
                </td>
                <td className="py-3.5 pr-3 text-sm whitespace-nowrap text-slate-500">
                  {formatDateLongPtBR(cliente.atualizadoEm)}
                </td>
                <td className="py-3.5 pr-5">
                  <div className="flex justify-end">
                    <AcoesCliente clienteId={cliente.id} clienteLabel={cliente.nome} compacto />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-slate-100 border-t border-slate-100 lg:hidden">
        {visiveis.map((cliente) => (
          <li key={cliente.id}>
            <Link
              href={`/clientes/${cliente.id}`}
              className="flex flex-col gap-3 px-5 py-4 active:bg-slate-50"
            >
              <div className="flex items-center gap-3">
                <ScorePill
                  score={cliente.scoreRisco}
                  max={cliente.scoreMax}
                  faixa={cliente.faixaRisco}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-bold text-brand-ink">{cliente.nome}</p>
                    {cliente.teste && <BadgeTeste origem={cliente.testeOrigem} />}
                    {cliente.cancelado && <BadgeCancelado />}
                  </div>
                  <p className="text-xs text-slate-400">
                    {cliente.id} · {cliente.porte} · {cliente.tipo}
                  </p>
                </div>
                <SoftBadge className={faixaRiscoSoftClasses[cliente.faixaRisco]}>
                  {faixaRiscoLabelCurto[cliente.faixaRisco]}
                </SoftBadge>
              </div>

              <ChipsDeSinais cliente={cliente} />

              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-slate-400">MRR</p>
                  <p className="text-sm font-semibold text-slate-700">
                    {formatCurrencyBRLOuTraco(cliente.mrr)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">Exposição/ano</p>
                  <p
                    className={`text-sm font-bold ${
                      FAIXAS_FILA_PADRAO.includes(cliente.faixaRisco) ? "text-red-600" : "text-slate-700"
                    }`}
                  >
                    {formatCurrencyBRLOuTraco(cliente.receitaAnualRisco)}
                  </p>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {lista.length === 0 && (
        <p className="border-t border-slate-100 px-5 py-12 text-center text-sm text-slate-400">
          Nenhum cliente encontrado para esse filtro.
        </p>
      )}

      {lista.length > 0 && (
        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row">
          <p className="text-sm text-slate-500">
            Mostrando {inicio + 1}–{inicio + visiveis.length} de {lista.length} clientes
          </p>

          <div className="flex items-center gap-1.5">
            <BotaoPagina
              aoClicar={() => setPagina((p) => Math.max(1, p - 1))}
              desabilitado={paginaAtual === 1}
              rotulo="Página anterior"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </BotaoPagina>

            {/* Os botões numerados não cabem em telas estreitas; lá vale só o
                indicador de posição entre as setas. */}
            <span className="px-2 text-sm font-semibold text-slate-600 tabular-nums sm:hidden">
              {paginaAtual} de {totalPaginas}
            </span>

            {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPagina(n)}
                aria-current={n === paginaAtual ? "page" : undefined}
                className={`hidden h-10 min-w-10 rounded-lg px-3 text-sm font-semibold transition-colors sm:inline-flex sm:items-center sm:justify-center ${
                  n === paginaAtual
                    ? "bg-brand-royal text-white"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {n}
              </button>
            ))}

            <BotaoPagina
              aoClicar={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              desabilitado={paginaAtual === totalPaginas}
              rotulo="Próxima página"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </BotaoPagina>
          </div>
        </div>
      )}
    </div>
  );
}

function BadgeCancelado() {
  return (
    <SoftBadge className="shrink-0 bg-slate-200 text-slate-600" title="Cliente cancelou o plano">
      Cancelado
    </SoftBadge>
  );
}

function ChipsDeSinais({ cliente }: { cliente: ClientePainel }) {
  const [primeiro, ...resto] = cliente.sinais;
  if (!primeiro) return null;

  const tomSaudavel = cliente.faixaRisco === "saudavel";

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <SoftBadge
        className={tomSaudavel ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}
      >
        {primeiro}
      </SoftBadge>
      {resto.length > 0 && <SoftBadge title={resto.join(" · ")}>+{resto.length}</SoftBadge>}
    </div>
  );
}

function BotaoPagina({
  children,
  aoClicar,
  desabilitado,
  rotulo,
}: {
  children: React.ReactNode;
  aoClicar: () => void;
  desabilitado: boolean;
  rotulo: string;
}) {
  return (
    <button
      type="button"
      onClick={aoClicar}
      disabled={desabilitado}
      aria-label={rotulo}
      className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 sm:h-10 sm:w-10"
    >
      {children}
    </button>
  );
}
