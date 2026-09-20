"use client";

import { useState, type ComponentType, type ReactNode } from "react";
import {
  AlertTriangleIcon,
  ArrowDownIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  CalendarIcon,
  CheckIcon,
  ClipboardIcon,
  DollarIcon,
  FileTextIcon,
  HeartHandshakeIcon,
  MailIcon,
  PhoneIcon,
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
import { formatCurrencyBRL, formatDatePtBR, mesAnoPtBR, tempoDesde } from "@/lib/format";
import type { EventoHistorico } from "@/lib/mock-data";
import type { DetalheClientePainel as DetalheCliente } from "@/lib/painel/detalhe";
import {
  faixaRiscoLabel,
  faixaRiscoTextClasses,
  severidadeChipClasses,
  severidadeClasses,
  severidadeLabel,
  severidadeNome,
} from "@/lib/risk";

const tabs = [
  "Visão geral",
  "Sinais de risco",
  "Histórico",
  "Relacionamento",
  "Plano de ação",
] as const;

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
      {tab === "Histórico" && <Historico detalhe={detalhe} />}
      {tab === "Relacionamento" && <Relacionamento detalhe={detalhe} />}
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
            <Button variant="secondary" className="shrink-0">
              Ver histórico
              <ArrowRightIcon className="h-4 w-4" />
            </Button>
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

const historicoIcons: Record<EventoHistorico["tipo"], ComponentType<IconProps>> = {
  contato: PhoneIcon,
  sinal: AlertTriangleIcon,
  sistema: ClipboardIcon,
  reuniao: CalendarIcon,
};

function Historico({ detalhe }: { detalhe: DetalheCliente }) {
  if (detalhe.historico.length === 0) {
    return (
      <Card>
        <CardContent className="pt-5 text-sm text-slate-400">
          Ainda não há histórico registrado para este cliente.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Linha do tempo</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="flex flex-col gap-5">
          {detalhe.historico.map((evento) => {
            const Icon = historicoIcons[evento.tipo];
            return (
              <li key={evento.id} className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-pale text-brand-royal">
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <div className="min-w-0 flex-1 border-b border-slate-100 pb-5 last:border-0 last:pb-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold text-brand-ink">{evento.titulo}</p>
                    <span className="text-xs text-slate-400">{formatDatePtBR(evento.data)}</span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-slate-500">
                    {evento.descricao}
                  </p>
                  {evento.autor && (
                    <p className="mt-1 text-xs text-slate-400">Por {evento.autor}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}

const contatosChave = [
  { iniciais: "MC", nome: "Marina Costa", papel: "Decisora · Diretoria de Operações" },
  { iniciais: "RT", nome: "Rafael Torres", papel: "Ponto focal · TI" },
];

function Relacionamento({ detalhe }: { detalhe: DetalheCliente }) {
  const ultimoContato = detalhe.historico.find((h) => h.tipo === "contato");

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">Contatos-chave</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col divide-y divide-slate-100">
            {contatosChave.map((contato) => (
              <li key={contato.iniciais} className="flex items-center gap-3 py-3.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-pale text-xs font-bold text-brand-navy">
                  {contato.iniciais}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-brand-ink">{contato.nome}</p>
                  <p className="text-xs text-slate-400">{contato.papel}</p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    aria-label={`Enviar e-mail para ${contato.nome}`}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                  >
                    <MailIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Ligar para ${contato.nome}`}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                  >
                    <PhoneIcon className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Resumo do relacionamento</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="flex flex-col gap-3 text-sm">
            <LinhaResumo rotulo="Gestor de conta" valor={detalhe.responsavelCS} />
            <LinhaResumo rotulo="Canal preferido" valor="E-mail" />
            <LinhaResumo
              rotulo="Último contato"
              valor={ultimoContato ? formatDatePtBR(ultimoContato.data) : "—"}
            />
            <LinhaResumo rotulo="Cliente desde" valor={mesAnoPtBR(detalhe.clienteDesde)} />
          </dl>

          <div className="mt-4 flex items-center gap-2 rounded-xl bg-brand-pale px-3.5 py-3 text-xs font-medium text-brand-navy">
            <HeartHandshakeIcon className="h-4 w-4 shrink-0" />
            Relacionamento ativo há {tempoDesde(detalhe.clienteDesde)}.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LinhaResumo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-slate-500">{rotulo}</dt>
      <dd className="font-semibold text-brand-ink">{valor}</dd>
    </div>
  );
}

function PlanoDeAcao({ detalhe }: { detalhe: DetalheCliente }) {
  const [concluidas, setConcluidas] = useState<Record<string, boolean>>({});

  const total = detalhe.proximasAcoes.length;
  const feitas = detalhe.proximasAcoes.filter((a) => concluidas[a.id]).length;

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="text-lg">Plano de ação recomendado</CardTitle>
          <p className="mt-1 text-sm text-slate-500">
            {feitas} de {total} ações concluídas
          </p>
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-pale text-brand-royal">
          <TargetIcon className="h-5 w-5" />
        </span>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-2">
          {detalhe.proximasAcoes.map((acao, index) => {
            const feita = Boolean(concluidas[acao.id]);
            return (
              <li key={acao.id}>
                <button
                  type="button"
                  onClick={() =>
                    setConcluidas((prev) => ({ ...prev, [acao.id]: !prev[acao.id] }))
                  }
                  className="flex w-full items-center gap-3 rounded-xl border border-slate-100 px-3.5 py-3 text-left transition-colors hover:bg-slate-50"
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                      feita
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-slate-300 text-transparent"
                    }`}
                  >
                    <CheckIcon className="h-3.5 w-3.5" />
                  </span>
                  <span
                    className={`text-sm ${feita ? "text-slate-400 line-through" : "text-slate-700"}`}
                  >
                    {index + 1}. {acao.titulo}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <RegistrarContatoTrigger
          clienteId={detalhe.id}
          clienteLabel={detalhe.nome}
          className="mt-4"
          fullWidth
        />
      </CardContent>
    </Card>
  );
}
