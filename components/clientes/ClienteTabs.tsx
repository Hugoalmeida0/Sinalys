"use client";

import { useState, type ComponentType, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangleIcon,
  ArrowDownIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  CalendarIcon,
  DollarIcon,
  LoaderIcon,
  ReportsIcon,
  TargetIcon,
  type IconProps,
} from "@/components/icons";
import { ScoreEvolucaoChart } from "@/components/clientes/ScoreEvolucaoChart";
import { SimuladorCenarios } from "@/components/clientes/SimuladorCenarios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { AssistantCard } from "@/components/ui/AssistantCard";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { SoftBadge } from "@/components/ui/Badge";
import { RegistrarContatoTrigger } from "@/components/RegistrarContatoTrigger";
import { formatCurrencyBRLOuTraco, mesAnoPtBR, tempoDesde } from "@/lib/format";
import { useAnaliseIA, type PlanoIA } from "@/lib/ia/hooks/useAnaliseIA";
import { ConteudoAnaliseIA } from "@/components/ia/ConteudoAnaliseIA";
import type { DetalheClientePainel as DetalheCliente } from "@/lib/painel/detalhe";
import {
  faixaRiscoLabel,
  faixaRiscoTextClasses,
  severidadeChipClasses,
  severidadeClasses,
  severidadeLabel,
  severidadeNome,
} from "@/lib/risk";

const tabs = ["Visão geral", "Sinais de risco", "Simulador", "Plano de ação"] as const;

type Tab = (typeof tabs)[number];

export function ClienteTabs({ detalhe }: { detalhe: DetalheCliente }) {
  const [tab, setTab] = useState<Tab>("Visão geral");

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="scroll-slim -mb-2 flex gap-2 overflow-x-auto border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`shrink-0 border-b-2 px-3 py-3 text-sm font-semibold whitespace-nowrap transition-colors ${
              tab === t
                ? "border-brand-royal text-brand-royal"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <StatsRow detalhe={detalhe} />

      {tab === "Visão geral" && <VisaoGeral detalhe={detalhe} />}
      {tab === "Sinais de risco" && <SinaisDeRisco detalhe={detalhe} />}
      {tab === "Simulador" && <SimuladorCenarios base={detalhe.simulacao} clienteId={detalhe.id} />}
      {tab === "Plano de ação" && <PlanoDeAcao detalhe={detalhe} />}
    </div>
  );
}

function StatsRow({ detalhe }: { detalhe: DetalheCliente }) {
  // MRR desconhecido: o card mostra "—" em vez de R$ 0 e não inventa variação nem múltiplo.
  const multiplo =
    detalhe.mrr && detalhe.receitaAnualRisco != null
      ? Math.round(detalhe.receitaAnualRisco / detalhe.mrr)
      : null;
  const variacao = detalhe.variacaoMrr;
  const subiu = variacao != null && variacao >= 0;
  const pctScore = Math.round((detalhe.scoreRisco / detalhe.scoreMax) * 100);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        icone={DollarIcon}
        tom="royal"
        label="Receita mensal (MRR)"
        valor={formatCurrencyBRLOuTraco(detalhe.mrr)}
        rodape={
          variacao == null ? (
            <span className="text-slate-400">
              {detalhe.mrr == null ? "Receita não mapeada" : "Sem mês anterior para comparar"}
            </span>
          ) : (
            <span
              className={`flex items-center gap-1 font-semibold ${
                subiu ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {subiu ? (
                <ArrowUpIcon className="h-3.5 w-3.5" />
              ) : (
                <ArrowDownIcon className="h-3.5 w-3.5" />
              )}
              {subiu ? "+" : ""}
              {variacao}% vs. mês anterior
            </span>
          )
        }
      />

      <StatCard
        icone={AlertTriangleIcon}
        tom="vermelho"
        label="Receita em risco (ano)"
        valor={formatCurrencyBRLOuTraco(detalhe.receitaAnualRisco)}
        valorClasse="text-red-600"
        rodape={multiplo == null ? "Sem receita mapeada" : `${multiplo}x o MRR atual`}
      />

      <StatCard
        icone={CalendarIcon}
        tom="royal"
        label="Cliente desde"
        valor={mesAnoPtBR(detalhe.clienteDesde)}
        rodape={tempoDesde(detalhe.clienteDesde)}
      />

      <StatCard
        icone={ReportsIcon}
        tom="royal"
        label="Score de risco"
        valor={`${detalhe.scoreRisco}/${detalhe.scoreMax}`}
        rodape={
          <>
            <span className="mb-2 block h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <span
                className="block h-full rounded-full bg-gradient-to-r from-amber-400 to-red-600"
                style={{ width: `${pctScore}%` }}
              />
            </span>
            <span className={`font-semibold ${faixaRiscoTextClasses[detalhe.faixaRisco]}`}>
              {faixaRiscoLabel[detalhe.faixaRisco]}
            </span>
          </>
        }
      />
    </div>
  );
}

const tonsStat = {
  royal: "bg-brand-pale text-brand-royal",
  vermelho: "bg-red-50 text-red-500",
} as const;

function StatCard({
  icone: Icon,
  tom,
  label,
  valor,
  valorClasse = "text-brand-ink",
  rodape,
}: {
  icone: ComponentType<IconProps>;
  tom: keyof typeof tonsStat;
  label: string;
  valor: string;
  valorClasse?: string;
  rodape?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
      <div className="flex items-start gap-4">
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tonsStat[tom]}`}
        >
          <Icon className="h-5.5 w-5.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-slate-500">{label}</p>
          <p className={`mt-1 truncate text-2xl font-bold ${valorClasse}`}>{valor}</p>
          {rodape && <div className="mt-1.5 text-xs text-slate-400">{rodape}</div>}
        </div>
      </div>
    </div>
  );
}

const periodos = [
  { value: "12", label: "Últimos 12 meses" },
  { value: "6", label: "Últimos 6 meses" },
  { value: "3", label: "Últimos 3 meses" },
];

function VisaoGeral({ detalhe }: { detalhe: DetalheCliente }) {
  const [periodo, setPeriodo] = useState("12");
  const pontos = detalhe.evolucaoScore.slice(-Number(periodo));

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <Card className="flex flex-col">
          <CardHeader className="items-center">
            <CardTitle className="text-lg">Evolução do score de risco</CardTitle>
            <Select
              value={periodo}
              options={periodos}
              onChange={setPeriodo}
              className="w-48 shrink-0"
            />
          </CardHeader>
          <CardContent className="flex flex-1 items-center">
            <ScoreEvolucaoChart pontos={pontos} scoreMax={detalhe.scoreMax} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="items-center">
            <CardTitle className="text-lg">Sinais de risco detectados</CardTitle>
            <button
              type="button"
              className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-brand-royal hover:underline"
            >
              Ver todos ({detalhe.evidencias.length})
              <ArrowRightIcon className="h-3.5 w-3.5" />
            </button>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y divide-slate-100">
              {detalhe.evidencias.map((ev) => (
                <li key={ev.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${severidadeClasses[ev.severidade]}`}
                  >
                    <AlertTriangleIcon className="h-4.5 w-4.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug font-semibold text-brand-ink">
                      {ev.titulo}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Severidade {severidadeNome[ev.severidade]}
                    </p>
                  </div>
                  <SoftBadge className={`shrink-0 ${severidadeChipClasses[ev.severidade]}`}>
                    {severidadeLabel[ev.severidade]}
                  </SoftBadge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <Card>
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-500">
              <TargetIcon className="h-5.5 w-5.5" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-bold text-brand-ink">Por que este cliente está em risco</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                {detalhe.explicacaoRisco}
              </p>
              <p className="mt-3 text-xs text-slate-400">
                {detalhe.resumoCliente}
              </p>
            </div>
          </CardContent>
        </Card>

        <AssistantCard
          titulo="Quer um resumo inteligente?"
          descricao="Converse com o assistente da Sinalys e receba uma análise completa deste cliente, com insights, riscos e recomendações personalizadas."
          variante="insight"
          assunto={`Faça uma análise completa do cliente ${detalhe.id}`}
        />
      </div>
    </div>
  );
}

function SinaisDeRisco({ detalhe }: { detalhe: DetalheCliente }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Sinais de risco detectados</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col divide-y divide-slate-100">
          {detalhe.evidencias.map((ev) => (
            <li key={ev.id} className="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${severidadeClasses[ev.severidade]}`}
              >
                <AlertTriangleIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-brand-ink">{ev.titulo}</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Severidade {severidadeNome[ev.severidade]}
                </p>
              </div>
              <SoftBadge className={`shrink-0 ${severidadeChipClasses[ev.severidade]}`}>
                {severidadeLabel[ev.severidade]}
              </SoftBadge>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function planoInicial(detalhe: DetalheCliente): PlanoIA | null {
  if (!detalhe.diagnosticoGeradoEm) return null;
  return {
    diagnostico: detalhe.avaliacaoIA,
    analiseLookalike: detalhe.analiseLookalike,
    acoes: detalhe.proximasAcoes.map((a) => a.titulo),
    geradoEm: detalhe.diagnosticoGeradoEm,
    origem: "cache",
  };
}

function PlanoDeAcao({ detalhe }: { detalhe: DetalheCliente }) {
  const router = useRouter();
  // Começa com o último diagnóstico persistido (vindo do servidor); depois de
  // uma análise, passa a refletir a resposta da rota sem esperar o refresh.
  const estado = useAnaliseIA(detalhe.id, planoInicial(detalhe));
  const { plano, analisando, analisar } = estado;

  async function analisarERecarregar() {
    // Reanalisar deve ignorar o cache (o usuário quer uma leitura nova); a
    // primeira análise pode reaproveitar um diagnóstico recente da mesma predição.
    const ok = await analisar(Boolean(plano));
    // O diagnóstico foi persistido: sincroniza visão geral e header com o servidor.
    if (ok) router.refresh();
  }

  const total = plano?.acoes.length ?? 0;
  const feitas = plano ? plano.acoes.filter((_, i) => estado.concluidas[i]).length : 0;

  return (
    <Card>
      <CardHeader>
        <div className="min-w-0">
          <CardTitle className="text-lg">Plano de ação recomendado</CardTitle>
          <p className="mt-1 text-sm text-slate-500">
            {plano
              ? `${feitas} de ${total} ações concluídas`
              : "Nenhum plano gerado para este cliente ainda"}
          </p>
        </div>
        <Button onClick={analisarERecarregar} disabled={analisando} className="shrink-0" aria-live="polite">
          {analisando ? (
            <>
              <LoaderIcon className="h-4 w-4 animate-spin" />
              Analisando…
            </>
          ) : (
            <>
              <TargetIcon className="h-4 w-4" />
              {plano ? "Reanalisar cliente" : "Analisar cliente"}
            </>
          )}
        </Button>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        <ConteudoAnaliseIA
          estado={estado}
          textoVazio="A IA cruza os sinais de risco deste cliente com casos parecidos do histórico da sua empresa e devolve um diagnóstico e um plano de ação estruturado."
        />
        <RegistrarContatoTrigger clienteId={detalhe.id} clienteLabel={detalhe.nome} fullWidth />
      </CardContent>
    </Card>
  );
}
