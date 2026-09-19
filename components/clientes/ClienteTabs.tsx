"use client";

import { useState } from "react";
import {
  AlertTriangleIcon,
  CalendarIcon,
  CheckIcon,
  ClipboardIcon,
  HeartHandshakeIcon,
  MailIcon,
  PhoneIcon,
  TargetIcon,
} from "@/components/icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { RegistrarContatoTrigger } from "@/components/RegistrarContatoTrigger";
import { formatCurrencyBRL, formatDatePtBR, mesAnoPtBR, tempoDesde } from "@/lib/format";
import type { DetalheCliente, EventoHistorico } from "@/lib/mock-data";
import { severidadeClasses } from "@/lib/risk";

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
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 sm:p-6">
      <div className="-mt-2 flex gap-1 overflow-x-auto border-b border-slate-200 sm:mt-0">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
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
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Stat label="Receita mensal (MRR)" value={formatCurrencyBRL(detalhe.mrr)} />
      <Stat
        label="Receita em risco (ano)"
        value={formatCurrencyBRL(detalhe.receitaAnualRisco)}
        tone="red"
      />
      <Stat
        label="Cliente desde"
        value={mesAnoPtBR(detalhe.clienteDesde)}
        hint={`(${tempoDesde(detalhe.clienteDesde)})`}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "red";
}) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${tone === "red" ? "text-red-600" : "text-slate-900"}`}>
        {value}
      </p>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function VisaoGeral({ detalhe }: { detalhe: DetalheCliente }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Principais evidências</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-3">
            {detalhe.evidencias.map((ev) => (
              <li key={ev.id} className="flex items-start gap-2.5">
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${severidadeClasses[ev.severidade]}`}
                >
                  <AlertTriangleIcon className="h-3 w-3" />
                </span>
                <p className="text-sm leading-snug text-slate-700">{ev.titulo}</p>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="mt-4 text-xs font-semibold text-brand-royal hover:underline"
          >
            Ver todos os sinais
          </button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Score de risco</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-slate-900">
            {detalhe.scoreRisco}
            <span className="text-base font-medium text-slate-400">/{detalhe.scoreMax}</span>
          </p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-red-600"
              style={{ width: `${(detalhe.scoreRisco / detalhe.scoreMax) * 100}%` }}
            />
          </div>

          <div className="mt-5 rounded-lg bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-500">Nossa avaliação</p>
            <p className="mt-1 text-sm leading-snug text-slate-600">{detalhe.avaliacaoIA}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Próximas ações</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-2.5">
            {detalhe.proximasAcoes.map((acao) => (
              <li
                key={acao.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2"
              >
                <span className="flex items-center gap-2.5 text-sm text-slate-700">
                  <span className="flex h-5 w-5 items-center justify-center rounded border border-slate-300" />
                  {acao.titulo}
                </span>
              </li>
            ))}
          </ul>

          <RegistrarContatoTrigger
            clienteId={detalhe.id}
            clienteLabel={detalhe.segmento}
            className="mt-4"
            fullWidth
          />
        </CardContent>
      </Card>
    </div>
  );
}

function SinaisDeRisco({ detalhe }: { detalhe: DetalheCliente }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sinais de risco detectados</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col divide-y divide-slate-100">
          {detalhe.evidencias.map((ev) => (
            <li key={ev.id} className="flex items-center gap-3 py-3">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${severidadeClasses[ev.severidade]}`}
              >
                <AlertTriangleIcon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800">{ev.titulo}</p>
                <p className="text-xs text-slate-400 capitalize">Severidade {ev.severidade}</p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

const historicoIcons: Record<EventoHistorico["tipo"], typeof CalendarIcon> = {
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
        <CardTitle>Linha do tempo</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="flex flex-col gap-5">
          {detalhe.historico.map((evento) => {
            const Icon = historicoIcons[evento.tipo];
            return (
              <li key={evento.id} className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-pale text-brand-navy">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1 border-b border-slate-100 pb-5 last:border-0 last:pb-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800">{evento.titulo}</p>
                    <span className="text-xs text-slate-400">
                      {formatDatePtBR(evento.data)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-snug text-slate-600">{evento.descricao}</p>
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

function Relacionamento({ detalhe }: { detalhe: DetalheCliente }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Contatos-chave</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col divide-y divide-slate-100">
            <li className="flex items-center gap-3 py-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
                MC
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800">Marina Costa</p>
                <p className="text-xs text-slate-400">Decisora · Diretoria de Operações</p>
              </div>
              <div className="flex gap-1.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
                  <MailIcon className="h-4 w-4" />
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
                  <PhoneIcon className="h-4 w-4" />
                </span>
              </div>
            </li>
            <li className="flex items-center gap-3 py-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
                RT
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800">Rafael Torres</p>
                <p className="text-xs text-slate-400">Ponto focal · TI</p>
              </div>
              <div className="flex gap-1.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
                  <MailIcon className="h-4 w-4" />
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
                  <PhoneIcon className="h-4 w-4" />
                </span>
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resumo do relacionamento</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="flex flex-col gap-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Gestor de conta</dt>
              <dd className="font-medium text-slate-800">{detalhe.responsavelCS}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Canal preferido</dt>
              <dd className="font-medium text-slate-800">E-mail</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Último contato</dt>
              <dd className="font-medium text-slate-800">
                {detalhe.historico.find((h) => h.tipo === "contato")
                  ? formatDatePtBR(detalhe.historico.find((h) => h.tipo === "contato")!.data)
                  : "—"}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Cliente desde</dt>
              <dd className="font-medium text-slate-800">{mesAnoPtBR(detalhe.clienteDesde)}</dd>
            </div>
          </dl>

          <div className="mt-4 flex items-center gap-2 rounded-lg bg-brand-pale px-3 py-2.5 text-xs text-brand-navy">
            <HeartHandshakeIcon className="h-4 w-4 shrink-0" />
            Relacionamento ativo há {tempoDesde(detalhe.clienteDesde)}.
          </div>
        </CardContent>
      </Card>
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
          <CardTitle>Plano de ação recomendado</CardTitle>
          <p className="mt-1 text-xs text-slate-500">
            {feitas} de {total} ações concluídas
          </p>
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-pale text-brand-navy">
          <TargetIcon className="h-4.5 w-4.5" />
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
                  className="flex w-full items-center gap-3 rounded-lg border border-slate-100 px-3 py-2.5 text-left hover:bg-slate-50"
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
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
          clienteLabel={detalhe.segmento}
          className="mt-4"
          fullWidth
        />
      </CardContent>
    </Card>
  );
}
