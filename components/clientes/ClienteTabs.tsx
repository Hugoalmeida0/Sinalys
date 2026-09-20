"use client";

import { useState, type ComponentType, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangleIcon,
  ArrowDownIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  CalendarIcon,
  CheckIcon,
  DollarIcon,
  FileTextIcon,
  LoaderIcon,
  ReportsIcon,
  TargetIcon,
  type IconProps,
} from "@/components/icons";
import { ScoreEvolucaoChart } from "@/components/clientes/ScoreEvolucaoChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { AssistantCard } from "@/components/ui/AssistantCard";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { SoftBadge } from "@/components/ui/Badge";
import { RegistrarContatoTrigger } from "@/components/RegistrarContatoTrigger";
import { SinalysMascot } from "@/components/ui/SinalysMascot";
import { formatCurrencyBRL, formatDatePtBR, formatTimePtBR, mesAnoPtBR, tempoDesde } from "@/lib/format";
import type { DetalheClientePainel as DetalheCliente } from "@/lib/painel/detalhe";
import {
  faixaRiscoLabel,
  faixaRiscoTextClasses,
  severidadeChipClasses,
  severidadeClasses,
  severidadeLabel,
  severidadeNome,
} from "@/lib/risk";

const tabs = ["Visão geral", "Sinais de risco", "Plano de ação"] as const;

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
      {tab === "Plano de ação" && <PlanoDeAcao detalhe={detalhe} />}
    </div>
  );
}

function StatsRow({ detalhe }: { detalhe: DetalheCliente }) {
  const multiplo = Math.round(detalhe.receitaAnualRisco / detalhe.mrr);
  const subiu = detalhe.variacaoMrr >= 0;
  const pctScore = Math.round((detalhe.scoreRisco / detalhe.scoreMax) * 100);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        icone={DollarIcon}
        tom="royal"
        label="Receita mensal (MRR)"
        valor={formatCurrencyBRL(detalhe.mrr)}
        rodape={
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
            {detalhe.variacaoMrr}% vs. mês anterior
          </span>
        }
      />

      <StatCard
        icone={AlertTriangleIcon}
        tom="vermelho"
        label="Receita em risco (ano)"
        valor={formatCurrencyBRL(detalhe.receitaAnualRisco)}
        valorClasse="text-red-600"
        rodape={`${multiplo}x o MRR atual`}
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
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-pale text-brand-royal">
              <FileTextIcon className="h-5.5 w-5.5" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-bold text-brand-ink">Resumo do cliente</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
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

/** Plano gerado pela IA, na forma que a aba exibe. */
interface PlanoIA {
  diagnostico: string;
  analiseLookalike: string | null;
  acoes: string[];
  geradoEm: string | null;
}

function planoInicial(detalhe: DetalheCliente): PlanoIA | null {
  if (!detalhe.diagnosticoGeradoEm) return null;
  return {
    diagnostico: detalhe.avaliacaoIA,
    analiseLookalike: detalhe.analiseLookalike,
    acoes: detalhe.proximasAcoes.map((a) => a.titulo),
    geradoEm: detalhe.diagnosticoGeradoEm,
  };
}

function PlanoDeAcao({ detalhe }: { detalhe: DetalheCliente }) {
  const router = useRouter();
  // Começa com o último diagnóstico persistido (vindo do servidor); depois de
  // uma análise, passa a refletir a resposta da rota sem esperar o refresh.
  const [plano, setPlano] = useState<PlanoIA | null>(() => planoInicial(detalhe));
  const [analisando, setAnalisando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [concluidas, setConcluidas] = useState<Record<number, boolean>>({});

  async function analisar() {
    setAnalisando(true);
    setErro(null);
    try {
      const resposta = await fetch("/api/inteligencia/analisar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cliente_id: detalhe.id, trigger_source: "manual" }),
      });
      const corpo = await resposta.json().catch(() => ({}));
      if (!resposta.ok) {
        throw new Error(corpo?.erro ?? `Falha na análise (HTTP ${resposta.status}).`);
      }
      setPlano({
        diagnostico: corpo.diagnostico_principal,
        analiseLookalike: corpo.analise_lookalike ?? null,
        acoes: Array.isArray(corpo.plano_acao_imediato) ? corpo.plano_acao_imediato : [],
        geradoEm: new Date().toISOString(),
      });
      setConcluidas({});
      // O diagnóstico foi persistido: sincroniza visão geral e header com o servidor.
      router.refresh();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setAnalisando(false);
    }
  }

  const total = plano?.acoes.length ?? 0;
  const feitas = plano ? plano.acoes.filter((_, i) => concluidas[i]).length : 0;

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
        <Button onClick={analisar} disabled={analisando} className="shrink-0" aria-live="polite">
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
        {analisando && (
          <div className="flex items-start gap-3 rounded-xl bg-brand-pale px-4 py-3 text-sm text-brand-navy">
            <LoaderIcon className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
            <p>
              Cruzando os sinais do motor de risco com o histórico de casos parecidos e gerando o
              plano. Isso leva até um minuto.
            </p>
          </div>
        )}

        {erro && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{erro}</p>
          </div>
        )}

        {!plano && !analisando && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <SinalysMascot variante="insight" className="h-24 w-auto" />
            <p className="max-w-md text-sm leading-relaxed text-slate-500">
              A IA cruza os sinais de risco deste cliente com casos parecidos do histórico da sua
              empresa e devolve um diagnóstico e um plano de ação estruturado.
            </p>
          </div>
        )}

        {plano && (
          <>
            <section className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <h3 className="flex items-center gap-2 text-sm font-bold text-brand-ink">
                <AlertTriangleIcon className="h-4 w-4 text-red-500" />
                Diagnóstico
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{plano.diagnostico}</p>
            </section>

            {plano.analiseLookalike && (
              <section className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                <h3 className="flex items-center gap-2 text-sm font-bold text-brand-ink">
                  <ReportsIcon className="h-4 w-4 text-brand-royal" />O que o histórico diz
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {plano.analiseLookalike}
                </p>
              </section>
            )}

            <div>
              <h3 className="mb-2 text-sm font-bold text-brand-ink">Ações imediatas</h3>
              <ul className="flex flex-col gap-2">
                {plano.acoes.map((acao, index) => {
                  const feita = Boolean(concluidas[index]);
                  return (
                    <li key={index}>
                      <button
                        type="button"
                        onClick={() =>
                          setConcluidas((prev) => ({ ...prev, [index]: !prev[index] }))
                        }
                        className="flex w-full items-start gap-3 rounded-xl border border-slate-100 px-3.5 py-3 text-left transition-colors hover:bg-slate-50"
                      >
                        <span
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                            feita
                              ? "border-emerald-500 bg-emerald-500 text-white"
                              : "border-slate-300 text-transparent"
                          }`}
                        >
                          <CheckIcon className="h-3.5 w-3.5" />
                        </span>
                        <span
                          className={`text-sm leading-relaxed ${
                            feita ? "text-slate-400 line-through" : "text-slate-700"
                          }`}
                        >
                          {index + 1}. {acao}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {plano.geradoEm && (
              <p className="text-xs text-slate-400">
                Gerado pela IA em {formatDatePtBR(plano.geradoEm)} às{" "}
                {formatTimePtBR(plano.geradoEm)}. O conteúdo é uma recomendação: confira os
                sinais antes de agir.
              </p>
            )}
          </>
        )}

        <RegistrarContatoTrigger clienteId={detalhe.id} clienteLabel={detalhe.nome} fullWidth />
      </CardContent>
    </Card>
  );
}
